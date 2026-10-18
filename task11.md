# Spec: Task 11 - Core Trading Performance Metrics Engine

## Assumptions

1. **Trade Sequence & Chronology**:
   - Metrics are computed on closed round-trip trades (`PairedTrade` models from Task 8 with statutory charges from Task 9).
   - Trades are ordered chronologically by `exit_time` (the moment the trade is closed and realized P&L is finalized).
   - In the event of identical exit timestamps, secondary ordering is by `entry_time`, followed by deterministic `id` UUID string ordering.
2. **Win / Loss / Breakeven Definition**:
   - A trade is categorized based strictly on **Net Realized P&L** (after deducting all statutory brokerage, STT, GST, stamp duty, and turnover tariffs):
     - **Win**: `net_pnl > 0.00`
     - **Loss**: `net_pnl < 0.00`
     - **Breakeven**: `net_pnl == 0.00`
3. **Starting Capital & Baseline**:
   - User profile provides `starting_capital: Decimal` (e.g. ₹5,00,000.00). If not set or 0, cumulative calculations start at ₹0.00.
   - Percentage drawdown is computed against peak equity ($Peak_i = StartingCapital + CumulativePnL$). If `starting_capital <= 0` or peak equity $\le 0$, percentage drawdown cannot be computed safely and returns `None` (preserving absolute ₹ drawdown).
4. **Zero-Division & Edge Cases**:
   - When total trades = 0: All averages, win rates, and ratios evaluate to `0.00` or `None` with safe default indicators.
   - When losing trades = 0: Profit factor is theoretically infinite. The schema sets `profit_factor = None`, `is_infinite_profit_factor = True`.
   - When winning trades = 0: Profit factor is `0.00`.
5. **Database Caching in `stats_snapshots`**:
   - Computed metrics are cached in the PostgreSQL `stats_snapshots` table using a deterministic SHA-256 fingerprint hash based on the list of trade IDs, exit timestamps, net P&L, starting capital, and active date filters.

---

## Objective

Build a deterministic, high-precision analytics engine and API that computes institutional trading performance metrics:
1. **Summary KPIs**: Total Realized Net P&L, Gross P&L, Total Statutory Charges, Total Trades, Win Rate %, Loss Rate %, Breakeven Rate %.
2. **Win/Loss & Expectancy Analytics**: Average Win, Average Loss, Win/Loss Ratio (Payout Ratio), Profit Factor, Trade Expectancy in Rupees, Expectancy Ratio, Largest Win, Largest Loss.
3. **Streak Analytics**: Longest Consecutive Winning Streak (count & ₹ sum), Longest Consecutive Losing Streak (count & ₹ sum), Current Active Streak.
4. **Drawdown Analytics**: Peak-to-Trough Maximum Drawdown in Rupees (₹) and Percentage (%), Drawdown Duration, Peak Date, Trough Date, Recovery Date, Current Drawdown status.
5. **Time-Based Equity Curve Series**: Point-in-time trade-by-trade equity curve and daily aggregated equity series formatted for charting (Recharts / TradingView Lightweight Charts).
6. **Filtering Support**: Instant recalculation across date ranges (`from_date`, `to_date`), trading segments (`EQUITY_DELIVERY`, `EQUITY_INTRADAY`, `FUTURES`, `OPTIONS`), and symbols.
7. **Snapshot Caching**: Hashed caching against `stats_snapshots` to provide sub-10ms dashboard loads.

---

## Tech Stack

- **Language / Runtime**: Python 3.11+
- **Data Structures / Precision**: Python `decimal.Decimal` with `ROUND_HALF_UP` for all currency amounts and ratios; standard library `datetime` with timezone awareness.
- **Data Modeling & Validation**: Pydantic v2 (`BaseModel`, `Field`, `computed_field`)
- **Web API**: FastAPI with Pydantic serialization
- **Database Caching**: Supabase PostgreSQL `stats_snapshots` table with JSONB and SHA-256 hashing
- **Testing**: `pytest`, `pytest-asyncio`
- **Typing & Linting**: `mypy --strict`, `ruff`

---

## Commands

```powershell
# Run Task 11 Core Metrics Unit & Regression Tests
.\services\analytics\.venv\Scripts\python.exe -m pytest services/analytics/tests/test_core_metrics.py -v

# Run Full Analytics Test Suite
.\services\analytics\.venv\Scripts\python.exe -m pytest services/analytics/tests -v

# Static Type Checking
.\services\analytics\.venv\Scripts\mypy.exe services/analytics/app/engine/core_metrics.py services/analytics/app/models/metrics.py

# Linting
.\services\analytics\.venv\Scripts\ruff.exe check services/analytics/app/engine/core_metrics.py

# Run FastAPI Local Dev Server
.\services\analytics\.venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## Project Structure

```
services/analytics/
  app/
    models/
      metrics.py             → Pydantic models: PerformanceSummary, ExpectancyMetrics, DrawdownMetrics, StreakMetrics, EquityPoint, DailyEquityPoint, PerformanceReport
    engine/
      core_metrics.py        → CoreMetricsEngine: deterministic computation of all formulas, streaks, drawdown series, and hashing
    routers/
      metrics.py             → FastAPI Router: POST /api/v1/metrics/compute, GET /api/v1/metrics/summary
  tests/
    test_core_metrics.py     → Test suite covering win rate, profit factor, drawdown, streaks, equity curve, zero loss edge cases, and snapshot hashing
```

---

## Code Style & Conventions

- Strict type annotations on all function signatures: `trades: Sequence[PairedTrade], starting_capital: Decimal = Decimal("0.00") -> PerformanceReport`.
- All monetary values must use `Decimal` quantized to `0.01` with `ROUND_HALF_UP`.
- Percentages quantized to `0.01` (e.g. `Decimal("57.14")` for 57.14%).
- Streak counters and durations use integer types (`int`).
- Clear separation between raw calculations and structured API payloads.

```python
# Example: High-Precision Drawdown Point Computation
@classmethod
def calculate_running_drawdown(
    cls,
    trades: Sequence[PairedTrade],
    starting_capital: Decimal,
) -> tuple[Decimal, Decimal | None, list[EquityPoint]]:
    equity = starting_capital
    peak = starting_capital
    max_dd_inr = Decimal("0.00")
    max_dd_pct: Decimal | None = Decimal("0.00") if starting_capital > 0 else None
    points: list[EquityPoint] = []

    for trade in sorted(trades, key=lambda t: (t.exit_time, t.entry_time, str(t.id))):
        equity += trade.net_pnl
        if equity > peak:
            peak = equity
        dd_inr = peak - equity
        if dd_inr > max_dd_inr:
            max_dd_inr = dd_inr

        dd_pct = ((dd_inr / peak) * Decimal("100.00")).quantize(Decimal("0.01")) if peak > 0 else None
        if dd_pct is not None and (max_dd_pct is None or dd_pct > max_dd_pct):
            max_dd_pct = dd_pct

        points.append(EquityPoint(
            timestamp=trade.exit_time,
            trade_id=trade.id,
            symbol=trade.symbol,
            net_pnl=trade.net_pnl,
            cumulative_pnl=equity - starting_capital,
            equity=equity,
            peak_equity=peak,
            drawdown_inr=dd_inr,
            drawdown_pct=dd_pct,
        ))

    return max_dd_inr, max_dd_pct, points
```

---

## Testing Strategy

- **Test Framework**: `pytest` inside `services/analytics/tests/test_core_metrics.py`.
- **Test Scenarios**:
  1. **Perfect Win Scenario**: 5 winning trades -> Win Rate = 100%, Profit Factor = infinite (`None`), Max Drawdown = ₹0.00, Win streak = 5.
  2. **All Loss Scenario**: 5 losing trades -> Win Rate = 0%, Profit Factor = 0.00, Max Drawdown = total losses, Loss streak = 5.
  3. **Realistic Mixed Scenario**: 10 trades with wins, losses, and breakeven trades matching known benchmark calculations.
  4. **Drawdown Peak-to-Trough**: Verify multiple peaks, subsequent troughs, recovery timestamp identification, and active drawdown state.
  5. **Empty Trades Boundary**: Verify empty trade set returns zeroed summary without `ZeroDivisionError`.
  6. **Date & Segment Filtering**: Assert that filtering by segment (e.g. `FNO_OPTIONS` only) or date range produces mathematically exact subsets.
  7. **Deterministic Fingerprint Hashing**: Assert identical trade inputs produce identical SHA-256 hashes, and any single modified value changes the hash.

---

## Boundaries

- **Always do**:
  - Quantize every monetary calculation to `Decimal("0.01")` using `ROUND_HALF_UP`.
  - Sort trades deterministically by `(exit_time, entry_time, id)` before processing streak or equity series.
  - Handle zero division cleanly across Win/Loss ratio, Profit Factor, and Drawdown percentages.
  - Run `pytest` and `mypy` before marking any step complete.
- **Ask first**:
  - Modifying the existing Supabase `stats_snapshots` schema or adding additional database columns.
  - Introducing third-party numerical packages (e.g. `numpy` or `scipy`) when standard library `Decimal` and Python primitives suffice.
- **Never do**:
  - Never use native floating-point numbers (`float`) for P&L or fee aggregations.
  - Never calculate win rate or profit factor on gross P&L; statutory Indian fees must be deducted.
  - Never alter past trade records during metrics calculation (pure functional calculation).

---

## Success Criteria

1. `CoreMetricsEngine.calculate_metrics()` computes all core metrics:
   - Win Rate %, Loss Rate %, Breakeven Rate %
   - Total Gross P&L, Total Charges, Total Net P&L
   - Profit Factor, Win/Loss Ratio, Expectancy (₹ and ratio)
   - Max Drawdown (₹ and %) with peak, trough, and recovery timestamps
   - Winning streaks and losing streaks (counts and ₹)
2. `equity_curve` produces a chronological point-in-time timeseries with equity, peak, and drawdown.
3. `daily_equity_curve` aggregates trades by calendar date for daily P&L bar charts and end-of-day balance lines.
4. All unit tests in `test_core_metrics.py` pass with 100% assertion coverage.
5. `mypy --strict` passes with 0 type errors across `core_metrics.py` and `metrics.py`.
6. FastAPI endpoint `POST /api/v1/metrics/compute` responds in $< 15\text{ ms}$ for a batch of 500 trades.

---

## Open Questions

1. **Intraday vs. Positional Breakdown**: Should the metrics engine return a pre-segmented breakdown (Intraday metrics vs. Positional metrics) directly inside the main `PerformanceReport`, or should the caller pass `segment` / `is_intraday` filters to calculate them on demand?
2. **Benchmark Comparison**: Do we want to include a baseline Buy & Hold Nifty 50 benchmark comparison in this task, or leave that for Phase 5 (visualizations)?
