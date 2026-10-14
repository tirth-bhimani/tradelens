"""General-Purpose Tradebook Parsers Package."""

from __future__ import annotations

import csv
import io
from typing import Optional
from uuid import UUID

from app.models.fills import CustomColumnMapping, ParseResult
from app.parsers.base import BaseParser
from app.parsers.custom_mapper import CustomCsvParser
from app.parsers.universal import UniversalTradeParser, clean_header_key
from app.parsers.zerodha import ZerodhaParser

__all__ = [
    "BaseParser",
    "UniversalTradeParser",
    "CustomCsvParser",
    "ZerodhaParser",
    "detect_broker",
    "parse_tradebook_csv",
]


def detect_broker(headers: list[str]) -> str:
    """Inspect CSV headers and identify the format or broker signature.

    Returns one of: 'ZERODHA', 'GROWW', 'UPSTOX', 'ANGEL_ONE', 'DHAN', 'FYERS', 'GENERAL', or 'CUSTOM'.
    """
    if not headers:
        return "CUSTOM"

    clean_keys = {clean_header_key(h) for h in headers if h}

    # Zerodha signature check
    zerodha = ZerodhaParser()
    if zerodha.can_parse(headers):
        return "ZERODHA"

    # Upstox signature (scrip / side / rate / tradeno)
    if {"scrip", "side"}.issubset(clean_keys) or {"scripname", "side"}.issubset(clean_keys):
        return "UPSTOX"

    # Groww signature (stock / stockname / groww order id)
    if "growworderno" in clean_keys or ("stockname" in clean_keys and "type" in clean_keys):
        return "GROWW"

    # Angel One signature (symbol / buysell / orderid / tradeid)
    if "buysell" in clean_keys and "tradeprice" in clean_keys:
        return "ANGEL_ONE"

    # Dhan signature (tradingsymbol / transactiontype / tradedqty)
    if "tradingsymbol" in clean_keys and "transactiontype" in clean_keys:
        return "DHAN"

    # Fyers signature
    if "fyersorderid" in clean_keys or ("segment" in clean_keys and "product" in clean_keys and "tradedprice" in clean_keys):
        return "FYERS"

    # General / Universal tradebook check
    universal = UniversalTradeParser()
    if universal.can_parse(headers):
        return "GENERAL"

    return "CUSTOM"


def parse_tradebook_csv(
    csv_content: str,
    custom_mapping: Optional[CustomColumnMapping] = None,
    import_id: Optional[UUID] = None,
    user_id: Optional[UUID] = None,
    broker: Optional[str] = None,
) -> ParseResult:
    """Parse tradebook CSV content using the general-purpose universal parser or custom mapping."""
    if not csv_content or not csv_content.strip():
        return ParseResult(
            broker="UNKNOWN",
            total_rows=0,
            imported_rows=0,
            skipped_rows=0,
            fills=[],
            error_report=[{"error": "Empty CSV content provided."}],
        )

    # Read first line to inspect header signatures
    sample_reader = csv.reader(io.StringIO(csv_content))
    try:
        headers = next(sample_reader)
    except StopIteration:
        return ParseResult(
            broker="UNKNOWN",
            total_rows=0,
            imported_rows=0,
            skipped_rows=0,
            fills=[],
            error_report=[{"error": "No header row found."}],
        )

    # 1. If explicit column mapping is provided, use Universal parser with that mapping
    if custom_mapping:
        parser = UniversalTradeParser(mapping=custom_mapping, broker_name=broker or "CUSTOM")
        return parser.parse(csv_content, import_id=import_id, user_id=user_id)

    # 2. Identify broker/format
    detected_format = broker or detect_broker(headers)

    # 3. If Zerodha specifically matched, ZerodhaParser handles it with segment/auction logic
    if detected_format == "ZERODHA":
        zerodha_parser = ZerodhaParser()
        return zerodha_parser.parse(csv_content, import_id=import_id, user_id=user_id)

    # 4. Universal parser parses any broker format or custom tradebook CSV with auto-inference
    universal_parser = UniversalTradeParser(broker_name=detected_format)
    return universal_parser.parse(csv_content, import_id=import_id, user_id=user_id)
