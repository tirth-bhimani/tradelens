/**
 * TradeLens Forensic Tilt Autopsy & Cascade Sequencer
 * Data types and contracts for emotional spiral detection and circuit breaker simulation.
 */

export interface CascadeTradeNode {
  trade_id: string;
  symbol: string;
  entry_time: string; // ISO IST
  exit_time: string;  // ISO IST
  quantity: number;
  entry_price: number;
  exit_price: number;
  net_pnl: number;
  is_trigger: boolean;
  minutes_since_previous: number | null;
  size_inflation_ratio: number; // e.g. 1.0 = baseline, 2.0 = 2x lot size
  psychological_phase: "TRIGGER_LOSS" | "REACTION_TILT" | "DESPERATION_REVENGE" | "EXHAUSTION_BLOWUP";
  violation_summary: string;
}

export interface TiltCascadeEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  symbol_focus: string;
  total_cascade_loss_inr: number;
  total_trades_count: number;
  total_duration_minutes: number;
  trigger_loss_inr: number;
  subsequent_spiral_loss_inr: number;
  max_size_inflation: number;
  min_reentry_interval_minutes: number;
  trades: CascadeTradeNode[];
  counterfactual_circuit_breaker: {
    recommended_rule_type: string;
    recommended_param_name: string;
    recommended_param_value: number;
    rule_description: string;
    avoided_loss_inr: number;
    trades_prevented_count: number;
    simulated_net_pnl_inr: number;
  };
}

export interface TiltAutopsyOverview {
  total_cascades_detected: number;
  total_capital_drained_by_tilt_inr: number;
  avg_cascade_duration_minutes: number;
  potential_capital_recoverable_inr: number;
  cascades: TiltCascadeEvent[];
}

export const SAMPLE_TILT_CASCADES: TiltCascadeEvent[] = [
  {
    id: "cascade-2026-08-28-bnf",
    date: "2026-08-28",
    title: "BankNifty Expiry Spiral (4-Trade Revenge Chasing)",
    symbol_focus: "BANKNIFTY",
    total_cascade_loss_inr: 18450,
    total_trades_count: 4,
    total_duration_minutes: 38,
    trigger_loss_inr: 4500,
    subsequent_spiral_loss_inr: 13950,
    max_size_inflation: 2.5,
    min_reentry_interval_minutes: 3,
    counterfactual_circuit_breaker: {
      recommended_rule_type: "COOL_OFF_AFTER_LOSS",
      recommended_param_name: "cooldown_minutes",
      recommended_param_value: 20,
      rule_description: "Enforce a mandatory 20-minute trading pause immediately following any trade loss > ₹3,000.",
      avoided_loss_inr: 13950,
      trades_prevented_count: 3,
      simulated_net_pnl_inr: -4500,
    },
    trades: [
      {
        trade_id: "trd-bnf-01",
        symbol: "BANKNIFTY26AUG48500CE",
        entry_time: "2026-08-28T10:14:00+05:30",
        exit_time: "2026-08-28T10:26:00+05:30",
        quantity: 30, // 2 lots
        entry_price: 320.5,
        exit_price: 170.5,
        net_pnl: -4500,
        is_trigger: true,
        minutes_since_previous: null,
        size_inflation_ratio: 1.0,
        psychological_phase: "TRIGGER_LOSS",
        violation_summary: "Trigger Loss: Disciplined setup failed. Loss of -₹4,500 triggered emotional loss-aversion.",
      },
      {
        trade_id: "trd-bnf-02",
        symbol: "BANKNIFTY26AUG48400PE",
        entry_time: "2026-08-28T10:29:00+05:30",
        exit_time: "2026-08-28T10:38:00+05:30",
        quantity: 45, // 3 lots (1.5x)
        entry_price: 280.0,
        exit_price: 210.0,
        net_pnl: -3150,
        is_trigger: false,
        minutes_since_previous: 3,
        size_inflation_ratio: 1.5,
        psychological_phase: "REACTION_TILT",
        violation_summary: "Velocity Compression: Re-entered opposite direction only 3 minutes after exit with 1.5x size.",
      },
      {
        trade_id: "trd-bnf-03",
        symbol: "BANKNIFTY26AUG48300PE",
        entry_time: "2026-08-28T10:42:00+05:30",
        exit_time: "2026-08-28T10:55:00+05:30",
        quantity: 60, // 4 lots (2.0x)
        entry_price: 220.0,
        exit_price: 130.0,
        net_pnl: -5400,
        is_trigger: false,
        minutes_since_previous: 4,
        size_inflation_ratio: 2.0,
        psychological_phase: "DESPERATION_REVENGE",
        violation_summary: "Revenge Sizing: Averaged down into failing breakdown. Sizing doubled to make back earlier loss.",
      },
      {
        trade_id: "trd-bnf-04",
        symbol: "BANKNIFTY26AUG48200PE",
        entry_time: "2026-08-28T10:58:00+05:30",
        exit_time: "2026-08-28T11:04:00+05:30",
        quantity: 75, // 5 lots (2.5x)
        entry_price: 180.0,
        exit_price: 110.0,
        net_pnl: -5400,
        is_trigger: false,
        minutes_since_previous: 3,
        size_inflation_ratio: 2.5,
        psychological_phase: "EXHAUSTION_BLOWUP",
        violation_summary: "Final Blowup: Rapid-fire re-entry during market chop. Maximum capital damage reached.",
      },
    ],
  },
  {
    id: "cascade-2026-09-04-nifty",
    date: "2026-09-04",
    title: "Nifty Mid-day Chop Overtrading Sequence",
    symbol_focus: "NIFTY",
    total_cascade_loss_inr: 11200,
    total_trades_count: 3,
    total_duration_minutes: 27,
    trigger_loss_inr: 2800,
    subsequent_spiral_loss_inr: 8400,
    max_size_inflation: 1.8,
    min_reentry_interval_minutes: 5,
    counterfactual_circuit_breaker: {
      recommended_rule_type: "MAX_DAILY_LOSS_LIMIT",
      recommended_param_name: "max_daily_loss_inr",
      recommended_param_value: 3000,
      rule_description: "Hard stop for session once cumulative daily drawdown reaches ₹3,000.",
      avoided_loss_inr: 8400,
      trades_prevented_count: 2,
      simulated_net_pnl_inr: -2800,
    },
    trades: [
      {
        trade_id: "trd-nifty-01",
        symbol: "NIFTY26SEP24500CE",
        entry_time: "2026-09-04T12:10:00+05:30",
        exit_time: "2026-09-04T12:22:00+05:30",
        quantity: 50,
        entry_price: 140.0,
        exit_price: 84.0,
        net_pnl: -2800,
        is_trigger: true,
        minutes_since_previous: null,
        size_inflation_ratio: 1.0,
        psychological_phase: "TRIGGER_LOSS",
        violation_summary: "Trigger Loss: Breakout failed in mid-day low volume zone.",
      },
      {
        trade_id: "trd-nifty-02",
        symbol: "NIFTY26SEP24450PE",
        entry_time: "2026-09-04T12:27:00+05:30",
        exit_time: "2026-09-04T12:35:00+05:30",
        quantity: 75,
        entry_price: 120.0,
        exit_price: 72.0,
        net_pnl: -3600,
        is_trigger: false,
        minutes_since_previous: 5,
        size_inflation_ratio: 1.5,
        psychological_phase: "REACTION_TILT",
        violation_summary: "Overtrading during 11:30 - 13:00 dead zone with expanded lot sizing.",
      },
      {
        trade_id: "trd-nifty-03",
        symbol: "NIFTY26SEP24400CE",
        entry_time: "2026-09-04T12:41:00+05:30",
        exit_time: "2026-09-04T12:49:00+05:30",
        quantity: 90,
        entry_price: 110.0,
        exit_price: 56.6,
        net_pnl: -4800,
        is_trigger: false,
        minutes_since_previous: 6,
        size_inflation_ratio: 1.8,
        psychological_phase: "DESPERATION_REVENGE",
        violation_summary: "Desperation entry attempting to break even before European session open.",
      },
    ],
  },
];
