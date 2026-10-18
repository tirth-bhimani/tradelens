# Spec: Task 18 - Frontend AI Insight Cards & Leak Display

## Assumptions I'm Making

1. **Dedicated `/insights` Tab & Clean Dashboard Mandate**:
   - In accordance with the strict UX requirement, the main Dashboard overview ([`apps/web/app/(dashboard)/dashboard/page.tsx`](file:///D:/resume/sdd/apps/web/app/%28dashboard%29/dashboard/page.tsx)) remains compact, concise, and non-scrollable. It contains only high-level trading metrics and execution summaries.
   - All detailed AI behavioral execution audit cards, diagnostic leak breakdowns, and rule recommendations are housed exclusively on the dedicated `/insights` tab ([`apps/web/app/(dashboard)/insights/page.tsx`](file:///D:/resume/sdd/apps/web/app/%28dashboard%29/insights/page.tsx)).
2. **Institutional Terminal Design Language (Zerodha Kite / Bloomberg Aesthetic)**:
   - **Zero AI-Gimmicks**: No glowing badges, no saturated `HIGH LEAK` neon pill boxes, no gradient borders, and no `Sparkles` novelty icons.
   - Hairline borders (`border-slate-200 dark:border-slate-800`), clean flat dark backgrounds (`dark:bg-[#0c1017]`, `dark:bg-[#0d131f]`), subtle neutral typography, and tabular numerals.
3. **Small Sample Warnings (< 30 trades)**:
   - When an identified leak or dataset has fewer than 30 analyzed trades, a subtle, muted inline text indicator (`Small Sample (n trades) • Confidence requires ≥30 trades`) is displayed without neon alert banners.
4. **One-Click 'Test This Rule' Deep Linking**:
   - Every suggested rule recommendation features an actionable CTA linking to `/rule-lab` with pre-filled parameters:
     `href={`/rule-lab?prefillRule=${encodeURIComponent(rule.rule_id)}&cooldown_minutes=...`}`
   - The Rule Lab displays an institutional `RuleLabPrefillBanner` with pre-populated parameters ready for replay backtesting.
5. **Data Source & Graceful Fallback**:
   - The components consume structured insights matching the `InsightReport` schema from Task 16 & 17 (`top_leaks`, `suggested_rules`, `discipline_score`, `discipline_grade`, `educational_disclaimer`, `grounding_verified`).
   - If no backend server is reachable, rich deterministic default mock data ensures zero-breakage rendering for development and offline testing.

---

## Objective

Build institutional-grade frontend AI behavioral insight cards and a high-visibility Top Leaks banner in Next.js 15:
1. **`TopLeaksBanner`**: Executive summary strip highlighting the trader's #1 primary capital leak, discipline grade badge (`A+` to `F`), and overall behavioral diagnosis.
2. **`InsightCard`**: Responsive grid of top 3 behavioral leak cards displaying:
   - Severity pill (`CRITICAL`, `HIGH`, `MODERATE`, `LOW`).
   - Plain-English diagnostic explanation.
   - Exact numerical evidence with rupee formatting and trade count badges.
   - Small sample warning indicator when trades count < 30.
   - One-click **"Test this rule"** button that deep links into `/rule-lab` with pre-filled parameters.
3. **`RuleLabPage` Pre-population**:
   - Update `RuleLabPage` to parse incoming query parameters (`ruleId`, `params`) and present a pre-filled confirmation card ready for replay backtesting.
4. **Dashboard Embedding & Dedicated `/insights` View**:
   - Integrate the insight cards onto `/dashboard` and provide `/insights` for full audit reviews.

---

## Tech Stack

- **Framework**: Next.js 15 (App Router), React 19
- **Styling**: Tailwind CSS with dark mode hairline borders (`border-slate-800`)
- **Icons**: `lucide-react`
- **Formatting**: `@/lib/utils/format` (`formatIndianCurrency`, `formatPercentage`)
- **Testing**: `vitest` with `@testing-library/react`
- **Typing**: TypeScript strict mode

---

## Commands

```powershell
# Run Task 18 unit and component tests
npm run test --prefix apps/web -- tests/insights.test.ts

# Run all frontend tests
npm run test --prefix apps/web

# Check linting
npm run lint --prefix apps/web

# Build frontend
npm run build --prefix apps/web
```

---

## Project Structure

```
apps/web/
  app/(dashboard)/
    dashboard/page.tsx               → Lean executive dashboard (non-scrollable, zero duplicate widgets)
    insights/page.tsx                → Dedicated behavioral execution audit workspace
    rule-lab/page.tsx                → Updated to parse prefill query params from deep links
  components/
    insights/
      top-leaks-banner.tsx           → 3-column institutional metric ribbon (Discipline, Capital Drag, Audit Standard)
      insight-card.tsx               → Risk classification cards with hairline borders, tabular evidence & CTA
      sample-size-warning.tsx        → Subtle muted inline indicator for <30 trade datasets
      rule-lab-prefill-banner.tsx    → Clean institutional pre-fill configuration banner in Rule Lab
  tests/
    insights.test.tsx                → Unit tests for sample warnings, deep link query generation, and rendering
```

---

## Code Style & Conventions

- Server & Client Component separation with clear `"use client"` directives where interactive state/navigation is used.
- Zero layout shift (zero CLS) with strict aspect ratios and min-heights.
- Clean deep linking using standard URLSearchParams:

```tsx
// Example: One-Click 'Test This Rule' Deep Link
<Link
  href={`/rule-lab?prefillRule=${encodeURIComponent(rule.rule_id)}&cooldown_minutes=${rule.recommended_parameters.cooldown_minutes || 15}`}
  className="w-full py-1.5 px-3 rounded-[3px] bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center justify-between transition-colors"
>
  <span>Test This Rule in Rule Lab</span>
  <ArrowRight className="w-3 h-3 text-slate-400 dark:text-slate-500" />
</Link>
```

---

## Testing Strategy

- **Test Suite**: `apps/web/tests/insights.test.tsx`
- **Test Scenarios**:
  1. `renders_top_leaks_with_evidence_and_trade_counts`: Asserts leak titles, numerical loss values, and trade counts render accurately.
  2. `displays_small_sample_warning_when_trades_under_30`: Confirms warning indicator appears when trade count is <30, and is hidden when >=30.
  3. `generates_correct_rule_lab_deep_link`: Verifies the deep link URL has properly encoded rule IDs and parameter payloads.
  4. `rule_lab_parses_prefill_parameters`: Tests that Rule Lab accepts and populates rule parameters from query strings.
  5. `renders_grounding_verified_badge`: Asserts anti-hallucination verification badge is displayed.

---

## Boundaries

- **Always do**:
  - Keep main dashboard lean, fast, and non-scrollable.
  - House behavioral leak cards exclusively on `/insights`.
  - Show subtle small sample warnings for datasets under 30 trades.
  - Keep styling strictly adhering to the Zerodha/Kite dark-mode institutional aesthetic.
  - Ensure deep links to Rule Lab are clean and testable with mock/URL parameters.
  - Run `npm run test` and `npm run lint` before completing.
- **Ask first**:
  - Adding external charting libraries or heavyweight dependencies.
  - Changing the rule catalog schema contracts.
- **Never do**:
  - Never use generic AI yellowish/glowing cards or novelty icons (`Sparkles`).
  - Never put bloated AI widgets or duplicate heatmaps on the main dashboard.
  - Never allow broken deep links that lead to blank forms in the Rule Lab.

---

## Success Criteria

1. Dedicated `/insights` page displays the comprehensive audit report, 3-column metric ribbon, and compliance disclaimer.
2. Main dashboard remains clean, non-scrollable, and free of AI banners or duplicate widgets.
3. Top leaks displayed as institutional risk assessment cards with hairline borders, numerical evidence, and trade counts.
4. Datasets with <30 trades display the subtle inline small sample warning.
5. Clicking **'Test this rule'** deep links into Rule Lab with pre-populated rule parameters.
6. All tests in `apps/web/tests/insights.test.tsx` pass (98/98 vitest total), and `npm run lint` is 100% clean.

---

## Open Questions

- None. The backend schema (`InsightReport`, `LeakDiagnosis`, `SuggestedRuleRecommendation`) is fully tested and verified from Tasks 16 & 17.
