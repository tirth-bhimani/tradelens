"""Ingestion Summary and Audit Issue Models."""

from __future__ import annotations

from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field

IssueType = Literal["DUPLICATE_FILL", "INVALID_FORMAT", "CORRUPT_DATA", "SCHEMA_MISMATCH"]


class RowIssue(BaseModel):
    """Line-by-line audit record for skipped or malformed rows."""

    row_index: Optional[int] = Field(default=None, description="Original CSV line number")
    issue_type: IssueType = Field(..., description="Classification category for skipped row")
    message: str = Field(..., description="Human-readable explanation")
    trade_id: Optional[str] = Field(default=None, description="Trade ID if identified")
    raw_snippet: Optional[dict[str, Any]] = Field(default=None, description="Original cell snippet for debugging")


class IngestionSummary(BaseModel):
    """Aggregate result from an ingestion and deduplication run."""

    import_id: UUID = Field(..., description="Parent imports record UUID")
    user_id: UUID = Field(..., description="Authenticated user UUID")
    broker: str = Field(..., description="Detected broker or format")
    file_name: str = Field(..., description="Name of the uploaded CSV file")
    status: Literal["completed", "failed"] = Field(..., description="Final processing status")
    total_rows: int = Field(..., description="Total rows parsed from CSV")
    imported_rows: int = Field(..., description="Count of successfully inserted unique fills")
    skipped_rows: int = Field(..., description="Count of skipped (duplicate or corrupt) rows")
    error_report: list[RowIssue] = Field(default_factory=list, description="List of row-by-row issues")
