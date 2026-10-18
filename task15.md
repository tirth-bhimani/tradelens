# Spec: Task 15 - P&L Breakdowns, Calendar Heatmap & Filterable Trade Log Table

## Assumptions & Design Decisions

1. **Design System & Aesthetics**:
   - 100% institutional trading aesthetic (Zerodha Kite / Bloomberg / Koyfin style): hairline borders (`border-slate-200 dark:border-slate-800`), deep dark background `#0d131f` / `#0c1017`, Inter sans typography with `tabular-nums` on all financial figures.
   - Strictly zero generic AI pastel yellow/amber alert pills or neon thick borders.
   - Heatmap coloring: subtle gradient tiers of emerald for profits (`bg-emerald-500/15` up to `bg-emerald-500/80`) and rose for losses (`bg-rose-500/15` up to `bg-rose-500/80`), with neutral slate for no trades or non-trading market holidays.
2. **Indian Market Session Context**:
   - Regular trading hours: `09:15 - 15:30 IST` (NSE/BSE).
   - Hourly breakdown windows:
     - Opening Window: `09:15 - 10:00`
     - Morning Session: `10:00 - 11:30`
     - Midday / Lunch: `11:30 - 13:30`
     - Afternoon / Expiry Push: `13:30 - 14:45`
     - Closing Bell: `14:45 - 15:30`
3. **Psychological & Execution Tag Taxonomy**:
   - Pre-seeded tags:
     - Positive / Disciplined: `Rule Followed`, `Planned Setup`, `Good Risk/Reward`
     - Behavioral Leaks: `FOMO`, `Revenge Trade`, `Overtrading`, `Premature Exit`, `Held Loser`, `Size Creep`
   - Trader Notes: Free-text manual annotations per trade for journaling thoughts and lessons.
4. **Interactive Coupling**:
   - Clicking any active trading day on the Calendar Heatmap filters the Trade Log Table to that day's trades with one click.
   - Reset button allows returning to all trades instantly.

---

## Objective

Build comprehensive trading diagnostics, monthly performance visualization, and a filterable trade journal:
1. **Calendar Heatmap (`calendar-heatmap.tsx`)**:
   - Monthly grid showing each calendar day with Net P&L color shading.
   - Month navigation (`< Prev Month`, `Next Month >`).
   - Hover card / tooltip displaying: Date, Net P&L, Trade Count, Winning Trades, and Day Win Rate.
   - Click-to-filter interaction that syncs with the trade log table.
2. **P&L Breakdown Visualizer (`time-breakdown-chart.tsx`)**:
   - P&L by Hour of Day bar chart highlighting most profitable and most costly execution windows.
   - P&L by Day of Week (Monday to Friday) distribution.
   - Segment & Expiry comparison (Equity vs F&O, Expiry day vs Non-expiry).
3. **Filterable Trade Log Table (`trade-table.tsx` & `/trades` page)**:
   - Full round-trip trade ledger with columns: Symbol, Segment, Entry Time, Exit Time, Quantity, Buy Price, Sell Price, Gross P&L, Charges, Net P&L, Return %, and Tags.
   - Instant search by symbol / instrument name.
   - Outcome tabs: `All`, `Winners`, `Losers`.
   - Multi-tag filter (e.g. filter by `FOMO` or `Revenge Trade`).
   - Interactive tag selector and notes editor per trade.
4. **Zero-CLS Loading & Empty States**:
   - Skeleton states for calendar and table rows.

---

## Tech Stack

- **Framework**: Next.js 14+ (App Router, Server & Client Components)
- **Language / Typing**: TypeScript 5.0+ (`strict: true`)
- **Styling**: Tailwind CSS with dark mode support (`dark:bg-[#0d131f]`, `dark:border-slate-800`)
- **Formatters**: TradeLens central formatting suite ([`apps/web/lib/utils/format.ts`](file:///D:/resume/sdd/apps/web/lib/utils/format.ts))
- **Icons**: `lucide-react`
- **Testing**: Vitest with `@testing-library/react` and Node/SSR assertions

---

## Commands

```powershell
# Run Vitest tests for trade table and breakdowns
npx vitest run apps/web/tests/trade-table.test.ts

# Run all frontend tests
npm test --prefix apps/web

# TypeScript type checking
npx tsc --noEmit --project apps/web/tsconfig.json

# Production Next.js build
npm run build --prefix apps/web
```

---

## Project Structure

```
apps/web/
  lib/
    trades/
      trade-filters.ts           → Filtering, searching, sorting, and tag management logic
      breakdown-math.ts          → Hourly, weekday, and segment aggregation math
  components/
    dashboard/
      calendar-heatmap.tsx       → Monthly calendar heatmap with day-click filter
      time-breakdown-chart.tsx   → Hourly and day-of-week P&L breakdown bars
    trades/
      trade-table.tsx            → Searchable, sortable round-trip trade table
      trade-tag-pill.tsx         → Psychological tag badge component
      trade-detail-drawer.tsx    → Slide-over drawer for trade notes and tag editing
  app/
    (dashboard)/
      trades/
        page.tsx                 → Dedicated /trades ledger page
  tests/
    trade-table.test.ts          → Unit tests for sorting, filtering, and tag mutation logic
    breakdown-charts.test.tsx    → Component tests for calendar heatmap and breakdown bars
```

---

## Code Style & Conventions

- Strict TypeScript interfaces for RoundTripTrade, CalendarDay, and Tag:
```tsx
export type PsychologicalTag =
  | "Rule Followed"
  | "Planned Setup"
  | "Good Risk/Reward"
  | "FOMO"
  | "Revenge Trade"
  | "Overtrading"
  | "Premature Exit"
  | "Held Loser"
  | "Size Creep";

export interface RoundTripTradeView {
  id: string;
  symbol: string;
  segment: "EQUITY" | "FNO" | "COMMODITY" | "CURRENCY";
  entryTime: string;
  exitTime: string;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  grossPnl: number;
  charges: number;
  netPnl: number;
  returnPct: number;
  tags: PsychologicalTag[];
  notes?: string;
}
```
- Standard Indian currency formatting with tabular numerals on all amounts.
- Semantic color coding: `text-emerald-600 dark:text-emerald-400` for profits, `text-rose-600 dark:text-rose-400` for losses.

---

## Testing Strategy

- **Test Framework**: `vitest` in `apps/web/tests/trade-table.test.ts` and `apps/web/tests/breakdown-charts.test.tsx`.
- **Test Scenarios**:
  1. **Calendar Date Math**:
     - Correct day-of-week alignment for month starts (e.g. 1st of month starting on Wednesday).
     - Accurate aggregation of daily net P&L and win rate.
     - Color tier calculation based on P&L magnitude.
  2. **Hourly & Weekday Breakdown Math**:
     - Correct binning of trade entry timestamps into IST market session buckets.
     - Profit and loss aggregations per hour and per weekday.
  3. **Trade Table Search & Filters**:
     - Keyword search matches symbol case-insensitively (e.g. "rel" matches "RELIANCE").
     - Outcome filter correctly isolates winners (`netPnl > 0`), losers (`netPnl < 0`), or all.
     - Tag filter returns only trades tagged with selected psychological labels.
     - Sorting by date, net P&L, and return percentage in ascending/descending order.
  4. **Component Rendering & Interactivity**:
     - Clicking a calendar day updates selected date filter.
     - Adding/removing tags updates trade state without layout breakage.

---

## Boundaries

- **Always do**:
  - Format all numbers with `formatSignedCurrency` or `formatCurrencyINR` (Indian locale).
  - Use `tabular-nums` on all dates, quantities, prices, and P&L figures.
  - Follow Indian market timings (`09:15 - 15:30 IST`).
  - Verify `npm test` and `npm run build` pass before completing.
- **Ask first**:
  - Introducing modal popups when inline tag editors or clean slide-over drawers provide a smoother trading experience.
- **Never do**:
  - Never use generic AI yellow/amber rounded alert boxes or warning triangles.
  - Never allow table sorting to crash on undefined or zero values.
  - Never hardcode timezone assumptions without checking IST session times.

---

## Success Criteria

1. `calendar-heatmap.tsx` renders all days of the selected month with accurate P&L color shading and hover cards.
2. `time-breakdown-chart.tsx` plots hourly and weekday P&L bars highlighting profitable trading windows.
3. `trade-table.tsx` provides instant search, outcome filtering, column sorting, and psychological tag management.
4. Dedicated `/trades` route displays the journal ledger responsively with export and filter controls.
5. All tests in `trade-table.test.ts` and `breakdown-charts.test.tsx` pass.
6. `npm run build --prefix apps/web` compiles with 0 errors and 0 type errors.

---

## Open Questions

1. **Tag & Notes Persistence**:
   - Should tags and notes be stored in the trade record's `metadata` JSONB field in Supabase, or should we support local optimistic state with auto-save?
2. **Dashboard Placement**:
   - Would you like a condensed Calendar Heatmap and Hourly Breakdown card on the main `/dashboard` page in addition to the full ledger on `/trades`?
