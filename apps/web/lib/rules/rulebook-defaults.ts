import type { SavedRule } from "./adherence-types";

export const DEFAULT_SAMPLE_RULES: SavedRule[] = [
  {
    id: "rule-sample-01",
    rule_type: "COOL_OFF_AFTER_LOSS",
    rule_payload: { cooldown_minutes: 20, trigger_loss_inr: 2000 },
    natural_language_text: "Enforce a mandatory 20-minute pause after any loss > ₹2,000 to eliminate revenge spirals.",
    is_active: true,
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: "rule-sample-02",
    rule_type: "MAX_TRADES_PER_DAY",
    rule_payload: { max_trades: 4 },
    natural_language_text: "Cap daily execution at 4 high-conviction trades to avoid churn and statutory drag.",
    is_active: true,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: "rule-sample-03",
    rule_type: "DAILY_LOSS_CUTOFF",
    rule_payload: { max_loss: 5000 },
    natural_language_text: "Stop trading for the day if net cumulative drawdown reaches -₹5,000.",
    is_active: true,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: "rule-sample-04",
    rule_type: "MAX_POSITION_SIZE",
    rule_payload: { max_quantity: 100 },
    natural_language_text: "Cap exposure to a maximum of 2 lots (100 qty NIFTY) to control position variance.",
    is_active: false,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];
