# Spec: Task 13 - Summary Metric Cards & Indian Currency Formatting

## Assumptions & Design Decisions

1. **Design System & Aesthetics**:
   - 100% institutional trading aesthetic (Zerodha Kite / Bloomberg / Koyfin style): hairline borders (`border-slate-200 dark:border-slate-800`), dark background `#0d131f` / `#0c1017`, Inter sans typography with `tabular-nums` for all numbers.
   - Strictly zero generic AI pastel yellow/amber alert pills or thick colored borders.
2. **Indian Numbering Conventions**:
   - Standard Indian comma grouping: 2, 2, 3 pattern (e.g. `₹12,34,567.89`).
   - Compact denominations:
     - Values $\ge ₹1,00,00,000$ (1 Crore) format as `₹X.XX Cr` (e.g. `₹2.45 Cr`).
     - Values $\ge ₹1,00,00/00$ (1 Lakh) format as `₹X.XX L` (e.g. `₹15.20 L`).
     - Values $< ₹1,00,000$ format with full currency grouping (e.g. `₹48,520.50`).
     - Negative numbers preserve the minus sign before currency: `-₹1.50 L` or `-₹12,450.00`.
     - Full precision rupee amounts are preserved in `title` tooltips for complete transparency.
3. **Responsive Grid Layout**:
   - 1 column on mobile (`< 640px`), 2 columns on tablet (`sm`), and 3 or 6 columns on desktop (`lg:grid-cols-3 xl:grid-cols-6`).
   - Unified height and alignment across all cards with built-in skeleton loader states to prevent Layout Shifts (CLS < 0.05).
4. **Return on Capital (RoC)**:
   - When trader `startingCapital` is provided and $> 0$, the Realized Net P&L card automatically calculates and displays percentage return on capital (e.g. `+9.7% RoC • ₹1,479.50 charges`).
5. **Data Binding**:
   - Consumes `PerformanceReport` emitted by Task 11 (`CoreMetricsEngine`) and `BehavioralLeakReport` from Task 12 (`BehaviorMetricsEngine`).
   - Handles empty tradebook state gracefully with zero values and onboarding prompts (no `NaN` or unhandled `null`).

---

## Objective

Build a responsive, production-ready summary metrics card system and unified Indian financial formatting suite for the TradeLens dashboard:
1. **Formatting Suite (`format.ts` & `lib/formatters/currency.ts`)**:
   - `formatCurrencyINR(val, options)`: Standard Indian grouped rupees with optional paise.
   - `formatIndianDenomination(val, options)`: Compact Lakhs (`₹L`) and Crores (`₹Cr`) with configurable precision.
   - `formatSignedCurrency(val, compact)`: Explicit positive `+` and negative `-` formatting (`+₹45,200.00`, `-₹12,450.00`).
   - `formatPercentage(val, includeSign)`: Standardized percentage formatting (`+57.14%`, `0.00%`).
2. **Atomic Component (`MetricCard.tsx`)**:
   - Reusable institutional metric card supporting title, icon, primary value, trend badge, secondary subtitle, and skeleton loading state.
3. **Dashboard Summary Grid (`SummaryMetricsGrid.tsx`)**:
   - Displays 6 essential trading KPIs:
     1. **Realized Net P&L** (₹ with sign, green/rose color coding, RoC %, charges deducted).
     2. **Win Rate** (% with winning/losing trade counts and win/loss ratio).
     3. **Profit Factor** (numeric ratio with clean `∞ (Clean)` indicator for 0 losses).
     4. **Trade Expectancy** (average ₹ return per trade and expectancy ratio).
     5. **Maximum Drawdown** (peak-to-trough in ₹ and % with active recovery status).
     6. **Consecutive Streaks** (longest winning streak vs losing streak with ₹ sum).
4. **Zero-Flicker Skeleton Loading**:
   - Dedicated skeleton fallback matching the exact layout and dimensions of the metric cards.

---

## Tech Stack

- **Framework**: Next.js 14+ (App Router, Server & Client Components)
- **Language / Typing**: TypeScript 5.0+ (`strict: true`)
- **Styling**: Tailwind CSS with dark mode support (`dark:bg-[#0d131f]`, `dark:border-slate-800`)
- **Icons**: `lucide-react`
- **Testing**: Vitest with `@testing-library/react` and `jsdom`

---

## Commands

```powershell
# Run Vitest Formatter & Component Tests
npm test --prefix apps/web

# Run Vitest in Watch Mode for TDD
npx vitest run apps/web/tests/format.test.ts

# Type Checking
npx tsc --noEmit --project apps/web/tsconfig.json

# Linting
npm run lint --prefix apps/web

# Next.js Production Build
npm run build --prefix apps/web
```

---

## Project Structure

```
apps/web/
  lib/
    utils/
      format.ts                  → Comprehensive Indian currency, Lakh/Crore, signed, and percentage formatters
    formatters/
      currency.ts                → Re-export alias for modular compatibility
  components/
    dashboard/
      metric-card.tsx            → Atomic institutional metric card with skeleton state
      summary-metrics-grid.tsx    → 6-card responsive dashboard KPI ribbon
      metrics-skeleton.tsx       → Zero-CLS loading skeleton matching grid dimensions
      performance-metrics-grid.tsx → Updated / integrated with SummaryMetricsGrid
  tests/
    format.test.ts               → Unit tests for Indian grouping, Lakhs, Crores, negative values, and rounding
    metric-card.test.tsx         → Component tests verifying values, badges, and skeleton states
```

---

## Code Style & Conventions

- Functional React components with strict TypeScript prop interfaces.
- Tabular numerals (`tabular-nums`) and clean sans-serif typography on all numerical elements.
- Clean color hierarchy:
  - Positive P&L: `text-emerald-600 dark:text-emerald-400`
  - Negative P&L: `text-rose-600 dark:text-rose-400`
  - Neutral / Informational: `text-slate-900 dark:text-white`
  - Subtitles & Labels: `text-slate-500 dark:text-slate-400`

```tsx
// Example: Atomic MetricCard Component Pattern
interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: "positive" | "negative" | "neutral";
  icon?: LucideIcon;
  isLoading?: boolean;
  tooltip?: string;
}

export function MetricCard({ label, value, subValue, trend, icon: Icon, isLoading, tooltip }: MetricCardProps) {
  if (isLoading) return <MetricCardSkeleton />;
  return (
    <div 
      className="p-4 rounded-[4px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] space-y-1.5 transition-colors"
      title={tooltip}
    >
      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
        <span>{label}</span>
        {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
      </div>
      <div className={`text-xl font-bold tracking-tight tabular-nums ${
        trend === "positive" ? "text-emerald-600 dark:text-emerald-400" :
        trend === "negative" ? "text-rose-600 dark:text-rose-400" :
        "text-slate-900 dark:text-white"
      }`}>
        {value}
      </div>
      {subValue && <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{subValue}</p>}
    </div>
  );
}
```

---

## Testing Strategy

- **Test Framework**: `vitest` in `apps/web/tests/format.test.ts` and `apps/web/tests/metric-card.test.tsx`.
- **Test Scenarios**:
  1. **Currency Grouping**:
     - Standard Indian grouping: `150000` -> `₹1,50,000.00`.
     - Zero value: `0` -> `₹0.00`.
     - Negative numbers: `-150000` -> `-₹1,50,000.00`.
     - Decimal fractions: `12345.678` -> `₹12,345.68`.
  2. **Indian Denominations (Lakhs & Crores)**:
     - Exact Lakh threshold: `100000` -> `₹1.00 L`.
     - Multi-Lakh: `1550000` -> `₹15.50 L`.
     - Exact Crore threshold: `10000000` -> `₹1.00 Cr`.
     - Multi-Crore: `24500000` -> `₹2.45 Cr`.
     - Sub-Lakh threshold: `99999` -> `₹99,999.00` (does not format as 0.99 L).
     - Negative Crores & Lakhs: `-24000000` -> `-₹2.40 Cr`.
  3. **Signed Currency Formatting**:
     - Positive amounts explicitly receive `+` prefix: `+₹15,000.00`.
     - Negative amounts receive `-` prefix: `-₹5,000.00`.
     - Zero receives `₹0.00` without sign.
     - Signed compact mode: `+₹1.50 L` and `-₹2.40 Cr`.
  4. **Percentage Formatting**:
     - Standard: `57.1428` -> `57.14%`.
     - Signed positive: `57.1428` -> `+57.14%`.
     - Signed negative: `-12.5` -> `-12.50%`.
     - Zero: `0` -> `0.00%`.
  5. **Component Edge Cases**:
     - Skeleton rendering when `isLoading = true`.
     - Infinite profit factor rendering `∞ (Clean)`.
     - Return on capital rendering when `startingCapital > 0`.
     - Zero trades empty state rendering defaults without errors.

---

## Boundaries

- **Always do**:
  - Use `tabular-nums` on all rendered financial numbers and percentages to eliminate width jitter.
  - Follow Indian currency numbering format (`en-IN`) exclusively (not US thousands grouping).
  - Use semantic color classes (`text-emerald-600 dark:text-emerald-400` / `text-rose-600 dark:text-rose-400`).
  - Run `npm test` and `npm run build` before committing.
- **Ask first**:
  - Changing the layout or ordering of the 6 summary metric cards.
  - Introducing third-party UI component libraries (e.g. Radix, MUI) when lightweight Tailwind primitives suffice.
- **Never do**:
  - Never use generic AI yellow/amber rounded alert boxes or warning triangles.
  - Never format Indian currency with Western notation (e.g. `$100K` or `₹1.5M`).
  - Never hardcode currency strings without using the centralized `format.ts` utilities.

---

## Success Criteria

1. `format.ts` provides complete test-covered helpers: `formatCurrencyINR`, `formatIndianDenomination`, `formatSignedCurrency`, and `formatPercentage`.
2. `MetricCard` renders institutional-quality cards with labels, trend coloring, and skeleton states.
3. `SummaryMetricsGrid` displays all 6 core metrics responsively across mobile, tablet, and desktop.
4. All unit tests in `format.test.ts` and `metric-card.test.tsx` pass.
5. `npm run build --prefix apps/web` compiles with 0 errors and 0 type errors.
