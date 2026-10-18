# Spec: Task 12 - Behavioral Leak Metrics Computation Engine

## Assumptions

1. **Trade Input Sequence & Chronology**:
   - Metrics are computed on closed round-trip trades (`PairedTrade` models with statutory charges from Task 9 and performance metrics from Task 11).
   - Trades are ordered chronologically by `exit_time` (with secondary ordering by `entry_time`, followed by deterministic `id` UUID string).
2. **Re-entry Window Definition**:
   - A trade is classified as a "Re-entry after loss" if its `entry_time` occurs within $T$ minutes after the `exit_time` of an immediately preceding losing trade (`net_pnl < 0`).
   - Time buckets are standardized to: $\le 5$ min, $\le 15$ min, $\le 30$ min, and $\le 60$ min.
   - If two trades are opened simultaneously or overlap, inter-trade latency is calculated from the most recently closed losing trade.
3. **Overtrading Baseline**:
   - The user's baseline daily trade frequency is calculated using the **median daily trade count** across all active trading calendar days (days with at least 1 closed trade).
   - A day is flagged as an "Overtrading Day" if its trade count exceeds $1.5\times$ the median trade count AND exceeds an absolute minimum threshold of $\ge 5$ trades (preventing low-volume days from false-positive flagging).
4. **Position Size Creep Definition**:
   - Size creep is detected when the execution `quantity` or turnover value of a trade following a loss exceeds $1.25\times$ the quantity of the preceding losing trade or $1.5\times$ the trader's median trade quantity.
5. **Holding Time & Disposition Effect**:
   - Duration is measured using `trade_duration_seconds` ($ExitTime - EntryTime$).
   - A `holding_duration_ratio > 1.00` indicates that losing trades are held longer than winning trades (classic disposition bias).
6. **Database Caching in `stats_snapshots`**:
   - Results serialize cleanly into Pydantic models and store in the PostgreSQL `stats_snapshots.behavior_metrics` JSONB column.

---

## Objective

Build a deterministic, high-precision behavioral analytics engine and API that identifies, quantifies, and isolates the financial impact of the 4 cardinal psychological trading errors:
1. **Re-entry After Loss ("Tilt / Revenge Trading")**:
   - Frequency, Win Rate %, Total Net P&L (₹), and Average P&L across 5m, 15m, 30m, and 60m post-loss cooldown windows.
   - Breakdown of same-symbol revenge (chasing the same scrip) vs cross-symbol revenge.
2. **Overtrading Days ("Volume Fatigue")**:
   - Identification of spike days exceeding $1.5\times$ median daily volume.
   - Comparative analysis: Total P&L and Win Rate on overtrading days vs normal disciplined days.
   - Calendar day breakdown list for visual charting and calendar heatmaps.
3. **Position Size Creep ("Martingale / Loss Chasing")**:
   - Detection of volume or lot size spikes immediately following losing trades.
   - Total Net P&L (₹) and Win Rate % of oversized revenge trades.
   - Maximum size multiplier observed over trader baseline.
4. **Holding Losers vs Winners ("Disposition Effect")**:
   - Average and median holding duration (in seconds and minutes) for winning vs losing trades.
   - Holding time ratio (`losers_avg_duration / winners_avg_duration`).
   - Segment-wise breakdown (Equity Intraday, Futures, Options).
5. **Composite Behavioral Discipline Score**:
   - Normalized 0–100 score indicating execution discipline (100 = zero leaks, < 50 = severe tilt/capital leakage).
   - Identification of the `#1 Top Capital Leak` ranked by absolute rupee damage.

---

## Tech Stack

- **Language / Runtime**: Python 3.11+
- **Data Structures / Precision**: Python `decimal.Decimal` with `ROUND_HALF_UP` for all monetary metrics and percentages; standard library `datetime` with timezone awareness.
- **Data Modeling & Validation**: Pydantic v2 (`BaseModel`, `Field`, `computed_field`)
- **Web API**: FastAPI with Pydantic serialization
- **Database Caching**: Supabase PostgreSQL `stats_snapshots.behavior_metrics` JSONB column
- **Testing**: `pytest`, `pytest-asyncio`
- **Typing & Linting**: `mypy --strict`, `ruff`

---

## Commands

```powershell
# Run Task 12 Behavioral Leak Unit & Regression Tests
.\services\analytics\.venv\Scripts\python.exe -m pytest services/analytics/tests/test_behavior_metrics.py -v

# Run Full Analytics Test Suite
.\services\analytics\.venv\Scripts\python.exe -m pytest services/analytics/tests -v

# Static Type Checking
.\services\analytics\.venv\Scripts\mypy.exe services/analytics/app/engine/behavior_metrics.py services/analytics/app/models/behavior.py

# Linting
.\services\analytics\.venv\Scripts\ruff.exe check services/analytics/app/engine/behavior_metrics.py services/analytics/app/models/behavior.py

# Run FastAPI Local Dev Server
.\services\analytics\.venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## Project Structure

```
services/analytics/
  app/
    models/
      behavior.py             → Pydantic models: ReentryBucket, ReentryMetrics, OvertradingMetrics, SizeCreepMetrics, HoldingTimeMetrics, BehavioralLeakReport
    engine/
      behavior_metrics.py     → BehaviorMetricsEngine: deterministic calculation of all 4 leaks and composite score
    routers/
      behavior.py             → FastAPI Router: POST /api/v1/behavior/compute, GET /api/v1/behavior/summary
  tests/
    test_behavior_metrics.py  → Test suite covering revenge re-entries, overtrading days, size creep, holding duration ratio, and composite scoring
```

---

## Code Style & Conventions

- Strict type annotations on all function signatures: `trades: Sequence[PairedTrade] -> BehavioralLeakReport`.
- All monetary amounts quantized to `0.01` with `ROUND_HALF_UP`.
- Percentages quantized to `0.01` (e.g. `Decimal("42.50")` for 42.50%).
- Durations represented in integer seconds (`int`) with human-friendly computed duration strings (e.g. `12m 30s`).
- Pure functional calculations without mutation of past trade models.

```python
# Example: High-Precision Revenge Re-entry Window Calculation
@classmethod
def calculate_reentry_leaks(
    cls,
    trades: Sequence[PairedTrade],
) -> ReentryMetrics:
    sorted_trades = sorted(trades, key=lambda t: (t.exit_time, t.entry_time, str(t.id)))
    # Windows: 5m, 15m, 30m, 60m
    ...
```

---

## Testing Strategy

- **Test Framework**: `pytest` inside `services/analytics/tests/test_behavior_metrics.py`.
- **Test Scenarios**:
  1. **Re-entry Window Detection**:
     - Trade entered 3 minutes after a loss -> captured in $\le 5$m, $\le 15$m, $\le 30$m, $\le 60$m buckets.
     - Trade entered 25 minutes after a loss -> captured only in $\le 30$m and $\le 60$m buckets.
     - Trade entered after a winning trade -> NOT flagged as a revenge re-entry.
  2. **Same-Symbol vs Cross-Symbol Revenge**:
     - Verify classification when trader immediately re-enters the same stock vs shifting to index options.
  3. **Overtrading Day Detection**:
     - Median trade count = 3. Days with 8 trades (> 1.5x and $\ge 5$) flagged as overtrading.
     - Compare net P&L and win rate between overtrading days and disciplined days.
  4. **Position Size Creep**:
     - Trader trades 50 qty, loses, then trades 100 qty -> flagged as size creep ($2.0\times$ increase).
     - Trader trades 50 qty, wins, then trades 100 qty -> NOT flagged as post-loss size creep.
  5. **Holding Time Ratio & Disposition Bias**:
     - Winners held for 300s, losers held for 900s -> ratio = 3.00 (severe disposition bias).
     - Winners held for 600s, losers held for 300s -> ratio = 0.50 (disciplined risk cutting).
  6. **Empty & Single-Trade Boundaries**:
     - Zero trades or 1 trade produces safe zeroed metrics without `ZeroDivisionError` or exceptions.
  7. **FastAPI Endpoints**:
     - `POST /api/v1/behavior/compute` returns complete validated payload matching schemas.

---

## Boundaries

- **Always do**:
  - Quantize every monetary calculation to `Decimal("0.01")` using `ROUND_HALF_UP`.
  - Handle zero division cleanly across all ratios (holding time ratio, win rates, percentage of volume).
  - Sort trades deterministically by `(exit_time, entry_time, id)` before computing inter-trade latencies.
  - Run `pytest`, `mypy`, and `ruff` before completing implementation.
- **Ask first**:
  - Modifying the existing Supabase `stats_snapshots` schema or adding new database columns.
  - Adding third-party numerical packages (e.g. `scipy` or `pandas`) when standard Python primitives and `Decimal` suffice.
- **Never do**:
  - Never use native floating-point numbers (`float`) for P&L or fee calculations.
  - Never generate trade advice, price targets, or financial buy/sell recommendations.
  - Never mutate the original `PairedTrade` models during analysis.

---

## Success Criteria

1. `BehaviorMetricsEngine.calculate_behavioral_metrics()` computes:
   - Re-entry after loss across 5m, 15m, 30m, 60m buckets (count, P&L, win rate %, same-symbol count).
   - Overtrading days analysis (flagged days count, total overtrading P&L vs normal P&L, daily list).
   - Position size creep (post-loss size spike count, P&L damage, max multiplier).
   - Holding time ratio (winners average/median seconds, losers average/median seconds, ratio).
   - Composite behavioral discipline score (0–100) and Top Capital Leak headline.
2. All unit and edge case tests in `test_behavior_metrics.py` pass with 100% assertion coverage.
3. `mypy --strict` passes with 0 type errors across `behavior_metrics.py` and `behavior.py`.
4. `ruff check` passes with 0 lint warnings.
5. FastAPI endpoint `POST /api/v1/behavior/compute` responds in $< 15\text{ ms}$ for a batch of 500 trades.

---

## Open Questions

1. **Re-entry Window Customization**: Should the time windows (5m, 15m, 30m, 60m) be configurable by the user in their profile settings, or is a fixed institutional standard preferred?
2. **Overtrading Multiplier Sensitivity**: Is $1.5\times$ median with a minimum of 5 trades the optimal default, or should high-frequency scalpers have an adaptive threshold?
