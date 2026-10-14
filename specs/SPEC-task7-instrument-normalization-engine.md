# Spec: Task 7 - Instrument Normalization Engine (Indian Markets F&O and Equities)

## Assumptions
1. **Target Market Conventions**: The parser primarily targets Indian exchange conventions (NSE, BSE, MCX) for Equities (Cash/CNC/MIS) and Derivatives (F&O: Futures, Options CE/PE).
2. **Standard Exchange Ticker Syntax**:
   - **Cash Equities**: Scrip symbols without expiry or strike, e.g. `RELIANCE`, `TCS`, `INFY`, `HDFCBANK`. May carry exchange prefixes (`NSE:`, `BSE:`) or series suffixes (`-EQ`, `:EQ`, `-BE`).
   - **Monthly Futures**: `[UNDERLYING][YY][MMM]FUT` (e.g. `NIFTY24OCTFUT`, `BANKNIFTY24NOVFUT`, `RELIANCE24OCTFUT`).
   - **Monthly Options**: `[UNDERLYING][YY][MMM][STRIKE][CE|PE]` (e.g. `NIFTY24OCT25000CE`, `BANKNIFTY24NOV51500PE`, `TCS24OCT4000CE`).
   - **Weekly Index Options (NSE Standard Format)**: `[UNDERLYING][YY][M][DD][STRIKE][CE|PE]` where month is numeric (1-9 for Jan-Sep) or letter code (`O` for Oct, `N` for Nov, `D` for Dec) with a 2-digit day, e.g.:
     - `NIFTY24O1725000CE` (Nifty 2024 Oct 17 25000 CE)
     - `BANKNIFTY24N0651200PE` (BankNifty 2024 Nov 06 51200 PE)
     - `FINNIFTY24D2423500PE` (FinNifty 2024 Dec 24 23500 PE)
   - **Space-Separated or Human-Readable Broker Formats**: Some brokers export tickers with spaces or delimiters (e.g. `NIFTY 24 OCT 25000 CE`, `BANKNIFTY 30-OCT-2024 PE 52000`). The normalizer must handle both compacted and space-delimited formats.
3. **Lot Size Schedule**:
   - Equity lot size is always `1`.
   - Derivative contract lot sizes (Nifty, BankNifty, FinNifty, MidcpNifty, Sensex) are determined by exchange circular revisions. A lookup table maps major underlying contracts to their current standard lot size (e.g., Nifty 25 / 75 / 50; BankNifty 15 / 30 / 15; FinNifty 25 / 40 / 65; Sensex 10).
4. **Deterministic and Non-Crashing**:
   - Any unparseable or unrecognized symbol must never raise unhandled exceptions.
   - Unrecognized symbols return `instrument_type = "UNKNOWN"` with an explanation message and raw symbol preserved, allowing downstream pairing and manual user inspection.
5. **No Network Dependency for Parsing**:
   - Instrument normalization is pure computation (regex, string manipulation, and static lookup tables) to ensure millisecond execution speed and 100% offline reliability.

---

## Objective
Build a fast, deterministic instrument parsing and normalization engine in Python (`services/analytics/app/engine/instruments.py` and `services/analytics/app/models/instruments.py`) that:
- Decomposes raw Indian market trading symbols into structured, type-safe metadata:
  - `instrument_type`: `EQUITY`, `FUTURE`, `OPTION`, `COMMODITY`, `CURRENCY`, or `UNKNOWN`.
  - `underlying`: Root scrip/index name (e.g. `NIFTY`, `BANKNIFTY`, `RELIANCE`).
  - `option_type`: `CE` (Call), `PE` (Put), or `None`.
  - `strike_price`: `Decimal` or `None`.
  - `expiry_date`: Standardized ISO `date` or `None`.
  - `lot_size`: Integer lot size (e.g. `1` for equities, `25` for Nifty options, etc.).
- Robustly cleans common broker artifacts (exchange prefixes `NSE:`, `NFO:`, `MCX:`, series suffixes `-EQ`, trailing spaces, quotes).
- Sets the foundation for Task 8 (FIFO trade fill pairing engine) which requires matching buy/sell fills strictly within the identical normalized instrument contract.

---

## Tech Stack
- **Language**: Python 3.11+
- **Data Models**: Pydantic v2 (`BaseModel`, `Field`, `Literal`, `model_validator`)
- **Parsing**: Standard library regular expressions (`re`), `datetime.date`, `decimal.Decimal`
- **Typing & Linting**: `mypy --strict`, `ruff`
- **Test Runner**: `pytest` 8+

---

## Commands

### Dependencies & Virtual Environment
```powershell
# Virtual environment located at services/analytics/.venv
.\services\analytics\.venv\Scripts\python.exe -m pip install -e services/analytics
```

### Execution & Verification
```powershell
# Run the instrument normalization test suite
.\services\analytics\.venv\Scripts\pytest services/analytics/tests/test_instruments.py -v

# Run type checking
.\services\analytics\.venv\Scripts\mypy services/analytics/app/engine/instruments.py services/analytics/app/models/instruments.py

# Run linter
.\services\analytics\.venv\Scripts\ruff check services/analytics/app/engine/instruments.py
```

---

## Project Structure

```
services/analytics/app/
├── models/
│   ├── __init__.py                → Export Instrument models
│   ├── fills.py                   → RawFillCreate models (Task 5)
│   ├── ingestion.py               → Ingestion models (Task 6)
│   └── instruments.py             → InstrumentType, OptionType, NormalizedInstrument Pydantic models (Task 7)
├── engine/
│   ├── __init__.py                → Engine package exports
│   └── instruments.py             → InstrumentNormalizer class and regex parsing logic (Task 7)
└── tests/
    ├── test_parsers.py            → Task 5 tests
    ├── test_ingestion_validator.py→ Task 6 tests
    └── test_instruments.py        → Task 7 comprehensive unit test suite
```

---

## Code Style & Data Contracts

### 1. Pydantic Models (`services/analytics/app/models/instruments.py`)
```python
from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Literal, Optional
from pydantic import BaseModel, Field

InstrumentType = Literal["EQUITY", "FUTURE", "OPTION", "COMMODITY", "CURRENCY", "UNKNOWN"]
OptionType = Literal["CE", "PE"]

class NormalizedInstrument(BaseModel):
    """Normalized structured representation of an Indian financial instrument."""

    raw_symbol: str = Field(..., description="Original raw ticker symbol from broker CSV")
    normalized_symbol: str = Field(..., description="Cleaned uppercase canonical symbol without exchange noise")
    underlying: str = Field(..., description="Root scrip or index symbol, e.g. NIFTY, RELIANCE")
    instrument_type: InstrumentType = Field(..., description="Classification category")
    option_type: Optional[OptionType] = Field(default=None, description="Call (CE) or Put (PE) if option")
    strike_price: Optional[Decimal] = Field(default=None, description="Strike price if option contract")
    expiry_date: Optional[date] = Field(default=None, description="Expiry date if derivative contract")
    lot_size: int = Field(default=1, gt=0, description="Standard market lot size per trade unit")
    is_derivative: bool = Field(default=False, description="True if Futures or Options contract")
    parse_error: Optional[str] = Field(default=None, description="Reason if symbol parsing was imperfect")
```

### 2. Instrument Parser Implementation Pattern (`services/analytics/app/engine/instruments.py`)
```python
import re
from datetime import date
from decimal import Decimal
from typing import Optional
from app.models.instruments import InstrumentType, NormalizedInstrument, OptionType

class InstrumentNormalizer:
    """Deterministic parser and classifier for Indian equity and derivative tickers."""

    # Month mapping for 3-letter codes and NSE single-character weekly codes
    MONTH_MAP = {
        "JAN": 1, "FEB": 2, "MAR": 3, "APR": 4, "MAY": 5, "JUN": 6,
        "JUL": 7, "AUG": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 12,
        "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6,
        "7": 7, "8": 8, "9": 9, "O": 10, "N": 11, "D": 12,
    }

    # Standard lot sizes for major indices (defaults)
    DEFAULT_LOT_SIZES: dict[str, int] = {
        "NIFTY": 25,
        "BANKNIFTY": 15,
        "FINNIFTY": 25,
        "MIDCPNIFTY": 50,
        "NIFTYNXT50": 10,
        "SENSEX": 10,
        "BANKEX": 15,
    }

    @classmethod
    def normalize(cls, raw_symbol: str) -> NormalizedInstrument:
        """Parse raw ticker into standardized NormalizedInstrument."""
        # Clean whitespace, uppercase, remove prefixes like NSE:, NFO:, MCX:, suffixes like -EQ
        ...
```

---

## Testing Strategy

### Unit Tests (`services/analytics/tests/test_instruments.py`)
1. **Cash Equities**:
   - `RELIANCE`, `TCS`, `INFY`, `HDFCBANK`, `NSE:TATAMOTORS`, `SBIN-EQ`.
   - Assert: `instrument_type == "EQUITY"`, `underlying == raw_clean`, `option_type == None`, `strike_price == None`, `lot_size == 1`, `is_derivative == False`.
2. **Monthly Futures**:
   - `NIFTY24OCTFUT`, `BANKNIFTY24NOVFUT`, `RELIANCE24OCTFUT`.
   - Assert: `instrument_type == "FUTURE"`, `underlying == "NIFTY"`, `expiry_date` accurately parsed, `is_derivative == True`.
3. **Monthly Options**:
   - `NIFTY24OCT25000CE`, `BANKNIFTY24NOV51500PE`, `TCS24OCT4000CE`.
   - Assert: `instrument_type == "OPTION"`, `underlying == "NIFTY"`, `option_type == "CE"`, `strike_price == Decimal("25000")`, `lot_size == 25`.
4. **Weekly Index Options**:
   - `NIFTY24O1725000CE` (Oct 17, 2024 Call), `BANKNIFTY24N0651200PE` (Nov 06, 2024 Put), `FINNIFTY24D2423500PE` (Dec 24, 2024 Put).
   - Assert: Correct day, month, year, strike, and type.
5. **Space-Delimited & Broker Variations**:
   - `NIFTY 24 OCT 25000 CE`, `BANKNIFTY 24 NOV 50000 PE`, `RELIANCE 24 OCT FUT`.
   - Assert: Identical normalization as compacted formats.
6. **Lot Size Lookups**:
   - `NIFTY` -> 25, `BANKNIFTY` -> 15, `FINNIFTY` -> 25, `SENSEX` -> 10, Equities -> 1.
7. **Graceful Handling of Malformed Symbols**:
   - Empty string, purely numeric strings, invalid characters -> `instrument_type == "UNKNOWN"` with non-null `parse_error` without crashing.

---

## Boundaries

- **Always do:**
  - Strip exchange noise (`NSE:`, `BSE:`, `NFO:`, `BFO:`, `MCX:`, `-EQ`, `:EQ`) before matching patterns.
  - Return `Decimal` for strike prices to avoid floating-point inaccuracies.
  - Return `UNKNOWN` with descriptive `parse_error` for malformed symbols instead of raising unhandled exceptions.
- **Ask first:**
  - Altering lot size definitions for major indices or adding custom brokerage margin formulas.
- **Never do:**
  - Make external network or HTTP requests to NSE/BSE to look up symbols during batch ingestion.
  - Hardcode assumption that equity lot size can be > 1.
  - Allow parsing failure to abort the entire import batch.

---

## Success Criteria
- [ ] `InstrumentNormalizer.normalize(raw_symbol)` correctly parses:
  - 100% of tested Cash Equity tickers (`RELIANCE`, `TCS`, `INFY`, etc.).
  - 100% of tested Monthly Futures (`NIFTY24OCTFUT`, `BANKNIFTY24NOVFUT`, etc.).
  - 100% of tested Monthly Options (`NIFTY24OCT25000CE`, `TCS24OCT4000CE`, etc.).
  - 100% of tested Weekly Index Options (`NIFTY24O1725000CE`, `BANKNIFTY24N0651200PE`, etc.).
  - Space-delimited formats (`NIFTY 24 OCT 25000 CE`).
- [ ] Correctly populates underlying, option type (`CE`/`PE`), strike price, expiry date, and lot size.
- [ ] Rejects or gracefully flags malformed inputs as `UNKNOWN` with 0 unhandled exceptions.
- [ ] All tests pass: `pytest services/analytics/tests/test_instruments.py` with 100% coverage on parsing branches.
- [ ] Type checking passes: `mypy services/analytics/app/engine/instruments.py services/analytics/app/models/instruments.py` with 0 errors.

---

## Open Questions
1. **Historical Lot Size Revisions**: Lot sizes for Nifty and BankNifty have changed over time (e.g. Nifty changed from 75 to 50 to 25; BankNifty changed from 25 to 15). Should Task 7 implement a date-sensitive lot size lookup table based on `trade_date`, or is a standard canonical lot size mapping sufficient for current and recent tradebooks?
2. **Weekly Expiry Days**: NSE indices expire on different weekdays (Nifty on Thursdays, BankNifty on Wednesdays, FinNifty on Tuesdays, MidcapNifty on Mondays, Sensex on Fridays). Does the downstream pairing engine (Task 8) require the exact day resolved from calendar math when the ticker only supplies month (`OCT`) rather than day, or is the month/year expiry sufficient?
