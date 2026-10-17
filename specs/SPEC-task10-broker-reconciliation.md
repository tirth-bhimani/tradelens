# Spec: Task 10 - Broker Statement Reconciliation & Discrepancy Reporting Engine

## Assumptions

1. **Reconciliation Target & Tolerance**:
   - The primary objective is to compare TradeLens FIFO paired trades and calculated statutory charges against broker-issued statements (e.g., Zerodha Tax P&L, Groww P&L report, Angel One statements).
   - Standard regulatory tolerance is set to **₹1.00** per Section 288B rounding allowances. Deltas within $\pm ₹1.00$ are categorized as `MATCHED`. Deltas exceeding ₹1.00 are categorized as `DISCREPANCY`.
2. **Discrepancy Root-Cause Taxonomy**:
   - The engine must deterministically classify and flag why deltas occur:
     - `DP_CHARGES_UNACCOUNTED`: Broker ledger includes Depository Participant (DP) charges on delivery sell orders (e.g. ₹13.50 + 18% GST = ₹15.93 per scrip/day on Zerodha/CDSL) which do not appear in order execution fills.
     - `OPEN_POSITION_RESIDUAL`: Open/unmatched lots carry unrealized P&L, causing statement periods to differ between fill date and settlement.
     - `MISSING_TRADE_FILLS`: Tradebook CSV was incomplete or truncated, leading to unmatched order legs.
     - `CORPORATE_ACTION_UNADJUSTED`: Stock split, bonus, or rights issue occurred during the holding period without cost basis adjustment in the CSV.
     - `STAMP_DUTY_STATE_VARIATION`: Broker contract notes applied state-specific stamp duty or monthly aggregation rounding.
     - `ROUNDING_VARIANCE`: Fractional rupee rounding cumulative drift across high-frequency trades ($\le ₹1.00$).
3. **Data Input Modalities**:
   - **Structured Ingestion**: Parsed summary metrics from broker statement CSV/PDF/JSON exports.
   - **Quick Manual Audit**: User can input top-level broker summary numbers (Broker Gross P&L, Total Broker Charges, Broker Net P&L, plus optional per-symbol overrides) for instantaneous health-check reconciliation.
4. **Multi-Tenancy & Privacy**:
   - All reconciliation reports are tenant-isolated via Supabase RLS using `user_id`. No cross-tenant data leakage.

---

## Objective

Build a comprehensive broker statement reconciliation engine and interactive dashboard UI that:
1. Reconciles TradeLens calculated trades (`PairedTrade` from Task 8 and `ChargesBreakdown` from Task 9) against official broker statement summaries.
2. Performs two-level reconciliation:
   - **Portfolio Aggregate Level**: Compares Total Gross P&L, Total Statutory Charges, and Total Net P&L.
   - **Per-Symbol Level**: Compares realized P&L, volume, and charges per scrip/symbol.
3. Automatically diagnoses discrepancies using rule-based pattern matching (e.g. identifying CDSL DP charges, unmatched open lots, or missing legs).
4. Provides a side-by-side comparative UI (`/reconciliation`) with match rate KPIs, interactive symbol filters, and expandable discrepancy diagnostic cards.

---

## Tech Stack

- **Backend / Analytics Engine**:
  - Python 3.11+
  - Pydantic v2 for strict type contracts (`BaseModel`, `Field`)
  - Python `decimal.Decimal` with `ROUND_HALF_UP` for exact financial reconciliation
  - FastAPI for the reconciliation endpoint
  - `pytest` for unit and regression testing
  - `mypy --strict` & `ruff` for linting and type hygiene
- **Frontend**:
  - Next.js 14 App Router (React Server Components + interactive Client Components)
  - TypeScript 5+
  - Tailwind CSS with TradeLens precision glass card design system (`card-zerodha-glass`, dark/light adaptive)
  - Lucide React icons
  - Framer Motion for smooth state transitions

---

## Commands

```powershell
# Backend Testing
.\services\analytics\.venv\Scripts\python.exe -m pytest services/analytics/tests/test_reconciliation.py -v

# Full Analytics Suite Verification
.\services\analytics\.venv\Scripts\python.exe -m pytest services/analytics/tests -v

# Type Checking
.\services\analytics\.venv\Scripts\mypy.exe services/analytics/app

# Linting
.\services\analytics\.venv\Scripts\ruff.exe check services/analytics/app/engine/reconciliation.py

# Frontend Build & Type Validation
npm run build --prefix apps/web
```

---

## Project Structure

```
services/analytics/
  app/
    models/
      reconciliation.py         → Pydantic contracts: BrokerStatementSummary, SymbolReconciliation, ReconciliationReport
    engine/
      reconciliation.py         → Deterministic reconciliation engine & diagnostic classifiers
    routers/
      reconciliation.py         → FastAPI endpoint (/api/reconciliation/run)
  tests/
    test_reconciliation.py     → Unit tests for 100% matched, DP fee diagnosis, open lot delta, and symbol mismatch

apps/web/
  app/
    (dashboard)/
      reconciliation/
        page.tsx                → Main reconciliation view (KPI banners, side-by-side audit, symbol table)
  components/
    reconciliation/
      discrepancy-card.tsx      → Itemized card showing App vs Broker delta, badge status, and root-cause tips
      reconciliation-table.tsx   → Scrip-by-scrip comparison grid with sorting and status filters
      statement-summary-form.tsx → Quick input drawer/modal to enter broker statement totals
```

---

## Data Models & API Contracts

### 1. Python Models (`services/analytics/app/models/reconciliation.py`)

```python
from decimal import Decimal
from typing import Literal
from uuid import UUID, uuid4
from pydantic import BaseModel, Field

ReconciliationStatus = Literal["MATCHED", "DISCREPANCY", "MISSING_IN_APP", "MISSING_IN_BROKER"]
DiscrepancyReason = Literal[
    "DP_CHARGES_UNACCOUNTED",
    "OPEN_POSITION_RESIDUAL",
    "MISSING_TRADE_FILLS",
    "CORPORATE_ACTION_UNADJUSTED",
    "STAMP_DUTY_STATE_VARIATION",
    "ROUNDING_VARIANCE",
    "UNCLASSIFIED_DELTA"
]

class BrokerSymbolSummary(BaseModel):
    """Realized financials reported by broker for a single instrument."""
    symbol: str = Field(..., description="Canonical trading symbol")
    realized_gross_pnl: Decimal = Field(..., description="Broker reported gross P&L")
    charges: Decimal = Field(default=Decimal("0.00"), description="Broker itemized charges if available")
    net_pnl: Decimal = Field(..., description="Broker reported net P&L")
    total_quantity: Decimal | None = Field(default=None, description="Executed volume if reported")

class BrokerStatementSummary(BaseModel):
    """Aggregate numbers reported on official broker statement / Tax P&L."""
    broker_name: str = Field(default="ZERODHA", description="Broker source (ZERODHA, GROWW, ANGELONE, UPSTOX)")
    statement_period_start: str | None = Field(default=None, description="Start date (YYYY-MM-DD)")
    statement_period_end: str | None = Field(default=None, description="End date (YYYY-MM-DD)")
    total_gross_pnl: Decimal = Field(..., description="Total realized gross P&L on statement")
    total_charges: Decimal = Field(..., description="Total deductions/charges on statement")
    total_net_pnl: Decimal = Field(..., description="Total net realized P&L on statement")
    symbols: list[BrokerSymbolSummary] = Field(default_factory=list, description="Per-symbol breakdowns")

class SymbolReconciliation(BaseModel):
    """Comparative line-item for a single trading symbol."""
    symbol: str
    status: ReconciliationStatus
    app_gross_pnl: Decimal
    broker_gross_pnl: Decimal
    gross_delta: Decimal
    app_charges: Decimal
    broker_charges: Decimal
    charges_delta: Decimal
    app_net_pnl: Decimal
    broker_net_pnl: Decimal
    net_delta: Decimal
    discrepancy_reasons: list[DiscrepancyReason] = Field(default_factory=list)
    explanation: str | None = None

class ReconciliationReport(BaseModel):
    """Complete portfolio reconciliation audit output."""
    report_id: UUID = Field(default_factory=uuid4)
    tolerance_threshold: Decimal = Field(default=Decimal("1.00"))
    total_symbols_evaluated: int
    matched_symbols_count: int
    discrepancy_symbols_count: int
    match_percentage: Decimal
    app_total_gross_pnl: Decimal
    broker_total_gross_pnl: Decimal
    gross_pnl_delta: Decimal
    app_total_charges: Decimal
    broker_total_charges: Decimal
    charges_delta: Decimal
    app_total_net_pnl: Decimal
    broker_total_net_pnl: Decimal
    net_pnl_delta: Decimal
    is_fully_reconciled: bool
    symbol_discrepancies: list[SymbolReconciliation]
    systemic_warnings: list[str] = Field(default_factory=list)
```

---

## Code Style & Architectural Patterns

- **Decoupled Architecture**: The reconciliation engine does not mutate incoming `PairedTrade` or `OpenPosition` objects. It is a pure, idempotent evaluator.
- **Rule-Based Diagnostic Classifier**:
  ```python
  def diagnose_discrepancy(
      gross_delta: Decimal,
      charges_delta: Decimal,
      has_open_positions: bool,
      is_delivery: bool,
  ) -> list[DiscrepancyReason]:
      reasons: list[DiscrepancyReason] = []
      # Check DP Charge signature: multiples of ₹15.93 or ₹13.50
      if is_delivery and abs(charges_delta % Decimal("15.93")) < Decimal("0.10"):
          reasons.append("DP_CHARGES_UNACCOUNTED")
      if has_open_positions and abs(gross_delta) > Decimal("1.00"):
          reasons.append("OPEN_POSITION_RESIDUAL")
      if not reasons and (abs(gross_delta) > Decimal("1.00") or abs(charges_delta) > Decimal("1.00")):
          reasons.append("UNCLASSIFIED_DELTA")
      return reasons
  ```
- **Precision**: All calculations must use `Decimal` with explicit quantization to `Decimal("0.01")`. Zero floating-point drift.

---

## Testing Strategy

1. **Perfect Reconciliation Scenario**:
   - 10 trades across 3 symbols matching broker statement exactly within ₹0.00 delta.
   - Asserts `match_percentage == 100.00%`, `is_fully_reconciled == True`, `discrepancy_symbols_count == 0`.
2. **Standard Rounding Variance Scenario**:
   - Deltas between ₹0.01 and ₹0.99 flagged as `ROUNDING_VARIANCE` and accepted as `MATCHED`.
3. **CDSL/NSDL DP Charges Detection**:
   - Delivery trade where broker deducted ₹15.93 per sell trade not present in tradebook fills.
   - Asserts engine detects delta and flags `DP_CHARGES_UNACCOUNTED` with explanation.
4. **Open Position Residual Scenario**:
   - Trader holds 50 un-exited shares of INFY; broker tax P&L shows ₹0 realized while TradeLens shows residual open lot.
   - Asserts engine highlights `OPEN_POSITION_RESIDUAL`.
5. **Missing Fills Scenario**:
   - Symbol in broker statement has no trades in TradeLens -> flagged as `MISSING_IN_APP`.
   - Symbol in TradeLens has no record in broker statement -> flagged as `MISSING_IN_BROKER`.

---

## Boundaries

- **Always**:
  - Use `Decimal` for financial values.
  - Test all edge cases with unit tests before declaring completion.
  - Provide human-readable explanations for all flagged discrepancies.
  - Support both theme modes (dark/light) in the reconciliation UI.
- **Ask First**:
  - Adding external optical-character-recognition (OCR) or PDF parsing dependencies (pypdf/pdfplumber).
  - Modifying Supabase table structures.
- **Never**:
  - Silently swallow or round away discrepancies exceeding ₹1.00.
  - Expose trade or financial records across tenant boundaries.

---

## Success Criteria

1. Backend reconciliation engine runs in $< 50\text{ms}$ for 1,000 paired trades.
2. 100% test pass rate in `services/analytics/tests/test_reconciliation.py`.
3. Clear root-cause diagnosis for typical Indian broker variances (DP charges, open lots, rounding).
4. Interactive Next.js page at `/reconciliation` displays side-by-side comparison, KPI summary cards, and scrip-level status badges with zero hydration or build errors.

---

## Open Questions

1. **Broker Statement Upload Format**:
   - In addition to manual summary entry and standard CSV tables, do you have sample Zerodha or Groww Tax P&L files you would like us to support immediately in this phase?
2. **Default DP Charges Configuration**:
   - Should default DP charges be configured as ₹15.93 (Zerodha/CDSL: ₹13.50 + 18% GST), or would you prefer a broker-configurable table in `settings`?
