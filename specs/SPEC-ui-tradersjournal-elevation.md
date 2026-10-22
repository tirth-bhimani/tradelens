# Specification: TradeLens Institutional UI Elevation (tradersjournal.app & Beyond)

**Document Status:** Ready for Review & Implementation  
**Specification File:** `specs/SPEC-ui-tradersjournal-elevation.md`  
**Reference Analysis:** `https://tradersjournal.app` (Visual benchmarks & institutional trading terminal aesthetics)  
**Target Application:** `apps/web` (Next.js 14 App Router, Tailwind CSS, Lucide Icons, SVG Data Visualizations)

---

## 1. Executive Summary & Design Vision

TradeLens is designed as an institutional-grade behavioral trade journal and rule backtester for Indian markets (NSE/BSE, F&O, Equity, Intraday). While the backend architecture (statutory charge engines, 70/30 deterministic replay, FIFO matching) operates at institutional precision, the visual interface is being elevated to meet and surpass the high visual benchmarks of modern trading platforms like **`https://tradersjournal.app`**.

### Core Visual Principles
1. **Deep Obsidian Foundation (`#050814` / `#070b16`):**
   Replace generic gray backgrounds with deep, immersive obsidian dark surfaces paired with ultra-crisp hairline borders (`rgba(255, 255, 255, 0.08)` and `zinc-800`), creating immediate institutional focus.
2. **Tabular Numerals & Monospace Hierarchy (`IBM Plex Mono` / `font-mono tabular-nums`):**
   Monetary values (₹ INR), percentages, quantities, and timestamps render in monospaced tabular figures to eliminate layout jitter and provide Bloomberg/Terminal-level quantitative legibility.
3. **Floating Glass Island Navigation:**
   A sleek, modern top navigation bar with backdrop blur (`backdrop-blur-xl`), subtle rim highlights, route pill indicators, and an active market session status dot (`NSE / BSE 09:15 - 15:30 IST`).
4. **Institutional Metric Ribbons & Glowing Visualizations:**
   Cards feature high-contrast KPI metrics, micro-pill delta tags (`+₹48,520`, `+4.8% Edge`), and pure SVG equity curves with subtle glowing paths and gradient fills.
5. **Zero Generic AI Aesthetics:**
   Strict rejection of purple/indigo gradients, oversized bubbly radii, stock generic layouts, and distracting animations. Every visual element communicates financial edge and discipline.

---

## 2. Design System Tokens & Color Palette

### 2.1 Color Tokens

| Semantic Role | Dark Mode Token | Light Mode Token | Usage |
|---|---|---|---|
| **Background (Canvas)** | `#050814` (Obsidian) | `#f8fafc` (Slate 50) | Main page canvas |
| **Surface (Cards/Containers)** | `#090e1a` (Deep Slate) | `#ffffff` (White) | KPI cards, tables, drawers |
| **Surface Elevated** | `#0f172a` (Slate 900) | `#f1f5f9` (Slate 100) | Active pills, popovers, tooltips |
| **Border / Hairline** | `rgba(255, 255, 255, 0.08)` / `#1e293b` | `#e2e8f0` (Slate 200) | 1px clean gridlines and card edges |
| **Brand / Accent** | `#2b7fff` (Cobalt Electric) | `#155dfc` (Primary Blue) | Active tabs, primary CTAs, links |
| **Profit (Win / Edge)** | `#10b981` / `#34d399` (Emerald) | `#059669` (Dark Emerald) | Positive P&L, edge delta, win rate |
| **Loss (Drawdown / Leak)** | `#f43f5e` / `#ef4444` (Crimson) | `#dc2626` (Dark Red) | Negative P&L, behavioral leak, loss |
| **Warning / Overfit** | `#f59e0b` (Amber) | `#d97706` (Amber 600) | Overfit warning, low sample alerts |
| **Muted Text** | `#64748b` / `#94a3b8` | `#64748b` / `#475569` | Secondary captions, timestamps |

### 2.2 Typography Scale

- **Display UI Sans:** `Inter`, system `-apple-system`, `sans-serif`
- **Data & Numeric Monospace:** `IBM Plex Mono`, `ui-monospace`, `monospace`
- **Lining Figures:** `font-mono tabular-nums tracking-tight` applied to:
  - All currency amounts (`₹1,24,500.00`)
  - All percentages (`68.4%`)
  - Profit factors (`2.85`)
  - Dates and timestamps (`09:18:22 IST`)
  - Trade IDs (`#TRD-9042`)

---

## 3. Component Architecture & Transformations

### 3.1 Top Navigation Bar (`apps/web/components/dashboard/DashboardNav.tsx` & `layout.tsx`)
- **Structure:** Floating island / sticky glass bar with `backdrop-blur-xl bg-[#070b16]/85 border-b border-white/[0.08]`.
- **Active Route Highlighting:** Subtle rounded pill with cobalt accent indicator.
- **Market Status Chip:** Real-time pulse indicator showing `NSE / BSE 09:15 - 15:30 IST` with a blinking green status dot.
- **Trader Session Profile:** Compact avatar pill with user tier and quick logout button.
- **Mobile Responsive Drawer:** Clean slide-down / sheet menu for screen widths `< 768px`.

### 3.2 Performance Summary Grid (`apps/web/components/dashboard/summary-metrics-grid.tsx` & `metric-card.tsx`)
- **Card Styling:** Deep charcoal surfaces (`#090e1a`) with top hairline highlight and subtle hover border shift.
- **Metrics Presented:**
  1. Realized Net P&L (with RoC % and statutory charge debit subtext)
  2. Win Rate (with Win/Loss trade ratio and count)
  3. Profit Factor (with infinite factor handling for clean win streaks)
  4. Expectancy per Trade (with average win vs. loss comparison)
  5. Max Drawdown (with peak-to-trough capital % and recovery status)
  6. Streak Discipline (max consecutive wins vs. losses)
- **Formatting Switch:** 1-click toggle between full rupee notation (`₹48,520.50`) and institutional compact notation (`₹48.5K / ₹1.2L`).

### 3.3 Rule Lab Interface (`apps/web/components/rule-lab/`)
- **Interactive Rule Builder:**
  - Fast template selector pills with active blue rings.
  - Custom styled input range sliders with accent track and monospace value readout.
  - Plain English AI prompt bar with inline translation feedback badge.
- **Comparison Metrics Card:**
  - Side-by-side Before (historical baseline) vs. After (simulated overlay).
  - High-contrast delta pills (`+₹18,400`, `+5.2% Win Rate`, `₹6,200 Drawdown Saved`).
- **Dual Equity Curve Chart (`dual-equity-chart.tsx`):**
  - Actual baseline curve: subtle slate/gray line (`#64748b`).
  - Simulated rule curve: glowing vibrant emerald curve with SVG filter drop-shadow and subtle gradient fill.
  - Smooth interactive crosshairs with dark popover displaying timestamp, actual equity, simulated equity, and cumulative edge.
- **70/30 Split Card (`split-metrics-card.tsx`):**
  - Train (70%) vs. Test (30%) out-of-sample comparison matrix.
  - Overfit Risk alert badge with statistical degradation diagnosis.
- **Skipped Trades Ledger (`skipped-trades-table.tsx`):**
  - Summary ribbon displaying total avoided losses vs. sacrificed wins.
  - Filter tabs: All Skipped, Avoided Losses (Green), Sacrificed Wins (Amber).

### 3.4 Dashboard Visualizations (`chart-container.tsx` & subcomponents)
- **Chart Selection Pills:** Segmented control for switching between Equity Curve, Drawdown Waterfall, Calendar Heatmap, and Hourly Distribution.
- **Interactive Tooltips:** Monospace dark cards with 1px border.

---

## 4. Responsive & Accessibility Guarantees

- **Responsive Breakpoints:** Fully validated across 320px (mobile), 768px (tablet), 1024px (desktop), 1440px (wide monitor).
- **Accessibility:**
  - WCAG 2.1 AA compliant color contrast (minimum 4.5:1 text-to-background ratio).
  - All interactive buttons and inputs have keyboard navigation (`tabIndex`, `onKeyDown`, visible focus rings).
  - No information conveyed by color alone (always paired with signs `+`/`-`, icons, or explicit labels).
- **Performance:**
  - Zero heavy external UI libraries (pure Tailwind CSS and SVG).
  - 100% server-side rendering friendly with instant hydration and anti-FOUC theme preservation.

---

## 5. Verification Plan

1. **Vitest Unit & Component Tests:**
   Run full frontend test suite (`npm test --prefix apps/web`) to verify all 112+ tests pass with zero regressions.
2. **Next.js Production Build:**
   Execute `npm run build --prefix apps/web` to guarantee clean typecheck and zero build errors across all 13 routes.
3. **Responsive Visual Verification:**
   Verify rendered layouts at 320px, 768px, and 1280px breakpoints.
