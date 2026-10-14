# Spec: Task 5 - General-Purpose Trade CSV Parser (Universal Column Inference & Multi-Broker Support)

## Assumptions
1. **General-Purpose Universal Parsing**: The parser is designed as a universal, broker-agnostic tradebook CSV ingestion engine. It parses trade logs from any retail broker (Zerodha, Groww, Upstox, Angel One, ICICI Direct, Kotak, Dhan, Fyers, Finvasia Shoonya, Interactive Brokers) or custom trading spreadsheets/journals without being tied to any specific broker.
2. **Universal Column Auto-Inference**: The parser automatically inspects CSV headers, normalizes them (stripping casing, punctuation, and whitespace), and maps them against industry-standard synonyms for core trade fields (`symbol`, `trade_date`, `fill_time`, `trade_type`, `quantity`, `price`, `trade_id`, `order_id`).
3. **Flexible Custom Column Mapping**: When an uploaded CSV uses non-standard or custom header names, the parser accepts an explicit column mapping schema to map any arbitrary column names to standard trade fields.
4. **Timestamp Normalization to IST**: Trades occur in the Indian market timezone `Asia/Kolkata` (+05:30). Raw date/time strings (`YYYY-MM-DD HH:MM:SS`, `DD-MM-YYYY HH:MM:SS`, combined ISO 8601, or split date and time columns) must be parsed and normalized into timezone-aware IST timestamps. Files lacking execution times default to 09:15:00 IST with an audit flag.
5. **Deduplication & Deterministic Trade ID**: The database constraint `UNIQUE (user_id, trade_id)` requires each fill to have a unique `trade_id`. If a CSV lacks an explicit trade ID, a deterministic SHA-256 hash derived from `(user_id, symbol, trade_date, fill_time, trade_type, quantity, price, row_index)` is generated.
6. **Quantity & Price Coercion**: Quantities and prices must be validated as positive decimals. Transaction types normalize strictly to `'BUY'` or `'SELL'`. Corrupt or malformed rows are isolated in an `error_report` without failing the batch import.
7. **Auditability**: Each parsed fill retains its original raw row dictionary in `raw_data: dict[str, Any]` for complete downstream auditability.

---

## Objective
Implement a high-performance, deterministic general-purpose tradebook CSV parsing engine in Python (`services/analytics/app/parsers`) that:
- Seamlessly parses tradebooks from any broker or custom trade log via intelligent universal column inference.
- Provides explicit custom column mapping overrides for arbitrary user spreadsheets.
- Recognizes known broker formats (Zerodha, Groww, Upstox, Angel One, Dhan, etc.) while defaulting to a universal ingestion model.
- Validates and standardizes trade dates, execution times, symbols, buy/sell flags, quantities, and prices into typed Pydantic models (`RawFillCreate`).
- Emits structured parsing results with processed fills, row statistics (`total_rows`, `imported_rows`, `skipped_rows`), and detailed line-by-line error reports.
- Sets the stage for Task 6 (FIFO trade pairing engine and behavioral leak detection).

---

## Tech Stack
- **Language**: Python 3.11+
- **Parsing & Validation**: Pydantic v2 (`BaseModel`, `Field`, `validator`), standard library `csv`, `datetime`, `zoneinfo`
- **Typing & Linting**: `mypy --strict`, `ruff`
- **Testing Framework**: `pytest` 8+, `pytest-asyncio`
- **Framework Integration**: FastAPI endpoint integration under `/api/v1/trades/parse`

---

## Commands

### Dependencies & Setup
```powershell
# Dependencies already part of services/analytics virtual environment
.\services\analytics\.venv\Scripts\python.exe -m pip install -e services/analytics
```

### Execution & Testing
```powershell
# Run parser test suite
.\services\analytics\.venv\Scripts\pytest services/analytics/tests/test_parsers.py -v

# Type checking with strict mode
.\services\analytics\.venv\Scripts\mypy services/analytics/app/parsers

# Linting
.\services\analytics\.venv\Scripts\ruff check services/analytics/app/parsers
```

---

## Project Structure

```
services/analytics/app/
├── parsers/
│   ├── __init__.py                → Module exports (parse_tradebook_csv, detect_broker)
│   ├── base.py                    → Abstract BaseParser and ParsingResult protocol
│   ├── zerodha.py                 → Zerodha Tradebook CSV parser implementation
│   ├── custom_mapper.py           → Custom column mapping parser implementation
│   └── normalizer.py              → Date/time, timezone (IST), symbol, and trade type cleaners
├── models/
│   ├── __init__.py
│   └── fills.py                   → Pydantic models: RawFillCreate, BrokerFormat, ParseSummary
└── routers/
    ├── upload.py                  → FastAPI endpoints for validation and parse orchestration
tests/
└── test_parsers.py                → Pytest suite for Zerodha formats, custom mappings, and edge cases
```

---

## Code Style & Data Contracts

### 1. Pydantic Standard Fill Model
```python
from __future__ import annotations
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal, Optional
from pydantic import BaseModel, Field

TradeType = Literal["BUY", "SELL"]

class RawFillCreate(BaseModel):
    symbol: str = Field(..., description="Normalized trading symbol, e.g. RELIANCE, NIFTY24OCT25000CE")
    trade_date: date = Field(..., description="Trade date in YYYY-MM-DD")
    fill_time: datetime = Field(..., description="Timestamp of execution with IST (+05:30) timezone")
    trade_type: TradeType = Field(..., description="Normalized BUY or SELL")
    quantity: Decimal = Field(..., gt=0, description="Positive execution volume/lot quantity")
    price: Decimal = Field(..., gt=0, description="Executed trade price per unit")
    order_id: Optional[str] = Field(None, description="Broker order ID")
    trade_id: str = Field(..., description="Unique trade/execution ID or deterministic hash")
    raw_data: dict[str, Any] = Field(default_factory=dict, description="Original row audit payload")
```

### 2. Standard Parse Result Contract
```python
class ParseResult(BaseModel):
    broker: str
    total_rows: int
    imported_rows: int
    skipped_rows: int
    fills: list[RawFillCreate]
    error_report: list[dict[str, Any]]
```

### 3. Date & Time Normalization Rules
- **Date formats supported**: `YYYY-MM-DD`, `DD-MM-YYYY`, `DD/MM/YYYY`, `MM/DD/YYYY`.
- **Time formats supported**: `HH:MM:SS`, `HH:MM`, `HH:MM:SS.fff`.
- **Default time**: If file contains trade date without time of day, default to `09:15:00+05:30` (market opening bell) with a flag in `raw_data`.

---

## Testing Strategy
Pytest suite in `services/analytics/tests/test_parsers.py` must verify:
1. **Zerodha Auto-Detection**: Successfully detects standard and legacy Zerodha header variations.
2. **Standard Zerodha Parsing**:
   - Parses multi-segment orders: Equity Delivery (CNC), Equity Intraday (MIS), and Index Options (NRML).
   - Validates correct IST timestamp generation and decimal prices.
3. **Custom Column Mapper**:
   - Parses generic CSVs where user assigns custom column headers (`{"Scrip": "symbol", "Qty": "quantity", ...}`).
   - Generates deterministic hash for `trade_id` when omitted in source.
4. **Edge Cases & Error Handling**:
   - Neutralized formula strings (from Task 4 sanitize layer, e.g., `'=1+1`) are stripped and safely ignored or flagged.
   - Skips empty rows, header repeated mid-file, or malformed numbers without failing valid rows.
   - Rejects unmapped essential columns with actionable error messages.

---

## Boundaries

### Always
- Parse all timestamps with explicit timezone information (`Asia/Kolkata` / `+05:30`).
- Use `Decimal` for prices and quantities to avoid floating-point rounding inaccuracies in financial computations.
- Retain full row audit dictionaries in `raw_data`.
- Keep parsers pure and deterministic: accept text/file stream, return typed Pydantic models.

### Ask First
- Modifying the PostgreSQL `raw_fills` database schema or adding new database migrations.
- Adding third-party datetime or CSV parsing libraries beyond the Python standard library and Pydantic.

### Never
- Never silently drop corrupt rows without appending a record to `error_report`.
- Never use local system timezone &mdash; always enforce `Asia/Kolkata` for Indian market trading data.
- Never crash the entire batch import on a single row formatting discrepancy.

---

## Success Criteria
- [ ] `parse_tradebook_csv` detects Zerodha format with >99% confidence on valid Kite Console exports.
- [ ] `CustomCsvParser` successfully maps user-specified column mappings to `RawFillCreate` models.
- [ ] Timestamps are consistently formatted as ISO 8601 strings with `+05:30` offset.
- [ ] Deterministic fallback `trade_id` prevents duplicate insertions of identical fills.
- [ ] Unit tests pass: `pytest services/analytics/tests/test_parsers.py -v` (100% test pass rate).
- [ ] Strict type checking passes: `mypy services/analytics/app/parsers`.

---

## Open Questions for User
1. **Zerodha Order Times**: In Zerodha tradebook exports, execution times are typically stored in the column `order_execution_time`. If this column is occasionally missing in older exports, should we default the time to `09:15:00 IST` (market open) or allow the user to specify an estimated time? *(Recommended: Default to 09:15:00 IST)*
2. **Options Symbol Normalization**: Do you want symbol extraction in Task 5 to parse the underlying asset, expiry, strike, and option type (e.g., `NIFTY24OCT25000CE` -> `NIFTY`, `2024-10-24`, `25000`, `CE`), or keep the symbol as raw string and parse derivative details during Task 6 FIFO pairing? *(Recommended: Parse raw symbol in Task 5, enrich derivative contract metadata in Task 6)*
