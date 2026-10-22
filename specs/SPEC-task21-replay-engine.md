# SPEC-task21: Deterministic Trade Replay Engine & 70/30 Train/Test Split

- **Module**: `services/analytics/app/rules/replay.py`, `services/analytics/app/rules/evaluator.py`, `services/analytics/app/routers/rules.py`
- **Status**: Draft / Ready for Review
- **Owner**: TradeLens Analytics Team
- **Dependencies**: Task 8 (`app/models/trade.py`), Task 11 (`app/engine/core_metrics.py`), Task 19 (`app/rules/catalog.py`, `app/rules/validator.py`)
- **Downstream**: Task 22 (Rule Lab Interactive Interface & Before/After Visualizer), Task 23 (Production Adherence Daemon)

---

## Assumptions I'm Making

1. **Chronological Trade Timeline & Execution Semantics**:
   - Closed round-trip trades (`PairedTrade` model from Task 8) are processed sequentially ordered by `(entry_time, exit_time, id)`.
   - Simulation is **counter-factual**: if a trade violates an active rule at its `entry_time`, the trade is marked as **skipped** (`is_skipped=True`). A skipped trade is assumed never to have occurred — its P&L is excluded from subsequent capital/equity calculations, its count does not increment daily trades, and it does not trigger subsequent cooldowns or loss streaks.
2. **Deterministic State Machine**:
   - The replay engine maintains an internal timeline state machine across trading days: running daily realized P&L, completed daily trade count, consecutive losing trade streak, timestamp of the most recent loss exit, and session halt status.
   - Cross-day boundaries automatically reset daily counters (daily realized P&L, daily trade count, daily halt status). Cooldown periods that span beyond a market session boundary reset at market open (09:15 IST) of the next session.
3. **Institutional Indian Market Standards**:
   - All time computations operate in Indian Standard Time (IST / UTC+05:30).
   - Market session hours default to 09:15 to 15:30 IST. The midday chop/lunch window defaults to 11:30 to 13:00 IST.
   - Derivative expiry days are evaluated against standard NSE/BSE contract schedules (e.g. NIFTY Thursday, BANKNIFTY Wednesday, or exact contract expiry dates parsed from instrument symbols).
4. **Strict 70/30 Train/Test Partitioning**:
   - The historical dataset is split chronologically: the first 70% of trades form the In-Sample (Train) partition, and the final 30% form the Out-of-Sample (Test) partition.
   - Overfitting detection compares in-sample improvement against out-of-sample degradation. A rule that significantly inflates train P&L but degrades out-of-sample performance is flagged with `is_overfit=True`.
5. **Small Sample Safeguard**:
   - If total trades < 30 (or out-of-sample test trades < 10), the engine emits a visible `small_sample_warning` indicating low statistical confidence to prevent false trader complacency.
6. **Integration with Database Schema**:
   - Output data contracts map 1:1 with the PostgreSQL `rule_runs` table (`before_metrics JSONB`, `after_metrics JSONB`, `skipped_trade_ids UUID[]`, `is_overfit_flag BOOLEAN`, `metadata JSONB`).

→ *Correct me now or I'll proceed with these.*

---

## 1. Objective

Build a high-performance, deterministic counter-factual backtesting engine in Python that simulates the historical impact of trader guardrails (the 9 catalog rules from Task 19) against past execution logs:
1. **Rule Evaluation Engine (`services/analytics/app/rules/evaluator.py`)**:
   - Stateful predicate evaluator that inspects each candidate trade against active rule parameters and the current simulation timeline state.
   - Evaluates all 9 catalog rules: `COOL_OFF_AFTER_LOSS`, `MAX_CONSECUTIVE_LOSSES`, `DAILY_LOSS_LIMIT`, `MAX_DAILY_TRADES_LIMIT`, `TIME_OF_DAY_CUTOFF`, `MAX_POSITION_SIZE`, `SKIP_INSTRUMENT_TYPE`, `NO_TRADING_ON_EXPIRY_DAY`, and composite conjunctions (`COMPOSITE_RULE`).
2. **Replay Engine & Split Analysis (`services/analytics/app/rules/replay.py`)**:
   - Chronological simulation runner that produces side-by-side performance metrics (`before` vs `after`) utilizing Task 11's `CoreMetricsEngine`.
   - Dual equity curve generator providing synchronized actual vs simulated cumulative P&L time-series.
   - 70/30 chronological train/test partitioning with automated overfitting detection and sample size alerts.
   - Skipped trade diagnostic ledger detailing avoided losses vs sacrificed gains.
3. **FastAPI Replay Endpoint (`services/analytics/app/routers/rules.py`)**:
   - `POST /api/v1/rules/replay` allowing frontend and CLI consumers to execute backtests on arbitrary rules and trade sets with sub-100ms response times.
4. **Comprehensive Test Suite (`services/analytics/tests/test_replay.py`)**:
   - Verification across all 9 rule types, compound rules, edge cases (boundary times, streak resets, zero trades), 70/30 splits, and overfitting triggers.

---

## 2. Tech Stack

- **Runtime & Language**: Python 3.13
- **Framework**: FastAPI (high-concurrency async REST API)
- **Data Validation & Schemas**: Pydantic v2 (strict model validation, discriminated unions)
- **Math & Precision**: Python standard library `decimal.Decimal` (quantized to 2 decimal places with `ROUND_HALF_UP` for INR currency math)
- **Datetime & Timezones**: `datetime`, `zoneinfo.ZoneInfo("Asia/Kolkata")`
- **Testing**: `pytest`, `pytest-asyncio`
- **Static Typing & Quality**: `mypy --strict`, `ruff`

---

## 3. Commands

Full executable commands for development, verification, and linting:

```powershell
# Run replay engine unit tests
services/analytics/.venv/Scripts/pytest.exe services/analytics/tests/test_replay.py -v

# Run entire analytics test suite (ensuring zero regressions)
services/analytics/.venv/Scripts/pytest.exe services/analytics/tests/ -v

# Run static type checker in strict mode
services/analytics/.venv/Scripts/mypy.exe --strict services/analytics/app/rules/evaluator.py services/analytics/app/rules/replay.py services/analytics/app/routers/rules.py

# Start local analytics development server
services/analytics/.venv/Scripts/uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --reload --app-dir services/analytics
```

---

## 4. Project Structure

```
services/analytics/
├── app/
│   ├── engine/
│   │   └── core_metrics.py       # Task 11 CoreMetricsEngine (reused for before/after KPI calculations)
│   ├── models/
│   │   ├── metrics.py            # PerformanceSummary, PerformanceReport, EquityPoint
│   │   └── trade.py              # PairedTrade model
│   ├── rules/
│   │   ├── catalog.py            # Task 19 Rule models & SingleTradingRule union
│   │   ├── validator.py          # Task 19 validate_rule()
│   │   ├── evaluator.py          # [NEW] Single-trade stateful rule predicate evaluator
│   │   └── replay.py             # [NEW] Chronological replay runner, 70/30 split, overfitting detector
│   └── routers/
│       └── rules.py              # Extended with POST /api/v1/rules/replay endpoint
└── tests/
    ├── test_rules_catalog.py     # Task 19 unit tests
    ├── test_translator.py        # Task 20 unit tests
    └── test_replay.py            # [NEW] Replay engine & 70/30 split unit and integration tests
```

---

## 5. System Architecture & State Machine

```
                              Chronological Trades Log [Trade_1, Trade_2, ... Trade_N]
                                                      │
                                                      ▼
                                       ┌─────────────────────────────┐
                                       │ 70/30 Chronological Split   │
                                       │  - Train Set: First 70%     │
                                       │  - Test Set:  Final 30%     │
                                       └──────────────┬──────────────┘
                                                      │
                       ┌──────────────────────────────┴──────────────────────────────┐
                       ▼                                                             ▼
         ┌───────────────────────────┐                                 ┌───────────────────────────┐
         │     Train Simulation      │                                 │      Test Simulation      │
         └─────────────┬─────────────┘                                 └─────────────┬─────────────┘
                       │                                                             │
                       ▼                                                             ▼
         ┌───────────────────────────┐                                 ┌───────────────────────────┐
         │ Timeline State Machine    │                                 │ Timeline State Machine    │
         │ - daily_realized_pnl      │                                 │ - daily_realized_pnl      │
         │ - daily_trades_count      │                                 │ - daily_trades_count      │
         │ - consecutive_losses      │                                 │ - consecutive_losses      │
         │ - last_loss_exit_time     │                                 │ - last_loss_exit_time     │
         │ - daily_halted (bool)     │                                 │ - daily_halted (bool)     │
         └─────────────┬─────────────┘                                 └─────────────┬─────────────┘
                       │                                                             │
                       ▼                                                             ▼
         ┌───────────────────────────┐                                 ┌───────────────────────────┐
         │ Predicate Evaluator       │                                 │ Predicate Evaluator       │
         │ (Pass or Skip trade)      │                                 │ (Pass or Skip trade)      │
         └─────────────┬─────────────┘                                 └─────────────┬─────────────┘
                       │                                                             │
                       └──────────────────────────────┬──────────────────────────────┘
                                                      │
                                                      ▼
                                       ┌─────────────────────────────┐
                                       │ CoreMetricsEngine Execution │
                                       │ - Before vs After KPIs      │
                                       │ - Delta Calculations        │
                                       │ - Dual Equity Curve         │
                                       │ - Overfitting Detector      │
                                       └─────────────────────────────┘
```

### State Machine Definition (`TradeReplayState`)

```python
class TradeReplayState:
    current_date: date | None = None
    daily_realized_pnl: Decimal = Decimal("0.00")
    daily_trades_count: int = 0
    daily_halted: bool = False
    daily_halt_reason: str | None = None
    consecutive_losses: int = 0
    last_loss_exit_time: datetime | None = None
    cooldown_until: datetime | None = None
    # Track executed trades that are still open to avoid lookahead bias
    open_executed_trades: list[PairedTrade] = []

    def advance_to_time(self, current_time: datetime, current_date: date, rule: TradingRule) -> None:
        """Processes exits for all executed trades whose exit_time <= current_time,

        updating realized daily P&L, consecutive losses, and cooldown windows before
        evaluating the new candidate trade entering at current_time.
        """
        if self.current_date != current_date:
            self.current_date = current_date
            self.daily_realized_pnl = Decimal("0.00")
            self.daily_trades_count = 0
            self.daily_halted = False
            self.daily_halt_reason = None
            self.cooldown_until = None
            self.open_executed_trades.clear()

        # Realize closed trades up to current_time (sorted by exit_time)
        still_open = []
        for t in self.open_executed_trades:
            if t.exit_time <= current_time:
                self._realize_trade_exit(t, rule)
            else:
                still_open.append(t)
        self.open_executed_trades = still_open
```

---

## 6. Detailed Rule Evaluation Contracts

| Rule Type | Evaluation Trigger / Condition | Action on Breach | State Update on Executed Trade |
|---|---|---|---|
| `COOL_OFF_AFTER_LOSS` | Trade `entry_time < state.cooldown_until` (and preceding loss met `trigger_loss_inr`). | Skip trade; record cooldown violation. | If executed trade `net_pnl < 0`, set `state.cooldown_until = trade.exit_time + timedelta(minutes=cooldown_minutes)`. |
| `MAX_CONSECUTIVE_LOSSES` | `state.consecutive_losses >= rule.consecutive_losses`. | If `HALT_FOR_DAY`: set `state.daily_halted = True`, skip trade. If `MANDATORY_COOLDOWN`: skip if within cooldown. | If executed trade `net_pnl < 0`: `consecutive_losses += 1`. If `net_pnl > 0`: `consecutive_losses = 0`. |
| `DAILY_LOSS_LIMIT` | `state.daily_realized_pnl <= -threshold` (where threshold is INR amount or `% * starting_capital`). | Set `state.daily_halted = True`, skip all subsequent trades on this day. | Add `trade.net_pnl` to `state.daily_realized_pnl`. |
| `MAX_DAILY_TRADES_LIMIT` | `state.daily_trades_count >= rule.max_trades`. | Set `state.daily_halted = True`, skip trade. | Increment `state.daily_trades_count += 1`. |
| `TIME_OF_DAY_CUTOFF` | Trade `entry_time` (IST) `< allowed_start_time` OR `> allowed_end_time` OR during `11:30-13:00` if lunch break active. | Skip trade; record time restriction violation. | None (time-of-day is stateless). |
| `MAX_POSITION_SIZE` | Trade `quantity > max_quantity` OR `lots > max_lots` OR `capital > max_capital_inr`. | Skip trade (exceeds allowed risk size). | None. |
| `SKIP_INSTRUMENT_TYPE` | Trade segment/instrument classification matches any type in `disallowed_types`. | Skip trade. | None. |
| `NO_TRADING_ON_EXPIRY_DAY` | Trade entry date is contract expiry day for affected index. | If `HALT_FOR_DAY`: skip trade. If `CAP_LOTS`: skip if lots > `max_lots`. | None. |
| `COMPOSITE_RULE` | Evaluates all sub-rules under logical `AND`. | Skip trade if ANY sub-rule rejects it; record all failing reasons. | State updates sequentially for rules that track state. |

---

## 7. 70/30 Split & Overfitting Detection Heuristics

1. **Chronological Partitioning**:
   - `split_index = int(len(trades) * 0.70)`
   - `train_trades = sorted_trades[:split_index]` (first 70%)
   - `test_trades = sorted_trades[split_index:]` (last 30%)
2. **Overfitting Detection Conditions**:
   A rule is flagged as `is_overfit=True` if **both** of the following primary conditions are met:
   - **In-Sample Improvement**: Train partition net P&L improves under the rule (`train_after_pnl > train_before_pnl`).
   - **Out-of-Sample Degradation**: Test partition exhibits significant deterioration under the rule, defined by any of:
     - For positive test baseline (`test_before_pnl > 0`): Net P&L drops by more than 20% (`test_after_pnl < test_before_pnl * 0.80`).
     - For non-positive test baseline (`test_before_pnl <= 0`): Net P&L deteriorates further by at least ₹1,000 (`test_after_pnl - test_before_pnl < -1000.00`).
     - Test profit factor drops below 1.0 (unprofitable out-of-sample) while train profit factor is >= 1.25.
     - Test win rate drops by more than 10.0% while train win rate increased.
3. **Small Sample Guard**:
   - If `len(trades) < 30`: `small_sample_warning = True` with text: `"Total trade count (N) is below 30. Statistical metrics and split results may not be statistically significant."`
   - If `len(test_trades) < 10`: `small_sample_warning = True` with text: `"Out-of-sample test sample has fewer than 10 trades. Out-of-sample robustness cannot be confirmed."`

---

## 8. Data Contracts & API Schemas

### Request Schema (`ReplayRequest`)

```python
class ReplayRequest(BaseModel):
    rule: TradingRule = Field(..., description="Validated rule catalog item or composite rule")
    trades: list[PairedTrade] = Field(..., min_length=1, description="Chronological closed round-trip trades")
    starting_capital: float = Field(default=100000.0, gt=0, description="Baseline starting account equity in INR")
    train_ratio: float = Field(default=0.70, ge=0.50, le=0.90, description="Chronological train split ratio (default 0.70)")
```

### Response Schema (`ReplayResult`)

```python
class SkippedTradeDetail(BaseModel):
    trade_id: UUID
    symbol: str
    entry_time: datetime
    exit_time: datetime
    net_pnl: Decimal
    rule_type: str
    reason: str

class SkippedTradesSummary(BaseModel):
    total_skipped: int
    losing_trades_avoided_count: int
    loss_avoided_inr: Decimal  # Positive sum of avoided negative PnL
    winning_trades_sacrificed_count: int
    profit_sacrificed_inr: Decimal  # Positive sum of sacrificed positive PnL
    net_savings_inr: Decimal  # loss_avoided_inr - profit_sacrificed_inr

class MetricDelta(BaseModel):
    pnl_delta_inr: Decimal
    pnl_percentage_change: Decimal | None
    trades_delta: int
    win_rate_delta: Decimal
    profit_factor_delta: Decimal | None
    max_drawdown_delta_inr: Decimal
    expectancy_delta_inr: Decimal

class DualEquityPoint(BaseModel):
    timestamp: datetime
    trade_id: UUID
    actual_equity: Decimal
    simulated_equity: Decimal
    is_skipped: bool

class SplitMetrics(BaseModel):
    before: PerformanceSummary
    after: PerformanceSummary
    delta: MetricDelta

class ReplayResult(BaseModel):
    rule_type: str
    overall_before: PerformanceSummary
    overall_after: PerformanceSummary
    delta: MetricDelta
    train_metrics: SplitMetrics
    test_metrics: SplitMetrics
    is_overfit: bool
    overfit_reason: str | None = None
    small_sample_warning: bool = False
    small_sample_reason: str | None = None
    skipped_summary: SkippedTradesSummary
    skipped_trades: list[SkippedTradeDetail]
    dual_equity_curve: list[DualEquityPoint]
```

---

## 9. Code Style

Example implementation snippet demonstrating adherence to TradeLens standards:

```python
from decimal import Decimal, ROUND_HALF_UP
from zoneinfo import ZoneInfo
from app.models.trade import PairedTrade
from app.rules.catalog import CoolOffAfterLossRule

IST = ZoneInfo("Asia/Kolkata")
_CURRENCY_QUANT = Decimal("0.01")

def evaluate_cooldown(
    rule: CoolOffAfterLossRule,
    trade: PairedTrade,
    state: TradeReplayState,
) -> tuple[bool, str | None]:
    """Evaluates whether trade violates mandatory cooldown after a loss."""
    if state.cooldown_until is not None and trade.entry_time < state.cooldown_until:
        remaining_sec = int((state.cooldown_until - trade.entry_time).total_seconds())
        remaining_min = max(1, remaining_sec // 60)
        return False, (
            f"Violated COOL_OFF_AFTER_LOSS: entry at {trade.entry_time.astimezone(IST):%H:%M} "
            f"is within active {rule.cooldown_minutes}m cooldown ({remaining_min}m remaining)"
        )
    return True, None
```

- Strict static typing with Python 3.13 union syntax (`X | None`).
- Decimals used for all financial calculations; floats only at external REST boundaries.
- Explicit timezone handling converting UTC timestamps to `Asia/Kolkata` for market hour comparisons.
- Clear, readable, self-documenting error and skip diagnostic strings.

---

## 10. Testing Strategy

1. **Test Location**:
   - `services/analytics/tests/test_replay.py`
2. **Test Categories**:
   - **Atomic Rule Verification**:
     - `COOL_OFF_AFTER_LOSS`: Verify trade entered within cooldown is skipped; verify trade after cooldown passes; verify trigger threshold.
     - `MAX_CONSECUTIVE_LOSSES`: Verify circuit breaker triggers on exact streak; verify winning trade resets streak.
     - `DAILY_LOSS_LIMIT`: Verify day halt when cumulative daily loss crosses threshold; verify reset on next day.
     - `MAX_DAILY_TRADES_LIMIT`: Verify exact cutoff at Nth trade; verify trades on subsequent day allowed.
     - `TIME_OF_DAY_CUTOFF`: Verify rejection before 09:15, after 15:15, and during 11:30-13:00 lunch chop.
     - `MAX_POSITION_SIZE`: Verify rejection of oversized lots or capital exposure.
     - `SKIP_INSTRUMENT_TYPE`: Verify skipping options buying while allowing options selling or futures.
     - `NO_TRADING_ON_EXPIRY_DAY`: Verify rejection on expiry day.
     - `COMPOSITE_RULE`: Multi-rule combination (`MAX_DAILY_TRADES_LIMIT` + `COOL_OFF_AFTER_LOSS`) correctly skips trades violating either rule.
   - **70/30 Split & Overfitting Detection**:
     - Synthetic scenario with strong train gains and severe test losses triggers `is_overfit=True`.
     - Robust strategy that improves both train and test yields `is_overfit=False`.
     - Small sample dataset (<30 trades) sets `small_sample_warning=True`.
   - **Dual Equity Curve**:
     - Verify actual equity tracks all trades; verify simulated equity flatlines across skipped trades.
     - Verify initial point matches `starting_capital`.
   - **FastAPI Endpoint Integration**:
     - `POST /api/v1/rules/replay` returns 200 with complete `ReplayResult` schema.
     - Invalid rule or empty trade payload returns clean 422 Unprocessable Entity.

---

## 11. Boundaries

- **Always do**:
  - Quantize all currency outputs to `Decimal("0.01")` using `ROUND_HALF_UP`.
  - Process trades chronologically based on `(entry_time, exit_time, id)`.
  - Provide human-readable `reason` strings explaining why each skipped trade was disqualified.
  - Return clean HTTP 200 responses with descriptive error messages instead of unhandled 500 exceptions.
- **Ask first**:
  - Modifying the underlying `trades` or `rule_runs` Supabase table schemas.
  - Changing the default 70/30 train/test split proportion or overfitting mathematical thresholds.
  - Adding new uncataloged rule types to the evaluator outside the 9 approved in Task 19.
- **Never do**:
  - Silently drop trades or produce non-deterministic results.
  - Use floating-point arithmetic for financial P&L accumulation.
  - Execute live market orders or call external broker APIs during backtesting.
  - Mutate input trade objects in-place during simulation.

---

## 12. Success Criteria

1. **Replay Engine Completeness**: All 9 catalog rules correctly evaluate and produce accurate `before` and `after` performance reports matching `CoreMetricsEngine`.
2. **Dual Equity Alignment**: Actual and simulated equity curves correctly track portfolio net P&L over time with zero calculation drift.
3. **Overfitting Sensitivity**: The 70/30 split reliably detects out-of-sample degradation and flags overfitting.
4. **Performance**: Replay simulation executes 500 trades in < 50 milliseconds.
5. **Test Coverage**: 100% test pass rate across `test_replay.py` and existing test suites (0 regressions across 235 backend tests).
6. **Strict Types**: 0 errors from `mypy --strict`.

---

## 13. Open Questions

1. **Intraday vs Delivery Expiry Rule Scope**: Should `NO_TRADING_ON_EXPIRY_DAY` only apply to expiring F&O contracts for that specific index (e.g. NIFTY options on Thursday), or should it optionally forbid all equity intraday trading on expiry days as well? (Proposed default: restrict derivatives matching the affected index, allow equity unless `affected_indices` includes `ALL`).
2. **Partial Trade Scaling vs Binary Skip**: When a trade violates `MAX_POSITION_SIZE` (e.g. trader took 4 lots instead of max 2), should V1 binary-skip the entire trade, or simulate scaling down the P&L proportionally to the max allowed size? (Proposed default for V1: binary skip, as partial fills create execution assumption discrepancies).
