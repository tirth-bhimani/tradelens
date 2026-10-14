"""Date, time, timezone (IST), symbol, and deterministic ID normalizers."""

from __future__ import annotations

from datetime import date, datetime, time
from decimal import Decimal
import hashlib
from typing import Optional
from zoneinfo import ZoneInfo

from app.models.fills import TradeType

IST = ZoneInfo("Asia/Kolkata")

DATE_FORMATS = ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d")
TIME_FORMATS = ("%H:%M:%S", "%H:%M", "%H:%M:%S.%f")
DATETIME_FORMATS = (
    "%Y-%m-%dT%H:%M:%S",
    "%Y-%m-%d %H:%M:%S",
    "%d-%m-%Y %H:%M:%S",
    "%d/%m/%Y %H:%M:%S",
    "%Y-%m-%dT%H:%M:%S.%f",
    "%Y-%m-%d %H:%M:%S.%f",
)


def strip_defensive_quotes(val: str) -> str:
    """Strip leading single quotes prepended by formula injection sanitizers."""
    if not val:
        return ""
    clean = val.strip()
    if clean.startswith("'"):
        clean = clean[1:].strip()
    return clean


def normalize_symbol(symbol: str) -> str:
    """Normalize trading symbols by stripping exchange prefixes and whitespace."""
    clean = strip_defensive_quotes(symbol).upper()
    for prefix in ("NSE:", "BSE:", "NFO:", "BFO:", "MCX:", "CDS:"):
        if clean.startswith(prefix):
            clean = clean[len(prefix):]
    return clean.strip()


def normalize_trade_type(val: str) -> TradeType:
    """Normalize raw string to strict BUY or SELL literal."""
    clean = strip_defensive_quotes(val).upper()
    if clean in ("BUY", "B", "BOUGHT"):
        return "BUY"
    if clean in ("SELL", "S", "SOLD"):
        return "SELL"
    raise ValueError(f"Invalid trade type: '{val}'")


def parse_ist_datetime(
    date_str: str, time_str: Optional[str] = None
) -> tuple[date, datetime, bool]:
    """Parse date and optional time strings into a standardized IST timezone-aware datetime.

    Returns:
        (trade_date, fill_time_ist, is_default_time_flag)
    """
    clean_date = strip_defensive_quotes(date_str)
    clean_time = strip_defensive_quotes(time_str) if time_str else ""

    # Check combined datetime strings (e.g. 2024-03-01T09:16:32 or 2024-03-01 09:16:32)
    combined_str = f"{clean_date} {clean_time}".strip() if clean_time else clean_date
    for dt_fmt in DATETIME_FORMATS:
        try:
            dt = datetime.strptime(combined_str, dt_fmt)
            dt_ist = dt.replace(tzinfo=IST)
            return dt_ist.date(), dt_ist, False
        except ValueError:
            continue

    # Parse date independently
    parsed_date: Optional[date] = None
    for d_fmt in DATE_FORMATS:
        try:
            parsed_date = datetime.strptime(clean_date, d_fmt).date()
            break
        except ValueError:
            continue

    if not parsed_date:
        raise ValueError(f"Unable to parse trade date: {date_str}")

    # Parse time independently if available
    if clean_time:
        for t_fmt in TIME_FORMATS:
            try:
                t = datetime.strptime(clean_time, t_fmt).time()
                dt_ist = datetime.combine(parsed_date, t, tzinfo=IST)
                return parsed_date, dt_ist, False
            except ValueError:
                continue

    # Default to market opening bell: 09:15:00 IST
    default_t = time(9, 15, 0)
    dt_ist = datetime.combine(parsed_date, default_t, tzinfo=IST)
    return parsed_date, dt_ist, True


def generate_deterministic_trade_id(
    symbol: str,
    trade_date: date,
    fill_time: datetime,
    trade_type: str,
    quantity: Decimal,
    price: Decimal,
    row_index: int = 0,
) -> str:
    """Generate a deterministic 16-character hex trade ID hash for deduplication."""
    payload = (
        f"{symbol}:{trade_date.isoformat()}:{fill_time.isoformat()}:"
        f"{trade_type}:{quantity}:{price}:{row_index}"
    )
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16].upper()
    return f"GEN_{digest}"
