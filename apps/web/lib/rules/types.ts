/**
 * TradeLens Rule Lab Types, Catalog Definitions & Client API Helpers (Task 22).
 */

export type RuleType =
  | "COOL_OFF_AFTER_LOSS"
  | "MAX_CONSECUTIVE_LOSSES"
  | "DAILY_LOSS_LIMIT"
  | "MAX_DAILY_TRADES_LIMIT"
  | "TIME_OF_DAY_CUTOFF"
  | "MAX_POSITION_SIZE"
  | "SKIP_INSTRUMENT_TYPE"
  | "NO_TRADING_ON_EXPIRY_DAY"
  | "COMPOSITE_RULE";

export interface CatalogRuleDefinition {
  type: RuleType;
  title: string;
  category: "Pacing & Tilt" | "Capital Protection" | "Timing & Selection" | "Position Sizing";
  description: string;
  defaultPayload: Record<string, any>;
}

export const CATALOG_RULE_DEFINITIONS: CatalogRuleDefinition[] = [
  {
    type: "COOL_OFF_AFTER_LOSS",
    title: "Post-Loss Cooldown Pause",
    category: "Pacing & Tilt",
    description: "Enforces a mandatory pause window after taking a losing trade to prevent revenge entries.",
    defaultPayload: {
      rule_type: "COOL_OFF_AFTER_LOSS",
      cooldown_minutes: 15,
      trigger_loss_inr: 1000,
      max_consecutive_losses: 1,
    },
  },
  {
    type: "MAX_CONSECUTIVE_LOSSES",
    title: "Loss Streak Circuit Breaker",
    category: "Pacing & Tilt",
    description: "Halts trading for the day or imposes a cooldown after reaching a streak of consecutive losing trades.",
    defaultPayload: {
      rule_type: "MAX_CONSECUTIVE_LOSSES",
      consecutive_losses: 3,
      action: "HALT_FOR_DAY",
    },
  },
  {
    type: "DAILY_LOSS_LIMIT",
    title: "Daily Max Realized Loss Cap",
    category: "Capital Protection",
    description: "Halts all trading for the session when daily realized drawdown hits a rupee or percentage threshold.",
    defaultPayload: {
      rule_type: "DAILY_LOSS_LIMIT",
      max_loss_inr: 5000,
      action: "HALT_FOR_DAY",
    },
  },
  {
    type: "MAX_DAILY_TRADES_LIMIT",
    title: "Session Max Trades Cap",
    category: "Pacing & Tilt",
    description: "Limits total round-trip trades permitted per day to curb overtrading and broker commission drag.",
    defaultPayload: {
      rule_type: "MAX_DAILY_TRADES_LIMIT",
      max_trades: 5,
      action: "HALT_FOR_DAY",
    },
  },
  {
    type: "TIME_OF_DAY_CUTOFF",
    title: "Allowed Trading Hours Window",
    category: "Timing & Selection",
    description: "Restricts trade entries to allowed session windows and optionally avoids midday lunch chop (11:30 - 13:00).",
    defaultPayload: {
      rule_type: "TIME_OF_DAY_CUTOFF",
      allowed_start_time: "09:30",
      allowed_end_time: "15:00",
      restricted_lunch_break: true,
    },
  },
  {
    type: "MAX_POSITION_SIZE",
    title: "Position Size & Lot Exposure Cap",
    category: "Position Sizing",
    description: "Restricts maximum shares, lots, or capital allocation per trade to protect against oversized bets.",
    defaultPayload: {
      rule_type: "MAX_POSITION_SIZE",
      max_quantity: 100,
      max_capital_per_trade_inr: 50000,
      segment: "ALL",
    },
  },
  {
    type: "SKIP_INSTRUMENT_TYPE",
    title: "Disallowed Instrument Filter",
    category: "Timing & Selection",
    description: "Disallows execution of historically unprofitable or high-risk products (e.g. Out-of-the-money Options Buying).",
    defaultPayload: {
      rule_type: "SKIP_INSTRUMENT_TYPE",
      disallowed_types: ["OPTIONS_BUY"],
    },
  },
  {
    type: "NO_TRADING_ON_EXPIRY_DAY",
    title: "Expiry Session Gamma Shield",
    category: "Capital Protection",
    description: "Halts or caps lot exposure on contract expiry days (e.g. NIFTY Thursdays) to prevent high-theta wipeouts.",
    defaultPayload: {
      rule_type: "NO_TRADING_ON_EXPIRY_DAY",
      action: "HALT_FOR_DAY",
      affected_indices: ["NIFTY"],
    },
  },
  {
    type: "COMPOSITE_RULE",
    title: "Multi-Guardrail Composite Strategy",
    category: "Pacing & Tilt",
    description: "Combines multiple behavioral guardrails into an integrated risk policy (e.g. Cooldown Pause + Session Trade Limit).",
    defaultPayload: {
      rule_type: "COMPOSITE_RULE",
      logic_operator: "AND",
      subrules: [
        {
          rule_type: "COOL_OFF_AFTER_LOSS",
          cooldown_minutes: 15,
          max_consecutive_losses: 1,
        },
        {
          rule_type: "MAX_DAILY_TRADES_LIMIT",
          max_trades: 5,
          action: "HALT_FOR_DAY",
        },
      ],
    },
  },
];

// Performance & Replay Result Contracts
export interface PerformanceSummary {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  breakeven_trades: number;
  win_rate: string | number;
  loss_rate: string | number;
  breakeven_rate: string | number;
  total_gross_pnl: string | number;
  total_charges: string | number;
  total_net_pnl: string | number;
}

export interface MetricDelta {
  pnl_delta_inr: string | number;
  pnl_percentage_change: string | number | null;
  trades_delta: number;
  win_rate_delta: string | number;
  profit_factor_delta: string | number | null;
  max_drawdown_delta_inr: string | number;
  expectancy_delta_inr: string | number;
}

export interface DualEquityPoint {
  timestamp: string;
  trade_id: string | null;
  actual_equity: string | number;
  simulated_equity: string | number;
  is_skipped: boolean;
}

export interface SplitMetrics {
  before: PerformanceSummary;
  after: PerformanceSummary;
  delta: MetricDelta;
}

export interface SkippedTradeDetail {
  trade_id: string;
  symbol: string;
  entry_time: string;
  exit_time: string;
  net_pnl: string | number;
  rule_type: string;
  reason: string;
}

export interface SkippedTradesSummary {
  total_skipped: number;
  losing_trades_avoided_count: number;
  loss_avoided_inr: string | number;
  winning_trades_sacrificed_count: number;
  profit_sacrificed_inr: string | number;
  net_savings_inr: string | number;
}

export interface ReplayResult {
  rule_type: string;
  overall_before: PerformanceSummary;
  overall_after: PerformanceSummary;
  delta: MetricDelta;
  train_metrics: SplitMetrics;
  test_metrics: SplitMetrics;
  is_overfit: boolean;
  overfit_reason: string | null;
  small_sample_warning: boolean;
  small_sample_reason: string | null;
  skipped_summary: SkippedTradesSummary;
  skipped_trades: SkippedTradeDetail[];
  dual_equity_curve: DualEquityPoint[];
}

export type RuleReplayTrade = Record<string, any>;

export interface TranslateRuleResponse {
  success: boolean;
  rule: any | null;
  explanation: string;
  is_supported: boolean;
  unsupported_reason: string | null;
  engine_used?: string;
}

// Sample dataset of 36 realistic historical trades for immediate out-of-the-box backtesting
export const SAMPLE_REPLAY_TRADES: any[] = [
  // Day 1: Disciplined morning breakout
  {
    id: "3fa85f64-5717-4562-b3fc-2c963f66afa1",
    symbol: "RELIANCE",
    segment: "EQUITY_INTRADAY",
    instrument_type: "EQ",
    is_short: false,
    is_intraday: true,
    entry_time: "2026-09-01T09:35:00+05:30",
    exit_time: "2026-09-01T10:15:00+05:30",
    trade_duration_seconds: 2400,
    quantity: 50,
    entry_price: 2950.0,
    exit_price: 2990.0,
    gross_pnl: 2000.0,
    charges: 120.0,
    net_pnl: 1880.0,
  },
  // Day 1: Trade 2: Loss
  {
    id: "3fa85f64-5717-4562-b3fc-2c963f66afa2",
    symbol: "TCS",
    segment: "EQUITY_INTRADAY",
    instrument_type: "EQ",
    is_short: false,
    is_intraday: true,
    entry_time: "2026-09-01T10:30:00+05:30",
    exit_time: "2026-09-01T10:45:00+05:30",
    trade_duration_seconds: 900,
    quantity: 30,
    entry_price: 4200.0,
    exit_price: 4150.0,
    gross_pnl: -1500.0,
    charges: 80.0,
    net_pnl: -1580.0,
  },
  // Day 1: Trade 3: Revenge trade 5m after loss (violates cooldown)
  {
    id: "3fa85f64-5717-4562-b3fc-2c963f66afa3",
    symbol: "TCS",
    segment: "EQUITY_INTRADAY",
    instrument_type: "EQ",
    is_short: true,
    is_intraday: true,
    entry_time: "2026-09-01T10:50:00+05:30",
    exit_time: "2026-09-01T11:10:00+05:30",
    trade_duration_seconds: 1200,
    quantity: 60,
    entry_price: 4160.0,
    exit_price: 4210.0,
    gross_pnl: -3000.0,
    charges: 150.0,
    net_pnl: -3150.0,
  },
  // Day 1: Trade 4: Lunch chop entry (violates 11:30 - 13:00)
  {
    id: "3fa85f64-5717-4562-b3fc-2c963f66afa4",
    symbol: "INFY",
    segment: "EQUITY_INTRADAY",
    instrument_type: "EQ",
    is_short: false,
    is_intraday: true,
    entry_time: "2026-09-01T12:15:00+05:30",
    exit_time: "2026-09-01T12:45:00+05:30",
    trade_duration_seconds: 1800,
    quantity: 40,
    entry_price: 1890.0,
    exit_price: 1865.0,
    gross_pnl: -1000.0,
    charges: 75.0,
    net_pnl: -1075.0,
  },
  // Day 1: Trade 5: Afternoon trend recovery
  {
    id: "3fa85f64-5717-4562-b3fc-2c963f66afa5",
    symbol: "HDFCBANK",
    segment: "EQUITY_INTRADAY",
    instrument_type: "EQ",
    is_short: false,
    is_intraday: true,
    entry_time: "2026-09-01T14:00:00+05:30",
    exit_time: "2026-09-01T14:45:00+05:30",
    trade_duration_seconds: 2700,
    quantity: 100,
    entry_price: 1650.0,
    exit_price: 1675.0,
    gross_pnl: 2500.0,
    charges: 160.0,
    net_pnl: 2340.0,
  },
  // Day 1: Trade 6: Overtrading 6th trade (violates max 5 trades)
  {
    id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    symbol: "ICICIBANK",
    segment: "EQUITY_INTRADAY",
    instrument_type: "EQ",
    is_short: false,
    is_intraday: true,
    entry_time: "2026-09-01T15:05:00+05:30",
    exit_time: "2026-09-01T15:20:00+05:30",
    trade_duration_seconds: 900,
    quantity: 50,
    entry_price: 1220.0,
    exit_price: 1195.0,
    gross_pnl: -1250.0,
    charges: 90.0,
    net_pnl: -1340.0,
  },
  // Generate 30 additional realistic trades across subsequent days
  ...Array.from({ length: 30 }, (_, idx) => {
    const day = Math.floor(idx / 3) + 2;
    const hour = 9 + (idx % 3) * 2;
    const isLoss = idx % 3 === 1;
    const isOptionsBuy = idx % 5 === 0;
    const net = isLoss ? -1200 - (idx % 4) * 400 : 1800 + (idx % 5) * 500;
    const dateStr = `2026-09-${day < 10 ? "0" + day : day}`;
    const timeStr = `${hour < 10 ? "0" + hour : hour}:15:00+05:30`;

    return {
      id: `3fa85f64-5717-4562-b3fc-2c963f66af${(idx + 10).toString(16).padStart(2, "0")}`,
      symbol: isOptionsBuy ? "NIFTY24SEP25000CE" : "RELIANCE",
      segment: isOptionsBuy ? "OPTIONS" : "EQUITY_INTRADAY",
      instrument_type: isOptionsBuy ? "CE" : "EQ",
      is_short: false,
      is_intraday: true,
      entry_time: `${dateStr}T${timeStr}`,
      exit_time: `${dateStr}T${hour < 10 ? "0" + hour : hour}:45:00+05:30`,
      trade_duration_seconds: 1800,
      quantity: isOptionsBuy ? 150 : 40,
      entry_price: 100.0,
      exit_price: isLoss ? 85.0 : 125.0,
      gross_pnl: net + 60,
      charges: 60.0,
      net_pnl: net,
    };
  }),
];

/**
 * Executes a counter-factual rule replay via Next.js API route or client-side deterministic simulation.
 * Strictly calculates metrics against the trader's specified rule parameters (no arbitrary mock skips).
 */
export async function runReplayApi(
  rule: any,
  trades: any[] = SAMPLE_REPLAY_TRADES,
  startingCapital: number = 100000
): Promise<ReplayResult> {
  try {
    // 1. Try unified Next.js API route
    const res = await fetch("/api/rules/replay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rule,
        trades,
        starting_capital: startingCapital,
      }),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Server route unreachable or running in direct client/test environment
  }

  // 2. Deterministic high-fidelity simulation engine strictly evaluating rule parameters
  const { simulateRuleReplay } = await import("./replay-engine");
  return simulateRuleReplay(rule, trades, startingCapital);
}

/**
 * Translates trader natural language into validated catalog rule JSON.
 */
export async function translateRuleApi(
  prompt: string,
  startingCapital?: number
): Promise<TranslateRuleResponse> {
  try {
    // Call the unified Next.js API route (which uses Gemini AI on server)
    const res = await fetch("/api/rules/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        starting_capital: startingCapital,
      }),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Server route unreachable or offline test environment
  }

  // Fallback to high-fidelity deterministic parser
  const { parseRuleDeterministic } = await import("./ai-translator");
  return parseRuleDeterministic(prompt, startingCapital);
}
