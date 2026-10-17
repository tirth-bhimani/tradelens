# Spec: Task 8 - FIFO Trade Fill Pairing Engine

## Assumptions

1. **Chronological Fill Ordering**:
   - Fills must be processed in strict chronological order per instrument contract.
   - Ordering precedence: `fill_time` ascending. If `fill_time` is identical (or only dates are provided), tie-break using `order_id` / `trade_id` or original line order in the broker statement.
2. **Instrument Scoping**:
   - Pairing is strictly partitioned by canonical normalized symbol (derived from Task 7's `InstrumentNormalizer`).
   - Fills for different instruments (e.g. `RELIANCE` equity vs `RELIANCE24OCTFUT` futures vs `RELIANCE24OCT2500CE` options) are isolated in separate execution queues and never cross-paired.
3. **Lot Accounting Standard (FIFO)**:
   - First-In, First-Out (FIFO) is the mandatory accounting standard for Indian securities transactions (Income Tax Act & SEBI guidelines).
   - When closing fills arrive, they consume the earliest unclosed open inventory lots first.
4. **Position Direction & Short Sales**:
   - **Long Trade**: Initiated by `BUY` fill(s) on zero or positive inventory; closed by subsequent `SELL` fill(s).
   - **Short Trade**: Initiated by `SELL` fill(s) on zero or negative inventory (intraday short-selling or derivatives short); closed by subsequent `BUY` fill(s).
   - **Position Reversals (Flips)**: If a trader holds 50 Long units and executes a SELL of 150 units:
     1. 50 units close the existing Long position (resulting in a 50-unit paired trade).
     2. The remaining 100 units open a new Short position.
5. **Trade Granularity (Discrete Tranche Standard)**:
   - In accordance with Indian tax rules and behavioral metrics (e.g. holding time of losers vs winners), each exit fill produces a discrete `PairedTrade` record representing that specific exit decision.
   - When multiple scale-in fills contribute to a single matched lot, the entry price is the volume-weighted average price (VWAP) of the matched entry lots, and `entry_time` is the earliest contributing fill time.
6. **Intraday vs Positional Classification**:
   - `is_intraday` is `True` if `entry_time.date() == exit_time.date()`.
   - `is_intraday` is `False` if held overnight (`entry_time.date() != exit_time.date()`).
7. **Gross P&L Calculation**:
   - Long Trade: `gross_pnl = (exit_price - entry_price) * quantity`
   - Short Trade: `gross_pnl = (entry_price - exit_price) * quantity`
   - Regulatory charges (STT, GST, stamp duty) are deferred to Task 9; Task 8 sets `charges = Decimal("0.00")` and `net_pnl = gross_pnl`.
8. **Unmatched / Open Positions & Expiry**:
   - Fills remaining unclosed after all rows are processed represent active open inventory. They are gathered into `open_positions` with average price and remaining quantity.
   - Derivative contracts with past `expiry_date` are marked with `is_expired=True` and can be settled at `exit_price = Decimal("0.00")` for expired options.

---

## Objective

Build a fast, deterministic, mathematically rigorous FIFO trade fill pairing engine in Python (`services/analytics/app/engine/pairing.py` and `services/analytics/app/models/trade.py`) that:
1. Ingests a chronological list of validated `RawFillCreate` models (from Task 5 & 6) and normalizes instrument metadata using Task 7's `InstrumentNormalizer`.
2. Segregates fills by instrument and matches BUY and SELL fills using strict FIFO queue accounting.
3. Correctly handles all standard trading patterns:
   - Simple 1-to-1 round trips (single BUY, single SELL).
   - Partial scale-outs (e.g., BUY 100, SELL 40, SELL 60).
   - Multiple scale-ins (e.g., BUY 50 @ 100, BUY 50 @ 110, SELL 100 @ 120 with VWAP entry calculation).
   - Short sales (SELL first, BUY later) in intraday equity and F&O.
   - Direction reversals / flips (e.g., Long 50 -> Sell 150 -> Short 100).
   - Multi-day overnight swing trades (positional).
4. Emits structured `PairedTrade` models matching the Supabase `trades` database schema and reports unclosed inventory as `OpenPosition` models.
5. Provides 100% deterministic outputs with full fill lineage tracking (list of `entry_fill_ids` and `exit_fill_ids`).

---

## Tech Stack

- **Language**: Python 3.11+
- **Data Modeling**: Pydantic v2 (`BaseModel`, `Field`, `computed_field`)
- **Decimal Math**: Python `decimal.Decimal` with `ROUND_HALF_UP` for exact rupee precision without floating-point drift
- **Data Structures**: `collections.deque` for O(1) FIFO queue pops and pushes
- **Type Checking & Linting**: `mypy --strict`, `ruff`
- **Testing**: `pytest` 8+

---

## Commands

### Execution & Verification
```powershell
# Run the pairing engine test suite
.\services\analytics\.venv\Scripts\pytest services/analytics/tests/test_pairing.py -v

# Run type checking
.\services\analytics\.venv\Scripts\mypy services/analytics/app/engine/pairing.py services/analytics/app/models/trade.py

# Run linter
.\services\analytics\.venv\Scripts\ruff check services/analytics/app/engine/pairing.py services/analytics/app/models/trade.py
```

---

## Project Structure

```
services/analytics/app/
├── models/
│   ├── __init__.py                → Export trade & pairing models
│   ├── fills.py                   → RawFillCreate models (Task 5)
│   ├── ingestion.py               → Ingestion models (Task 6)
│   ├── instruments.py             → NormalizedInstrument models (Task 7)
│   └── trade.py                   → PairedTrade, OpenPosition, PairingResult models (Task 8)
├── engine/
│   ├── __init__.py                → Export engine classes
│   ├── instruments.py             → InstrumentNormalizer (Task 7)
│   └── pairing.py                 → FifoPairingEngine, InstrumentLotQueue (Task 8)
└── tests/
    ├── test_instruments.py        → Task 7 tests
    └── test_pairing.py            → Task 8 comprehensive unit & scenario test suite
```

---

## Code Style & Data Contracts

### 1. Pydantic Models (`services/analytics/app/models/trade.py`)
```python
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Literal, Optional
from uuid import UUID, uuid4
from pydantic import BaseModel, Field

TradeSegment = Literal["EQUITY_DELIVERY", "EQUITY_INTRADAY", "FUTURES", "OPTIONS"]
TradeInstrumentType = Literal["EQ", "FUT", "CE", "PE"]
PositionSide = Literal["LONG", "SHORT"]

class PairedTrade(BaseModel):
    """Represents a closed round-trip trade matched via FIFO accounting.
    Matches 1:1 with the Supabase `trades` database table schema.
    """

    id: UUID = Field(default_factory=uuid4, description="Unique trade UUID")
    user_id: Optional[UUID] = Field(None, description="Trader UUID")
    import_id: Optional[UUID] = Field(None, description="Batch import UUID")
    symbol: str = Field(..., description="Canonical trading symbol, e.g. RELIANCE, NIFTY24OCT25000CE")
    segment: TradeSegment = Field(..., description="Tax & brokerage segment classification")
    instrument_type: TradeInstrumentType = Field(..., description="PostgreSQL check-constrained instrument classification")
    
    # Direction & Timing
    is_short: bool = Field(..., description="True if opened by SELL (short), False if opened by BUY (long)")
    is_intraday: bool = Field(..., description="True if entry and exit occurred on same calendar day")
    entry_time: datetime = Field(..., description="Timestamp of the earliest matched entry fill")
    exit_time: datetime = Field(..., description="Timestamp of the closing exit fill")
    trade_duration_seconds: int = Field(..., ge=0, description="Holding duration in seconds (matches DB column)")

    # Volumes & Pricing
    quantity: Decimal = Field(..., gt=0, description="Matched execution volume (shares or contracts)")
    entry_price: Decimal = Field(..., gt=0, description="Volume-weighted average entry price")
    exit_price: Decimal = Field(..., gt=0, description="Volume-weighted average exit price")

    # Financials
    gross_pnl: Decimal = Field(..., description="P&L before statutory charges: (exit-entry)*qty for Long, (entry-exit)*qty for Short")
    charges: Decimal = Field(default=Decimal("0.00"), description="Total regulatory and broker charges (calculated in Task 9)")
    net_pnl: Decimal = Field(..., description="gross_pnl minus charges")

    # Audit & Lineage (Transient in Python, excluded when inserting into DB)
    entry_fill_ids: list[str] = Field(default_factory=list, description="IDs of RawFill records contributing to entry")
    exit_fill_ids: list[str] = Field(default_factory=list, description="IDs of RawFill records contributing to exit")
    tags: list[str] = Field(default_factory=list, description="Behavioral or user tags, e.g. FOMO, REVENGE")
    notes: Optional[str] = Field(None, description="Optional trader journal annotations")

    @property
    def duration_seconds(self) -> int:
        """Alias for trade_duration_seconds for analytics convenience."""
        return self.trade_duration_seconds

    def to_db_record(self) -> dict[str, Any]:
        """Serializes trade model into Supabase trades table schema, excluding transient lineage."""
        data = self.model_dump(exclude={"entry_fill_ids", "exit_fill_ids"})
        data["id"] = str(data["id"])
        if data.get("user_id"):
            data["user_id"] = str(data["user_id"])
        if data.get("import_id"):
            data["import_id"] = str(data["import_id"])
        data["entry_time"] = self.entry_time.isoformat()
        data["exit_time"] = self.exit_time.isoformat()
        for k in ("quantity", "entry_price", "exit_price", "gross_pnl", "charges", "net_pnl"):
            data[k] = float(data[k])
        return data

class OpenPosition(BaseModel):
    """Represents unmatched, open residual inventory remaining at the end of the batch."""

    symbol: str = Field(..., description="Canonical trading symbol")
    side: PositionSide = Field(..., description="LONG or SHORT open position")
    quantity: Decimal = Field(..., gt=0, description="Remaining unmatched quantity")
    average_price: Decimal = Field(..., gt=0, description="Volume-weighted average open price")
    first_fill_time: datetime = Field(..., description="Timestamp of oldest open fill in lot queue")
    fill_ids: list[str] = Field(default_factory=list, description="Underlying fill IDs making up this open lot")
    is_expired: bool = Field(default=False, description="True if contract has passed its expiry date")

class PairingResult(BaseModel):
    """Batch result emitted by the FIFO pairing engine."""

    total_fills_processed: int = Field(..., ge=0)
    total_trades_created: int = Field(..., ge=0)
    trades: list[PairedTrade] = Field(default_factory=list)
    open_positions: list[OpenPosition] = Field(default_factory=list)
    unmatched_symbols: list[str] = Field(default_factory=list)
```

### 2. Segment and Instrument Mapping Logic
```python
from app.models.instruments import NormalizedInstrument
from app.models.trade import TradeInstrumentType, TradeSegment

def map_instrument_to_trade_type(norm: NormalizedInstrument) -> TradeInstrumentType:
    """Map NormalizedInstrument classification to PostgreSQL CHECK constraint."""
    if norm.instrument_type == "EQUITY":
        return "EQ"
    if norm.instrument_type == "FUTURE":
        return "FUT"
    if norm.instrument_type == "OPTION":
        return "CE" if norm.option_type == "CE" else "PE"
    # Fallback for commodities or unclassified: treat as EQ default
    return "EQ"

def derive_trade_segment(inst_type: TradeInstrumentType, is_intraday: bool) -> TradeSegment:
    """Derive tax and brokerage segment classification."""
    if inst_type == "EQ":
        return "EQUITY_INTRADAY" if is_intraday else "EQUITY_DELIVERY"
    if inst_type == "FUT":
        return "FUTURES"
    return "OPTIONS"
```

---

## Testing Strategy

### Unit & Scenario Tests (`services/analytics/tests/test_pairing.py`)

1. **Simple 1:1 Long Trade**:
   - `BUY 100 @ 100.00` at 09:30, `SELL 100 @ 105.00` at 10:00.
   - Assert: 1 `PairedTrade`, `quantity=100`, `entry_price=100.00`, `exit_price=105.00`, `gross_pnl=+500.00`, `is_short=False`, `is_intraday=True`.
2. **Simple 1:1 Short Trade**:
   - `SELL 50 @ 500.00` at 11:00, `BUY 50 @ 480.00` at 11:30.
   - Assert: 1 `PairedTrade`, `quantity=50`, `entry_price=500.00`, `exit_price=480.00`, `gross_pnl=+1000.00`, `is_short=True`.
3. **Multiple Scale-in Fills (VWAP Entry)**:
   - `BUY 50 @ 100.00` at 09:30, `BUY 50 @ 110.00` at 09:45, `SELL 100 @ 120.00` at 10:30.
   - Assert: Weighted entry price = `(50*100 + 50*110)/100 = 105.00`. `gross_pnl = (120 - 105) * 100 = +1500.00`.
4. **Partial Scale-out Fills (FIFO Exit Tranches)**:
   - `BUY 100 @ 200.00` at 10:00.
   - `SELL 40 @ 210.00` at 10:30 -> Produces trade 1: `qty=40, pnl=+400.00`.
   - `SELL 60 @ 215.00` at 11:00 -> Produces trade 2: `qty=60, pnl=+900.00`.
   - Open inventory after batch = 0.
5. **Position Reversal / Flip (Long to Short)**:
   - Trader holds 50 Long (`BUY 50 @ 1000`).
   - Executes `SELL 150 @ 1020`.
   - Assert:
     - Trade 1: Closed Long of 50 units @ entry 1000, exit 1020 (`pnl=+1000`).
     - Residual: 100 units open SHORT at price 1020 in `open_positions`.
6. **Position Reversal / Flip (Short to Long)**:
   - Trader holds 50 Short (`SELL 50 @ 200`).
   - Executes `BUY 80 @ 190`.
   - Assert:
     - Trade 1: Closed Short of 50 units @ entry 200, exit 190 (`pnl=+500`).
     - Residual: 30 units open LONG at price 190 in `open_positions`.
7. **Positional / Multi-Day Trades**:
   - `BUY 100 @ 500` on 2024-10-01 at 15:00.
   - `SELL 100 @ 550` on 2024-10-05 at 10:00.
   - Assert: `is_intraday=False`, `trade_duration_seconds = 327600`, `segment = EQUITY_DELIVERY`.
8. **Multiple Instruments In Interleaved Stream**:
   - Interleaved fills of `RELIANCE`, `TCS`, and `NIFTY24OCT25000CE`.
   - Assert: Fills group cleanly by instrument; each instrument's pairing is isolated and correct.
9. **Unmatched Open Positions Remaining**:
   - `BUY 200 @ 150`, `SELL 50 @ 160`.
   - Assert: 1 closed trade for 50 units, 1 `OpenPosition` for 150 units with `average_price=150.00`.
10. **Zero Quantity or Malformed Guard**:
    - Reject or skip zero/negative quantities gracefully without breaking execution.

---

## Boundaries

- **Always do:**
  - Enforce Python `decimal.Decimal` for all prices, quantities, and P&L math to eliminate binary floating point rounding errors.
  - Sort all fills chronologically (`fill_time` ascending) before feeding into instrument queues.
  - Track complete fill lineage (`entry_fill_ids` and `exit_fill_ids`) on every `PairedTrade`.
  - Maintain residual open lots in an explicit `open_positions` list.
  - Use `trade_duration_seconds` to match Supabase database column.
- **Ask first:**
  - Changes to statutory charge schemas or database migration columns.
- **Never do:**
  - Pair fills across different symbols (e.g. `NIFTY24OCTFUT` and `NIFTY24NOVFUT`).
  - Calculate regulatory charges in Task 8 (Task 9 is exclusively dedicated to statutory charges).
  - Silently discard unmatched open inventory.

---

## Success Criteria

- [ ] `FifoPairingEngine.pair_fills(fills)` processes chronological fills and returns `PairingResult`.
- [ ] Correctly pairs simple long, simple short, partial scale-outs, multiple scale-ins (VWAP), and position flips.
- [ ] Accurate calculation of `gross_pnl`, `trade_duration_seconds`, `is_intraday`, and `is_short`.
- [ ] Segments mapped accurately (`EQUITY_INTRADAY`, `EQUITY_DELIVERY`, `FUTURES`, `OPTIONS`).
- [ ] Unclosed inventory reported accurately in `open_positions`.
- [ ] All unit tests pass: `pytest services/analytics/tests/test_pairing.py` with 100% test pass rate.
- [ ] Type checking passes: `mypy services/analytics/app/engine/pairing.py services/analytics/app/models/trade.py` with 0 errors.

---

## Resolved Architectural Decisions

1. **Trade Granularity on Partial Scale-Outs**:
   - **Decision**: Adopted **Option A** (discrete `PairedTrade` record per exit fill). This matches Indian income tax lot matching and preserves individual exit holding times required for behavioral leak detection (e.g. holding losers vs winners).
2. **Handling Expired / Unexercised F&O Contracts**:
   - **Decision**: Residual unclosed F&O contracts with an expired contract date are retained in `open_positions` with `is_expired=True`. A dedicated helper method `settle_expired_contracts()` is provided to close expired OTM options at `exit_price = Decimal("0.00")` on the expiry date if requested by the user.
