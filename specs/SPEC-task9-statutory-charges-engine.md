# Spec: Task 9 - Indian Statutory Charges & Tax Computation Engine

## Assumptions

1. **Regulatory Tariff Framework**:
   - Tariffs follow the statutory structure mandated by the Ministry of Finance, SEBI, and Indian stock exchanges (NSE/BSE).
   - Segments supported: `EQUITY_DELIVERY`, `EQUITY_INTRADAY`, `FUTURES`, and `OPTIONS`.
2. **Statutory Charge Components**:
   - **Brokerage**: Default discount broker standard (Zerodha/Groww): ₹20 flat per executed order (or 0.03% max, whichever is lower) per side; ₹0 for Equity Delivery on Zerodha.
   - **Securities Transaction Tax (STT)**:
     - `EQUITY_DELIVERY`: 0.1% on Buy turnover AND 0.1% on Sell turnover.
     - `EQUITY_INTRADAY`: 0.025% on Sell turnover only (0% on Buy).
     - `FUTURES`: 0.02% on Sell turnover only (post-Oct 1, 2024; 0.0125% prior).
     - `OPTIONS`: 0.1% on Sell premium turnover only (post-Oct 1, 2024; 0.0625% prior).
   - **Exchange Turnover Fees (NSE/BSE)**:
     - Equity Delivery & Intraday: 0.00297% (NSE) of turnover.
     - Futures: 0.00173% (NSE) of turnover.
     - Options: 0.03503% (NSE) of premium turnover.
   - **SEBI Turnover Charges**:
     - ₹10 per crore (0.0001% or 0.000001) across all segments on turnover.
   - **Goods & Services Tax (GST)**:
     - Exactly 18% levied on `(Brokerage + Exchange Turnover Fees + SEBI Charges)`. STT and Stamp Duty are excluded from GST calculation.
   - **Stamp Duty (Indian Stamp Act)**:
     - Unified nationwide rates levied exclusively on the **BUY side**:
       - `EQUITY_DELIVERY`: 0.015% on buy turnover.
       - `EQUITY_INTRADAY`: 0.003% on buy turnover.
       - `FUTURES`: 0.002% on buy turnover.
       - `OPTIONS`: 0.003% on buy premium turnover.
3. **Turnover Base Definition**:
   - For Equities and Futures: Turnover = `price * quantity`.
   - For Options: Premium Turnover = `premium_price * quantity` (STT and exchange fees are computed on the option premium, not the notional strike value).
4. **Historical Rate Changes (Budget 2024 Support)**:
   - Rate schedules support effective date ranges (`effective_from` and `effective_to`) to accurately compute historical trades (specifically the October 1, 2024 STT hike on F&O).
5. **Exact Decimal Accounting & Statutory Rounding**:
   - **Statutory Taxes (STT & Stamp Duty)**: Under Section 288B of the *Income-tax Act, 1961* and Rule 4 of the *Indian Stamp Rules, 2019*, STT and Stamp Duty are mandated to be rounded off to the **nearest integer rupee** (`ROUND_HALF_UP` to `Decimal("1")`: $\ge$ 50 paise rounds up, $< 50$ paise rounds down).
   - **Service Fees & Taxes (Brokerage, Exchange, SEBI, GST)**: Rounded off to **2 decimal places** (`ROUND_HALF_UP` to `Decimal("0.01")`).
   - Zero floating-point drift: All math is computed with Python `decimal.Decimal`.

---

## Objective

Build a fast, deterministic, regulatory-compliant Indian financial charges and tax computation engine in Python (`services/analytics/app/engine/charges.py` and `services/analytics/app/models/charges.py`) that:
1. Calculates an itemized charges breakdown for every closed `PairedTrade` (from Task 8):
   - Brokerage
   - Securities Transaction Tax (STT)
   - Exchange Turnover Fees
   - SEBI Turnover Fees
   - Goods & Services Tax (GST @ 18%)
   - Stamp Duty
   - Total Charges
   - Net P&L (`gross_pnl - total_charges`)
2. Supports configurable and date-sensitive tariff tables matching the Supabase `charge_rates` database table.
3. Provides batch calculation capabilities to enrich a list of `PairedTrade` records, updating their `charges` and `net_pnl` fields.
4. Generates an itemized `ChargesBreakdown` audit report for traders to inspect the friction cost of their trading.

---

## Tech Stack

- **Language**: Python 3.11+
- **Data Modeling**: Pydantic v2 (`BaseModel`, `Field`)
- **Arithmetic Precision**: Python `decimal.Decimal` with `ROUND_HALF_UP` (zero floating-point error)
- **Type Checking & Linting**: `mypy --strict`, `ruff`
- **Testing**: `pytest` 8+ (reconciled against verified Zerodha Brokerage Calculator values)

---

## Commands

### Execution & Verification
```powershell
# Run charges test suite
.\services\analytics\.venv\Scripts\pytest services/analytics/tests/test_charges.py -v

# Run type checking
.\services\analytics\.venv\Scripts\mypy services/analytics/app/engine/charges.py services/analytics/app/models/charges.py

# Run linter
.\services\analytics\.venv\Scripts\ruff check services/analytics/app/engine/charges.py services/analytics/app/models/charges.py
```

---

## Project Structure

```
services/analytics/app/
├── models/
│   ├── __init__.py                → Export charges models
│   ├── trade.py                   → PairedTrade model (Task 8)
│   └── charges.py                 → ChargeRateConfig, ChargesBreakdown, TradeChargesResult (Task 9)
├── engine/
│   ├── __init__.py                → Export charges engine
│   ├── pairing.py                 → FifoPairingEngine (Task 8)
│   └── charges.py                 → StatutoryChargesEngine, DefaultTariffSchedule (Task 9)
└── tests/
    ├── test_pairing.py            → Task 8 tests
    └── test_charges.py            → Task 9 tests & Zerodha calculator reconciliation
```

---

## Code Style & Data Contracts

### 1. Pydantic Models (`services/analytics/app/models/charges.py`)
```python
from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID, uuid4
from pydantic import BaseModel, Field

from app.models.trade import TradeSegment

class ChargeRateConfig(BaseModel):
    """Statutory fee and tax rates for a specific trading segment and date window.
    Matches 1:1 with the Supabase `charge_rates` database table schema.
    Note: A DB migration will expand `exchange_turnover_rate` from `NUMERIC(8, 6)` to
    `NUMERIC(10, 8)` to store 7-decimal NSE rates without truncation, and add `brokerage_percent_cap`.
    """

    id: UUID = Field(default_factory=uuid4)
    segment: TradeSegment = Field(..., description="Segment classification")
    effective_from: date = Field(..., description="Start date of tariff applicability")
    effective_to: Optional[date] = Field(default=None, description="End date (None if currently active)")

    # Rates
    brokerage_per_order: Decimal = Field(default=Decimal("20.00"), description="Flat fee per executed order side (₹0 for delivery)")
    brokerage_percent_cap: Optional[Decimal] = Field(
        default=Decimal("0.0003"),
        description="Max 0.03% cap for EQUITY_INTRADAY and FUTURES; None for OPTIONS and EQUITY_DELIVERY",
    )
    stt_rate_buy: Decimal = Field(default=Decimal("0.000000"), description="STT rate on buy turnover")
    stt_rate_sell: Decimal = Field(default=Decimal("0.000000"), description="STT rate on sell turnover")
    exchange_turnover_rate: Decimal = Field(..., description="Exchange turnover charge rate (up to 8 decimal places)")
    sebi_turnover_rate: Decimal = Field(default=Decimal("0.000001"), description="SEBI fee rate (₹10/crore)")
    gst_rate: Decimal = Field(default=Decimal("0.1800"), description="GST rate (18%) on fees")
    stamp_duty_rate_buy: Decimal = Field(..., description="Stamp duty on buy turnover")

class ChargesBreakdown(BaseModel):
    """Itemized breakdown of all regulatory and broker fees incurred on a trade."""

    brokerage: Decimal = Field(..., description="Broker commission (entry + exit; ₹0 exit on expired options)")
    stt: Decimal = Field(..., description="Securities / Commodities Transaction Tax (rounded to nearest integer rupee)")
    exchange_turnover_fee: Decimal = Field(..., description="Stock exchange infrastructure charges (2 decimals)")
    sebi_charges: Decimal = Field(..., description="SEBI regulatory fee (2 decimals)")
    gst: Decimal = Field(..., description="Goods & Services Tax (18% on brokerage + exchange + SEBI fees)")
    stamp_duty: Decimal = Field(..., description="State stamp duty on buy side (rounded to nearest integer rupee)")
    total_charges: Decimal = Field(..., description="Sum of all statutory and broker charges")

    # Analytics metrics
    turnover_entry: Decimal = Field(..., description="Gross turnover on entry")
    turnover_exit: Decimal = Field(..., description="Gross turnover on exit")
    total_turnover: Decimal = Field(..., description="turnover_entry + turnover_exit")
    charges_pct_of_turnover: Decimal = Field(
        default=Decimal("0.00"),
        description="Total charges as percentage of total turnover (0.00 if total_turnover is 0)",
    )
```

### 2. Core Charges Calculation Engine (`services/analytics/app/engine/charges.py`)
```python
from decimal import Decimal, ROUND_HALF_UP
from app.models.trade import PairedTrade
from app.models.charges import ChargeRateConfig, ChargesBreakdown

class StatutoryChargesEngine:
    """Calculates deterministic Indian statutory taxes and charges on closed trades."""

    @classmethod
    def calculate_trade_charges(
        cls,
        trade: PairedTrade,
        config: Optional[ChargeRateConfig] = None,
    ) -> ChargesBreakdown:
        """Computes exact itemized charges for a single PairedTrade."""
        ...

    @classmethod
    def enrich_trades_with_charges(
        cls,
        trades: list[PairedTrade],
        custom_configs: Optional[dict[str, ChargeRateConfig]] = None,
    ) -> list[PairedTrade]:
        """Enriches PairedTrade records with exact charges and revised net_pnl."""
        ...
```

---

## Testing Strategy

### Unit Tests & Zerodha Calculator Reconciliation (`services/analytics/tests/test_charges.py`)

1. **Equity Delivery Trade (Buy 100 @ 2000, Sell 100 @ 2100)**:
   - Turnover Buy = ₹2,00,000, Turnover Sell = ₹2,10,000. Total Turnover = ₹4,10,000.
   - Brokerage = ₹0 (Zero brokerage on delivery).
   - STT = `0.1% * 2,00,000 (₹200) + 0.1% * 2,10,000 (₹210) = ₹410.00`.
   - Exchange Turnover Fee = `0.00297% * 4,10,000 = ₹12.18`.
   - SEBI Fee = `0.0001% * 4,10,000 = ₹0.41`.
   - GST = `18% * (0 + 12.18 + 0.41) = ₹2.27`.
   - Stamp Duty = `0.015% * 2,00,000 = ₹30.00`.
   - Total Charges = `410 + 12.18 + 0.41 + 2.27 + 30 = ₹454.86`.
   - Assert: Match within ₹1.00 of official Zerodha contract note.

2. **Equity Intraday Trade (Buy 400 @ 500, Sell 400 @ 510)**:
   - Turnover Buy = ₹2,00,000, Turnover Sell = ₹2,04,000.
   - Brokerage = `min(20, 0.03% * 200000) * 2 = 20 * 2 = ₹40.00`.
   - STT = `0.025% * 2,04,000 = ₹51.00` (Sell side only).
   - Exchange Fee = `0.00297% * 4,04,000 = ₹12.00`.
   - SEBI Fee = `0.0001% * 4,04,000 = ₹0.40`.
   - GST = `18% * (40 + 12.00 + 0.40) = ₹9.43`.
   - Stamp Duty = `0.003% * 2,00,000 = ₹6.00` (Buy side only).
   - Total Charges = `40 + 51 + 12.00 + 0.40 + 9.43 + 6 = ₹118.83`.

3. **Futures Trade (Buy 50 @ 25000, Sell 50 @ 25100)**:
   - Turnover Buy = ₹12,50,000, Turnover Sell = ₹12,55,000. Total = ₹25,05,000.
   - Brokerage = ₹40.00 (₹20 entry + ₹20 exit).
   - STT (Post-Oct 2024 @ 0.02%) = `0.02% * 12,55,000 = ₹251.00`.
   - Exchange Fee (0.00173%) = `₹43.34`.
   - SEBI Fee (0.0001%) = `₹2.51`.
   - GST = `18% * (40 + 43.34 + 2.51) = ₹15.45`.
   - Stamp Duty (0.002%) = `₹25.00`.
   - Total Charges = `40 + 251 + 43.34 + 2.51 + 15.45 + 25 = ₹377.30`.

4. **Options Trade (Buy 50 @ 100, Sell 50 @ 150)**:
   - Premium Turnover Buy = ₹5,000, Premium Turnover Sell = ₹7,500. Total = ₹12,500.
   - Brokerage = ₹40.00 (₹20 entry + ₹20 exit).
   - STT (Post-Oct 2024 @ 0.1% on sell premium) = `0.1% * 7,500 = ₹7.50` -> rounded to nearest integer = `₹8.00` (s. 288B Income-tax Act).
   - Exchange Fee (0.03503% on premium) = `0.03503% * 12,500 = ₹4.38`.
   - SEBI Fee = `₹0.01`.
   - GST = `18% * (40 + 4.38 + 0.01) = ₹7.99`.
   - Stamp Duty (0.003% on buy premium) = `0.003% * 5,000 = ₹0.15` -> rounded to nearest integer = `₹0.00` (Stamp Rules 2019).
   - Total Charges = `40 + 8.00 + 4.38 + 0.01 + 7.99 + 0.00 = ₹60.38`.
   - Gross P&L = `(150 - 100) * 50 = ₹2,500.00`. Net P&L = `2500 - 60.38 = ₹2,439.62`.

5. **Historical Pre-Oct 2024 vs Post-Oct 2024 STT Test**:
   - Verify trade executed in September 2024 uses 0.0625% options STT, while October 2024 trade uses 0.10% options STT.

6. **Short-Selling Trade Charge Reversal**:
   - Short sell: Stamp duty is levied on the BUY leg (which is the exit leg), and STT is levied on the SELL leg (which is the entry leg).

7. **Batch Enrichment Consistency**:
   - Assert `enrich_trades_with_charges(trades)` updates `charges` and `net_pnl = gross_pnl - charges` for 100% of input trades.

8. **Expired OTM Option Trade (Zero Exit Brokerage Exemption)**:
   - Buy 50 @ ₹100, Expired @ ₹0.00:
   - Entry Buy Turnover = ₹5,000. Exit Sell Turnover = ₹0.00. Total = ₹5,000.
   - Entry Brokerage = ₹20.00. Exit Brokerage = ₹0.00 (no exit order placed on expired options). Total Brokerage = ₹20.00.
   - STT = ₹0.00 (0.1% on ₹0 sell turnover).
   - Exchange Fee = `0.03503% * 5,000 = ₹1.75`.
   - SEBI Fee = `₹0.01`.
   - GST = `18% * (20 + 1.75 + 0.01) = ₹3.92`.
   - Stamp Duty = `0.003% * 5,000 = ₹0.15` -> rounded to integer = `₹0.00`.
   - Total Charges = `20.00 + 0 + 1.75 + 0.01 + 3.92 + 0 = ₹25.68`.

---

## Boundaries

- **Always do:**
   - Round taxes (STT & Stamp Duty) to nearest integer rupee (`Decimal("1")`) using `ROUND_HALF_UP`.
   - Round service fees (Brokerage, Exchange, SEBI, GST) to 2 decimal places (`Decimal("0.01")`) using `ROUND_HALF_UP`.
   - Calculate GST strictly on `Brokerage + Exchange Fees + SEBI Fees` (never on STT or Stamp Duty).
   - Apply Stamp Duty strictly on the BUY transaction, whether the trade was Long (entry) or Short (exit).
  - Apply STT strictly on the SELL transaction for Intraday, Futures, and Options.
  - Compute Options STT and Exchange Fees on **premium turnover**, not strike price.
- **Ask first:**
  - Adding regional state-specific stamp duty variants (Indian Stamp Act unified rates are standard).
  - Changing default brokerage from discount broker ₹20 flat rate.
- **Never do:**
  - Use Python floats (`float`) for monetary taxes and charges.
  - Levy STT on Option buy orders.
  - Fail or raise unhandled exceptions on zero or negative P&L trades.

---

## Success Criteria

- [ ] `StatutoryChargesEngine.calculate_trade_charges(trade)` calculates exact charges breakdown for `EQUITY_DELIVERY`, `EQUITY_INTRADAY`, `FUTURES`, and `OPTIONS`.
- [ ] Matches official Zerodha Brokerage Calculator output within ₹1.00 tolerance on all 5 sample trade scenarios.
- [ ] Correctly applies date-sensitive tariff rates (supporting pre-Oct 2024 vs post-Oct 2024 Budget STT revisions).
- [ ] Correctly applies Stamp Duty on the BUY leg and STT on the SELL leg for both Long and Short trades.
- [ ] `enrich_trades_with_charges(trades)` updates `charges` and `net_pnl` on `PairedTrade` models.
- [ ] All unit tests pass: `pytest services/analytics/tests/test_charges.py` with 100% pass rate.
- [ ] Type checking passes: `mypy services/analytics/app/engine/charges.py services/analytics/app/models/charges.py` with 0 errors.

---

## Open Questions

1. **Brokerage Model for Equity Delivery**:
   - Discount brokers (e.g. Zerodha) charge ₹0 brokerage on equity delivery (CNC). However, other brokers (e.g. Groww, Angel One) charge flat ₹20 or 0.1%. Should TradeLens default to ₹0 brokerage for `EQUITY_DELIVERY` (Zerodha default) or flat ₹20 per order?
     - *Recommendation:* Default to ₹0 for `EQUITY_DELIVERY` (matching Zerodha standard) and permit overriding via the configurable rate table.
2. **Options Exercised into Physical Delivery**:
   - On NSE stock options (unlike index options), in-the-money options held till expiry result in physical equity delivery at 0.1% delivery STT. Should Task 9 support physical delivery STT or restrict V1 to cash-settled index options and normal square-off?
     - *Recommendation:* Support standard cash-settled square-offs (99%+ of retail options trading in India) and flag physical settlement in Task 10 reconciliation.
