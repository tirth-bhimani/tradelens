# SPEC-task22: Rule Lab Interactive Interface & Backtest Runner

- **Module**: `apps/web/app/(dashboard)/rule-lab/page.tsx`, `apps/web/components/rule-lab/*`
- **Status**: Draft / Ready for Review
- **Owner**: TradeLens Frontend Engineering
- **Dependencies**: Task 19 (`services/analytics/app/rules/catalog.py`), Task 20 (`POST /api/v1/rules/translate`), Task 21 (`POST /api/v1/rules/replay`)
- **Downstream**: Task 23 (Saved Rulebook & Import Adherence Tracker)

---

## Assumptions I'm Making

1. **Monorepo Architecture & Framework**:
   - The Rule Lab UI is built inside `apps/web` utilizing Next.js 14 App Router, React 18, Tailwind CSS, Lucide icons, and Vitest.
   - Zero heavy external charting dependencies (e.g. Chart.js, Recharts) are introduced. The dual equity curve is rendered via lightweight, responsive SVG math extending the existing [`lib/charts/chart-options.ts`](file:///D:/resume/sdd/apps/web/lib/charts/chart-options.ts) patterns.
2. **Three-Way Rule Input Modality**:
   - Traders can define rules in three distinct ways:
     1. **Catalog Template Picker**: Direct selection of the 9 canonical rules with parameter inputs and bounds sliders.
     2. **Natural Language Input**: Plain-English textarea with an instant "Translate with AI" button calling Task 20's `POST /api/v1/rules/translate`.
     3. **AI Insights Deep-Link Prefill**: Seamless auto-population when navigating from `/insights` via `?prefillRule=...`.
3. **Institutional Dual Equity Visualizer**:
   - The visualizer superimposes the **Actual Equity Curve** (solid blue `#387ed1`) against the **Simulated Equity Curve** (solid emerald `#10b981`), clearly marking skipped trade points where equity was preserved.
4. **Quant-Grade Overfitting & Statistical Confidence Banners**:
   - Displays a dedicated 70/30 In-Sample (Train) vs. Out-of-Sample (Test) performance card.
   - If `is_overfit=True`, a high-visibility warning ribbon informs the trader of curve-fitting risk.
   - If `small_sample_warning=True`, a sample size caution banner alerts that total trades < 30.
5. **Mandatory Institutional Disclaimer**:
   - A persistent, prominent disclaimer banner stating: *"Replay simulation is a counter-factual mathematical approximation based on past trade fills. Live market slippage, execution priority, and emotional adherence may vary."*

→ *Correct me now or I'll proceed with these.*

---

## 1. Objective

Build a production-grade, interactive **Trading Rule Lab** in Next.js that empowers traders to design behavioral guardrails, simulate their counter-factual impact against past trade logs via the Task 21 replay engine, and visualize Before vs. After equity curves and risk metrics:
1. **Rule Builder & Template Selector (`apps/web/components/rule-lab/rule-builder.tsx`)**:
   - Interactive configuration UI for all 9 catalog rules with bound-validated form controls.
   - Natural language input mode calling `POST /api/v1/rules/translate` with immediate parameter preview.
   - Prefill parameter hydration from URL search params.
2. **Comparative Metric Delta Cards (`apps/web/components/rule-lab/comparison-metrics.tsx`)**:
   - Side-by-side Before vs. After financial KPI cards (Net Realized P&L, Win Rate, Profit Factor, Max Drawdown in ₹ and %, Expectancy, Total Trades).
   - Color-coded delta badges displaying absolute rupee changes and percentage improvements.
3. **Dual Equity Curve Visualizer (`apps/web/components/rule-lab/dual-equity-chart.tsx`)**:
   - High-performance, zero-dependency SVG line chart rendering Actual vs. Simulated cumulative equity.
   - Interactive hover crosshairs and tooltips showing point-in-time trade details and P&L divergence.
4. **Overfitting & 70/30 Split Diagnostic Card (`apps/web/components/rule-lab/split-metrics-card.tsx`)**:
   - Clear comparison table of In-Sample (Train 70%) vs. Out-of-Sample (Test 30%) performance.
   - Automated Overfit Alert and Low Sample Size warning callouts.
5. **Skipped Trades Diagnostic Table (`apps/web/components/rule-lab/skipped-trades-table.tsx`)**:
   - Granular ledger of all disqualified trades detailing timestamp, symbol, net P&L avoided vs. sacrificed, and specific rule rejection reasons.
   - Financial edge summary ribbon: Total Skipped, Avoided Losses (₹), Sacrificed Profits (₹), Net Leak Savings (₹).
6. **Main Rule Lab Page Orchestration (`apps/web/app/(dashboard)/rule-lab/page.tsx`)**:
   - Cohesive dashboard layout incorporating the mandatory disclaimer banner, rule builder, backtest runner button, and comprehensive results display.

---

## 2. Tech Stack

- **Framework**: Next.js 14+ (App Router, React 18, Server & Client Components)
- **Styling**: Tailwind CSS, CSS variables for dark/light themes (`card-zerodha-glass`, `btn-zerodha-primary`)
- **Icons**: `lucide-react`
- **Charting**: Lightweight SVG math utilizing `@/lib/charts/chart-options`
- **Formatting**: Indian financial denomination utilities from `@/lib/utils/format` (`formatCurrencyINR`, `formatPercentage`)
- **Testing**: Vitest (`@testing-library/react`), jsdom

---

## 3. Commands

```powershell
# Run frontend Rule Lab unit tests
npm test --prefix apps/web apps/web/tests/rule-lab.test.tsx

# Run full frontend test suite
npm test --prefix apps/web

# Build Next.js application (typecheck and bundle verification)
npm run build --prefix apps/web

# Start local Next.js development server
npm run dev --prefix apps/web
```

---

## 4. Project Structure

```
apps/web/
├── app/
│   └── (dashboard)/
│       └── rule-lab/
│           ├── loading.tsx               # Skeleton loading state
│           └── page.tsx                  # [REPLACE] Full Rule Lab Interactive Backtest Dashboard
├── components/
│   └── rule-lab/
│       ├── rule-builder.tsx              # [NEW] Catalog template selector + Natural Language input
│       ├── comparison-metrics.tsx        # [NEW] Before vs After KPI cards with delta badges
│       ├── dual-equity-chart.tsx         # [NEW] SVG Actual vs Simulated equity curves with hover tooltips
│       ├── split-metrics-card.tsx        # [NEW] 70/30 Train/Test comparison & Overfitting warning
│       ├── skipped-trades-table.tsx      # [NEW] Granular disqualified trades table with savings summary
│       └── backtest-result-view.tsx      # [NEW] Unified container for simulation results
├── lib/
│   └── rules/
│       └── types.ts                      # [NEW] TypeScript types, client API fetchers, and sample fallback dataset
└── tests/
    └── rule-lab.test.tsx                 # [NEW] Comprehensive frontend test suite
```

---

## 5. UI Architecture & User Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Trading Rule Lab Header                           │
│   "Design behavioral guardrails and simulate them on your historical trades"│
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Mandatory Institutional Disclaimer                      │
│     "Replay is an approximation based on past behavior. Slippage may vary"  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Rule Builder Component                            │
│  ┌───────────────────────────────┐      ┌────────────────────────────────┐  │
│  │ [Tab 1: Catalog Templates]    │  OR  │ [Tab 2: Plain English (AI)]    │  │
│  │ Dropdown: 9 Canonical Rules   │      │ Textarea: "Max 5 trades/day..."│  │
│  │ Sliders: Cooldown, Loss Limit │      │ Button: [Translate with AI]    │  │
│  └───────────────────────────────┘      └────────────────────────────────┘  │
│                                                                             │
│                  [ ▶ Run Replay Backtest Simulation ]                       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ POST /api/v1/rules/replay
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Backtest Results Container                          │
│                                                                             │
│ 1. Overfitting & Sample Size Alerts (if is_overfit or total_trades < 30)    │
│                                                                             │
│ 2. Comparative Metric Cards:                                                │
│    ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐  │
│    │ Net Realized  │ │ Win Rate      │ │ Profit Factor │ │ Max Drawdown  │  │
│    │ ₹1.2L (+₹42K) │ │ 54% (+5.9%)   │ │ 1.58 (+0.37)  │ │ -14% (+8.3%)  │  │
│    └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘  │
│                                                                             │
│ 3. Dual Equity Curve (Superimposed Actual vs. Simulated with Rule)          │
│                                                                             │
│ 4. 70/30 Train vs. Test Partition Breakdown Table                           │
│                                                                             │
│ 5. Disqualified Trades Ledger (Avoided Losses: ₹52,000 | Skipped: 18 trades)│
│                                                                             │
│                  [ Save Rule to Personal Rulebook (Task 23) ]               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Component Contracts & Interfaces

### 1. `RuleBuilder` Component (`rule-builder.tsx`)

```typescript
export interface RuleBuilderProps {
  onRunReplay: (rule: any) => Promise<void>;
  isLoading: boolean;
  initialRule?: any;
}
```

- Supports toggling between **"Catalog Templates"** (select from the 9 V1 rules with bounded sliders) and **"Plain English AI"** (free-form trader text).
- Validates parameters locally before dispatching to backend.
- Displays immediate JSON preview and natural language explanation.

### 2. `ComparisonMetrics` Component (`comparison-metrics.tsx`)

```typescript
export interface ComparisonMetricsProps {
  before: PerformanceSummary;
  after: PerformanceSummary;
  delta: MetricDelta;
}
```

- Displays 6 institutional metric cards:
  - **Net Realized P&L**: Rupee value before/after + delta badge (`+₹42,500 (+14.2%)`).
  - **Win Rate**: Pre vs post win percentage (`48.2% -> 54.1%`).
  - **Profit Factor**: Pre vs post profit factor (`1.21 -> 1.58`).
  - **Max Drawdown**: Pre vs post drawdown magnitude and percentage improvement (`-₹35,000 -> -₹21,000`).
  - **Average Win / Loss Ratio**: Pre vs post expectancy payout ratio.
  - **Trade Count**: Executed trades vs skipped trades count (`120 -> 94 trades, 26 skipped`).

### 3. `DualEquityChart` Component (`dual-equity-chart.tsx`)

```typescript
export interface DualEquityChartProps {
  points: DualEquityPoint[];
  height?: number;
  className?: string;
}
```

- Renders two distinct SVG paths:
  - `Actual Equity`: Blue line (`#387ed1`) with subtle gradient fill.
  - `Simulated Equity`: Emerald line (`#10b981`) with elevated stroke width.
- Highlights trade execution dots on hover with an institutional crosshair tooltip showing timestamp, symbol, actual vs simulated equity, and P&L delta.

### 4. `SplitMetricsCard` Component (`split-metrics-card.tsx`)

```typescript
export interface SplitMetricsCardProps {
  train: SplitMetrics;
  test: SplitMetrics;
  isOverfit: boolean;
  overfitReason?: string | null;
  smallSampleWarning: boolean;
  smallSampleReason?: string | null;
}
```

- Clear side-by-side 70/30 partition table.
- Renders high-visibility Alert Banners:
  - Overfit Warning (Red/Rose): Explains exact reason why rule curve-fits in-sample but fails out-of-sample.
  - Small Sample Warning (Amber): Informs user when dataset has <30 total trades or <10 test trades.

### 5. `SkippedTradesTable` Component (`skipped-trades-table.tsx`)

```typescript
export interface SkippedTradesTableProps {
  trades: SkippedTradeDetail[];
  summary: SkippedTradesSummary;
}
```

- Financial Edge Header Ribbon:
  - Avoided Losses: `+₹54,000` (14 losing trades avoided)
  - Sacrificed Profits: `-₹12,000` (4 winning trades missed)
  - Net Leak Savings: `+₹42,000` net behavioral improvement
- Paginated table showing:
  - Timestamp (IST)
  - Symbol & Instrument Type
  - Avoided P&L (colored green for avoided loss, amber for sacrificed gain)
  - Exact Rule Violation Reason

---

## 7. Code Style & Design Conventions

Example snippet illustrating component design and Zerodha-style aesthetic:

```tsx
import React from "react";
import { formatCurrencyINR, formatPercentage } from "@/lib/utils/format";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export function MetricBadge({ value, isCurrency = true }: { value: number; isCurrency?: boolean }) {
  const isPositive = value > 0;
  const isNegative = value < 0;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold ${
        isPositive
          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
          : isNegative
          ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
      }`}
    >
      {isPositive ? <TrendingUp className="w-3 h-3" /> : isNegative ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
      <span>{isCurrency ? formatCurrencyINR(value) : formatPercentage(value)}</span>
    </span>
  );
}
```

- Strict adherence to Zerodha / TradeLens dark and light mode color palette (`dark:bg-[#0c1017]`, `dark:border-slate-800`, `#387ed1`).
- Exact Indian Rupee formatting (`₹1,25,000.00`).
- No arbitrary layout shifts; all async fetches render clean skeleton loaders.

---

## 8. Testing Strategy

1. **Test Location**:
   - `apps/web/tests/rule-lab.test.tsx`
2. **Framework**:
   - Vitest, `@testing-library/react`, jsdom
3. **Test Scenarios**:
   - **Template Selection**: User selects "COOL_OFF_AFTER_LOSS"; verified that cooldown minute slider and trigger loss inputs render with default values.
   - **Natural Language Mode**: User types "Stop trading after 3 consecutive losses" and clicks "Translate with AI"; mock API validates and loads `MAX_CONSECUTIVE_LOSSES`.
   - **Comparative Metrics**: Confirms positive P&L delta badges render with green styling and correct rupee symbols; confirms negative deltas render rose styling.
   - **Dual Equity Chart**: Verifies SVG renders path elements for both actual and simulated curves with correct dimensions and legends.
   - **Overfitting Warning**: Verifies alert ribbon renders when `is_overfit=True` with `overfit_reason`.
   - **Small Sample Warning**: Verifies warning renders when `small_sample_warning=True`.
   - **Skipped Trades Table**: Verifies that skipped trade rows display symbol, avoided P&L, and reason string.
   - **Disclaimer**: Verifies mandatory disclaimer is present in the document.

---

## 9. Boundaries

- **Always do**:
  - Show the institutional disclaimer banner prominently on the page.
  - Format all currency in Indian Rupees (`₹`) using `formatCurrencyINR`.
  - Maintain dark-mode contrast compliance (`text-slate-100` on dark containers).
  - Provide immediate visual loading feedback during backtest simulation.
- **Ask first**:
  - Adding third-party chart libraries (keep existing SVG math).
  - Removing or altering the 70/30 overfitting warning thresholds.
  - Altering the 9 catalog template schemas.
- **Never do**:
  - Render raw unformatted float numbers (e.g. `12345.6789`).
  - Silently ignore API replay errors; always display actionable error banners.
  - Hide sacrificed winning trades; transparency on missed profits is critical.

---

## 10. Success Criteria

1. **Interactive Rule Configuration**: Users can select from all 9 catalog rules or translate plain English into valid backtest rules.
2. **Backtest Execution**: Clicking "Run Replay" calls the Task 21 endpoint and renders Before/After metrics in < 1 second.
3. **Dual Equity Chart**: Dual curves accurately visualize actual vs simulated equity with hover crosshairs.
4. **Quant Transparency**: 70/30 split table and overfitting flags clearly communicate model robustness.
5. **Skipped Trade Visibility**: Full audit ledger shows every avoided loss and missed profit.
6. **Zero Regressions**: 100% of frontend Vitest tests pass (`npm run test`).
7. **Production Build**: `npm run build` succeeds with zero TypeScript or ESLint errors.

---

## 11. Open Questions

1. **Default Dataset for Backtesting**: If a user opens the Rule Lab before importing any broker CSV, should the UI display an empty state prompting import, or provide a "Load Sample Day-Trader Log (40 Trades)" button for immediate experimentation? *(Proposed default: Provide both — a prompt to import their own CSV, plus a one-click sample dataset to test the visualizer immediately)*.
2. **Chart Zoom / Timeframe Filtering**: Should the dual equity curve support timeframe toggling (`1W`, `1M`, `3M`, `ALL`), or display the entire backtest range by default? *(Proposed default: display `ALL` backtest points by default with standard timeframe pill toggles)*.
