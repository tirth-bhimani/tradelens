"""FastAPI Router for Trade CSV Upload Validation and Formula Neutralization."""

from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field

from app.models.fills import ParseCsvRequest, ParseResult
from app.parsers import detect_broker, parse_tradebook_csv
from app.security.sanitizer import MAX_FILE_SIZE_BYTES, sanitize_csv_stream

router = APIRouter(prefix="/api/v1/trades", tags=["trades"])


class CsvValidationRequest(BaseModel):
    file_name: str = Field(..., description="Name of the tradebook CSV file")
    content: str = Field(..., description="Raw text content of the CSV")


class CsvValidationResponse(BaseModel):
    valid: bool
    file_name: str
    total_lines: int
    flagged_formulas: int
    sanitized_preview: Optional[str] = None
    detected_broker: Optional[str] = "UNKNOWN"
    details: Optional[dict[str, Any]] = None


@router.post(
    "/validate-csv",
    response_model=CsvValidationResponse,
    summary="Validate and sanitize uploaded CSV tradebook",
)
async def validate_csv(payload: CsvValidationRequest) -> CsvValidationResponse:
    """Scan and sanitize an uploaded CSV payload against formula injection threats."""
    if not payload.file_name.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only .csv files are accepted.",
        )

    raw_bytes = payload.content.encode("utf-8")
    if len(raw_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds the 25MB limit.",
        )

    sanitized, flagged = sanitize_csv_stream(payload.content)
    lines = sanitized.splitlines()

    # Broker header signature detection
    detected_broker = "UNKNOWN"
    if lines:
        headers = [h.strip() for h in lines[0].split(",")]
        detected_broker = detect_broker(headers)

    preview = "\n".join(lines[:5]) if lines else ""

    return CsvValidationResponse(
        valid=True,
        file_name=payload.file_name,
        total_lines=len(lines),
        flagged_formulas=flagged,
        sanitized_preview=preview,
        detected_broker=detected_broker,
        details={
            "file_size_bytes": len(raw_bytes),
            "sanitized": flagged > 0,
        },
    )


@router.post(
    "/upload-stream",
    response_model=CsvValidationResponse,
    summary="Stream upload CSV file directly for sanitization",
)
async def upload_csv_stream(file: UploadFile = File(...)) -> CsvValidationResponse:
    """Stream an uploaded file directly through memory-efficient sanitization."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only .csv files are supported.",
        )

    content_bytes = await file.read()
    if len(content_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds the 25MB limit.",
        )

    try:
        raw_text = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        try:
            # Fallback for Windows Excel ANSI/CP1252 exports
            raw_text = content_bytes.decode("cp1252")
        except UnicodeDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to decode file. Please ensure it is saved as UTF-8 CSV.",
            )

    sanitized, flagged = sanitize_csv_stream(raw_text)
    lines = sanitized.splitlines()

    return CsvValidationResponse(
        valid=True,
        file_name=file.filename,
        total_lines=len(lines),
        flagged_formulas=flagged,
        sanitized_preview="\n".join(lines[:5]) if lines else "",
        detected_broker="UNKNOWN",
        details={"file_size_bytes": len(content_bytes)},
    )


@router.post(
    "/parse-csv",
    response_model=ParseResult,
    summary="Parse sanitized CSV tradebook into standardized fills",
)
async def parse_csv(payload: ParseCsvRequest) -> ParseResult:
    """Parse CSV tradebook into typed RawFillCreate models using universal auto-detection or custom mapping."""
    if not payload.file_name.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only .csv files can be parsed.",
        )

    # Sanitize formulas before parsing (defense-in-depth)
    sanitized_text, _ = sanitize_csv_stream(payload.content)

    return parse_tradebook_csv(
        csv_content=sanitized_text,
        custom_mapping=payload.custom_mapping,
        import_id=payload.import_id,
        user_id=payload.user_id,
    )
