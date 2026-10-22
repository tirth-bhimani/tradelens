# Specification: Forensic Tilt Autopsy & Cascade Sequencer

**Document Status:** Approved for Implementation  
**Specification File:** `specs/SPEC-tilt-autopsy-cascade-sequencer.md`  
**Market Benchmark:** Distinct from passive accounting journals (Tradervue, TraderSync) and high-friction manual tracking (Edgewonk).  
**Target Module:** `apps/web/lib/tilt/` & `apps/web/components/tilt/` and route `apps/web/app/(dashboard)/tilt-autopsy/page.tsx`

---

## 1. Problem Statement & Market Opportunity

### 1.1 The Industry Dilemma
Most trading journals fail day traders for two fundamental reasons:
1. **Passive Accounting Trap:** Tradervue and TraderSync act as historical calculators (win rates, calendar heatmaps, P&L curves) without diagnosing *why* blowups happen or how to stop them.
2. **Homework & Shame Fatigue:** Edgewonk and traditional spreadsheet templates require manual emotion tagging, mood emojis, and post-trade surveys. When a trader spirals into revenge trading (taking 5-10 rapid red trades), manually cataloging the catastrophe is emotionally repulsive, leading traders to abandon journaling after 3-5 days ("Graveyard of Spreadsheets").

### 1.2 The Breakthrough: Automated Forensic Tilt Autopsy
TradeLens introduces the **Forensic Tilt Autopsy & Cascade Sequencer**:
An automated engine that parses execution timestamps, P&L, and sizing directly from broker trades to reconstruct emotional spirals without requiring any manual tagging.

---

## 2. Quantitative Detection Engine (`lib/tilt/detector.ts`)

A **Tilt Cascade** is formally defined as an uninterrupted sequence of trades exhibiting the following quantitative signatures:
1. **Trigger Loss Trade ($T_0$):** A losing trade with net loss $\le -\text{threshold}$ (or 1.5x average loss).
2. **Velocity Compression ($V_c$):** The time gap between $T_0$ exit and $T_1$ entry is compressed ($\le 20$ minutes) compared to the trader's median setup interval ($\sim 45\text{--}60$ minutes).
3. **Position Size Inflation / Revenge Sizing ($S_i$):** Capital committed or quantity spikes by $\ge 1.3\text{x}$ to "make the loss back."
4. **Contagion Run ($T_1 \to T_n$):** Rapid-fire trades occurring during emotional flooding until the session terminates or capital is exhausted.

### Output Metrics per Cascade Event:
- `triggerTrade`: Symbol, timestamp, entry/exit, loss amount.
- `cascadeTrades`: Array of subsequent trades in the emotional spiral.
- `totalDurationMinutes`: Elapsed time from trigger entry to final exit.
- `totalCascadeLossInr`: Total net P&L damage incurred during the spiral.
- `maxVelocityIntervalMinutes`: Shortest time gap between trades.
- `counterfactualSavingsInr`: Capital preserved if a mandatory circuit-breaker rule was applied after $T_0$.
- `recommendedRule`: The exact rule (`COOL_OFF_AFTER_LOSS` or `MAX_DAILY_LOSS_LIMIT`) with bound parameters to prevent future spirals.

---

## 3. UI/UX Architecture (`components/tilt/`)

1. **Cascade Event Selector:**
   - Tabs / dropdown of identified tilt events across historical data (e.g. *"Aug 28 • BankNifty Revenge Spiral (-₹18,400 in 38m)"*).
2. **Interactive Cascade Timeline:**
   - Visual step-by-step chronology ($T_0 \to T_1 \to T_2 \to T_3$) displaying time elapsed, position sizing spike, emotional velocity indicator, and cumulative loss waterfall.
3. **Counterfactual Circuit Breaker Card:**
   - Compares the actual cascade outcome against the rule-enforced outcome.
   - Highlights: **Avoided Loss (₹)**, **Trades Prevented**, and **Discipline Edge**.
4. **1-Click Rule Lab Integration:**
   - Direct button: *"Backtest Circuit Breaker in Rule Lab"*, which routes to `/rule-lab?prefillRule=COOL_OFF_AFTER_LOSS&cooldown_minutes=20` so the trader can instantly verify the fix across all trades.

---

## 4. Verification & Testing Plan

1. **Vitest Unit Tests (`apps/web/tests/tilt-autopsy.test.tsx`):**
   - Test cascade detection on realistic multi-trade sequences.
   - Verify calculation of velocity compression and risk inflation.
   - Verify counterfactual savings calculations.
2. **Next.js Production Build:**
   - Validate full compilation with `npm run build --prefix apps/web`.
