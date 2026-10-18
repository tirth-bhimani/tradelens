# SPEC-task18: Frontend AI Insight Cards & Leak Display

- **Module**: `apps/web/components/insights/`, `apps/web/app/(dashboard)/insights/`
- **Status**: Draft / Ready for Review
- **Owner**: TradeLens Frontend Team
- **Dependencies**: Task 16 (`app/ai/schemas.py`), Task 17 (`app/ai/grounding.py`, `app/ai/cache.py`)
- **Downstream**: Phase 7 (Rule Lab & Deterministic Backtester)

---

## 1. Problem Statement

Traders who review their journal often struggle to translate raw metrics (like win rate or profit factor) into actionable behavioral changes. While Tasks 16 and 17 created the AI diagnosis engine, grounding validator, and caching layer, traders need an intuitive, institutional UI interface to:
1. Quickly absorb their top behavioral leaks without cognitive overload.
2. Verify the exact numerical evidence and trade count behind each diagnosis.
3. Be warned when statistical sample size is insufficient (<30 trades).
4. Seamlessly transition from diagnosis to action with a one-click **"Test this rule"** deep link into the Rule Lab.

---

## 2. Component Architecture

```
┌───────────────────────────────────────────────────────────────────────────┐
│                       TopLeaksBanner Component                            │
│  Discipline Grade: [ C ] (68/100)  •  Grounding: [ Verified ✓ ]            │
│  Primary Capital Leak: Impulsive Re-entry Tilt Following Losses            │
│  Diagnosis: Re-entering hastily after losses caused ₹12,450 drawdown       │
└───────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                    InsightCard Grid (Top 3 Leaks)                         │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌───────────┐ │
│  │ Leak 1: Re-entry Tilt   │  │ Leak 2: Overtrading     │  │ Leak 3... │ │
│  │ Severity: [ HIGH ]      │  │ Severity: [ MODERATE ]  │  │           │ │
│  │ Evidence: 5 trades,     │  │ Evidence: 3 days with   │  │           │ │
│  │ ₹8,500 avoidable loss   │  │ >10 trades, ₹4,200 loss │  │           │ │
│  │ [! Small Sample (<30)]  │  │                         │  │           │ │
│  │ ───────────────         │  │ ───────────────         │  │           │ │
│  │ Suggested Rule:         │  │ Suggested Rule:         │  │           │ │
│  │ 15m Cooldown Window     │  │ Max 5 Trades Daily      │  │           │ │
│  │ [ Test this rule → ]    │  │ [ Test this rule → ]    │  │           │ │
│  └────────────┬────────────┘  └───────────┬─────────────┘  └───────────┘ │
└───────────────┼───────────────────────────┼───────────────────────────────┘
                │                           │
                └─────────────┬─────────────┘
                              ▼
           Navigates to `/rule-lab?prefillRule=...`
        (Pre-populates Backtester with Guardrail Rules)
```

---

## 3. Detailed Specifications

### 3.1. `TopLeaksBanner` Component (`components/insights/top-leaks-banner.tsx`)
- Displays overall qualitative discipline grade (`A+` to `F`) with institutional colored badge.
- Displays quantitative score ($0$ to $100$).
- Displays anti-hallucination verification badge (`Grounding Verified ✓`).
- Primary callout for the #1 capital leak with net financial impact in Indian Rupees (`-₹12,450.00`).

### 3.2. `InsightCard` Component (`components/insights/insight-card.tsx`)
- Clean hairline card (`border-slate-200 dark:border-slate-800`).
- Leak title & severity badge (`CRITICAL`, `HIGH`, `MODERATE`, `LOW`).
- Plain-English diagnostic explanation.
- Quantitative evidence block with trade count badge (e.g. `5 Trades Involved`).
- Small sample warning banner if `trade_count < 30`.
- Rule proposal section with canonical rule title and rationalization.
- Action button: **"Test this rule in Rule Lab →"** deep linking to `/rule-lab?ruleId=...&params=...`.

### 3.3. Rule Lab Deep-Link Pre-population (`app/(dashboard)/rule-lab/page.tsx`)
- Reads query parameters (`prefillRule`, `cooldown_minutes`, `max_trades`, `loss_limit_pct`).
- If prefill parameters exist, highlights a **"Configured from AI Insight"** action bar allowing immediate replay simulation.

---

## 4. Acceptance Criteria

1. Top 3 leaks displayed as high-visibility cards on the dashboard and `/insights`.
2. Each card shows the numeric evidence, trade count analyzed, and suggested rule.
3. Small sample warnings shown when leak or dataset is based on fewer than 30 trades.
4. Clicking 'Test this rule' deep links into the Rule Lab with pre-populated rule configuration.
5. 100% tests passing in `npm run test` with zero ESLint warnings.
