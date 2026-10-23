import type {
  ReplayResult,
  SkippedTradeDetail,
  SkippedTradesSummary,
  MetricDelta,
  PerformanceSummary,
  DualEquityPoint,
  SplitMetrics,
} from "./types";

interface RawReplayTrade {
  id?: string;
  trade_id?: string;
  symbol: string;
  entry_time?: string;
  entryTime?: string;
  exit_time?: string;
  exitTime?: string;
  net_pnl?: number | string;
  netPnl?: number | string;
  gross_pnl?: number | string;
  grossPnl?: number | string;
  charges?: number | string;
  quantity?: number | string;
  qty?: number | string;
  entry_price?: number | string;
  exit_price?: number | string;
}

/**
 * Deterministically simulates historical rule enforcement against round-trip trades.
 * Generates actual vs counter-factual performance deltas, skipped trade ledgers,
 * dual equity curves, and a 70/30 chronological train/test split.
 */
export function simulateRuleReplay(
  rule: any,
  rawTrades: RawReplayTrade[],
  startingCapital: number = 100000
): ReplayResult {
  const safeTrades = Array.isArray(rawTrades) ? rawTrades : [];
  if (safeTrades.length === 0) {
    return buildEmptyReplayResult(rule?.rule_type || "UNKNOWN", startingCapital);
  }

  // 1. Normalize and sort trades chronologically by entry_time
  const normalized = safeTrades.map((t, idx) => {
    const entryStr = t.entry_time || t.entryTime || new Date(Date.now() - (safeTrades.length - idx) * 3600000).toISOString();
    const exitStr = t.exit_time || t.exitTime || new Date(new Date(entryStr).getTime() + 1800000).toISOString();
    const net = Number(t.net_pnl ?? t.netPnl ?? 0);
    const gross = Number(t.gross_pnl ?? t.grossPnl ?? net);
    const charges = Number(t.charges ?? Math.max(0, gross - net));
    const qty = Number(t.quantity ?? t.qty ?? 1);

    return {
      id: t.id || t.trade_id || `trd-${idx + 1}`,
      symbol: t.symbol || "EQUITY",
      entryTime: new Date(entryStr),
      exitTime: new Date(exitStr),
      entryTimeStr: entryStr,
      exitTimeStr: exitStr,
      netPnl: isNaN(net) ? 0 : net,
      grossPnl: isNaN(gross) ? 0 : gross,
      charges: isNaN(charges) ? 0 : charges,
      quantity: isNaN(qty) ? 1 : qty,
    };
  });

  normalized.sort((a, b) => a.entryTime.getTime() - b.entryTime.getTime());

  // 2. Timeline State Machine
  const skippedTrades: SkippedTradeDetail[] = [];
  const compliantTrades: typeof normalized = [];
  const skippedIds = new Set<string>();

  let currentDateStr: string | null = null;
  let dailyTradeCount = 0;
  let dailyRealizedPnl = 0;
  let dailyHalted = false;
  let dailyHaltReason: string | null = null;
  let lastLossExitTime: Date | null = null;
  let lastLossAmount = 0;
  let consecutiveLosses = 0;

  for (const trade of normalized) {
    const dayStr = trade.entryTime.toISOString().slice(0, 10);

    // Reset daily counters on calendar date transition
    if (currentDateStr !== dayStr) {
      currentDateStr = dayStr;
      dailyTradeCount = 0;
      dailyRealizedPnl = 0;
      dailyHalted = false;
      dailyHaltReason = null;
      consecutiveLosses = 0;
    }

    // Evaluate trade against active rule
    const { isSkipped, reason, triggeredRuleType } = evaluateTradeAgainstRule(
      rule,
      trade,
      {
        dailyTradeCount,
        dailyRealizedPnl,
        dailyHalted,
        dailyHaltReason,
        lastLossExitTime,
        lastLossAmount,
        consecutiveLosses,
        startingCapital,
      }
    );

    if (isSkipped) {
      skippedIds.add(trade.id);
      skippedTrades.push({
        trade_id: trade.id,
        symbol: trade.symbol,
        entry_time: trade.entryTimeStr,
        exit_time: trade.exitTimeStr,
        net_pnl: trade.netPnl,
        rule_type: triggeredRuleType || rule.rule_type || "RULE_VIOLATION",
        reason: reason || "Disqualified by rule guardrail.",
      });
    } else {
      // Trade passes through as executed in counter-factual simulation
      compliantTrades.push(trade);
      dailyTradeCount += 1;
      dailyRealizedPnl += trade.netPnl;

      if (trade.netPnl < 0) {
        lastLossExitTime = trade.exitTime;
        lastLossAmount = trade.netPnl;
        consecutiveLosses += 1;
      } else if (trade.netPnl > 0) {
        consecutiveLosses = 0;
      }
    }
  }

  // 3. Compute Synchronized Dual Equity Curves
  let actualEquity = startingCapital;
  let simulatedEquity = startingCapital;

  const dualEquityCurve: DualEquityPoint[] = normalized.map((trade) => {
    actualEquity += trade.netPnl;
    const isSkipped = skippedIds.has(trade.id);
    if (!isSkipped) {
      simulatedEquity += trade.netPnl;
    }

    return {
      timestamp: trade.exitTimeStr,
      trade_id: trade.id,
      actual_equity: Number(actualEquity.toFixed(2)),
      simulated_equity: Number(simulatedEquity.toFixed(2)),
      is_skipped: isSkipped,
    };
  });

  // 4. Aggregate Skipped Trade Metrics
  const losingAvoided = skippedTrades.filter((t) => Number(t.net_pnl) < 0);
  const winningSacrificed = skippedTrades.filter((t) => Number(t.net_pnl) > 0);

  const lossAvoidedInr = losingAvoided.reduce((acc, t) => acc + Math.abs(Number(t.net_pnl)), 0);
  const profitSacrificedInr = winningSacrificed.reduce((acc, t) => acc + Number(t.net_pnl), 0);
  const netSavingsInr = lossAvoidedInr - profitSacrificedInr;

  const skippedSummary: SkippedTradesSummary = {
    total_skipped: skippedTrades.length,
    losing_trades_avoided_count: losingAvoided.length,
    loss_avoided_inr: Number(lossAvoidedInr.toFixed(2)),
    winning_trades_sacrificed_count: winningSacrificed.length,
    profit_sacrificed_inr: Number(profitSacrificedInr.toFixed(2)),
    net_savings_inr: Number(netSavingsInr.toFixed(2)),
  };

  // 5. Partition 70/30 Train and Test Splits
  const splitIdx = Math.floor(normalized.length * 0.7);
  const trainRaw = normalized.slice(0, splitIdx);
  const testRaw = normalized.slice(splitIdx);

  const trainCompliant = trainRaw.filter((t) => !skippedIds.has(t.id));
  const testCompliant = testRaw.filter((t) => !skippedIds.has(t.id));

  const overallBefore = computeSummaryMetrics(normalized);
  const overallAfter = computeSummaryMetrics(compliantTrades);
  const overallDelta = computeDeltas(overallBefore, overallAfter);

  const trainBefore = computeSummaryMetrics(trainRaw);
  const trainAfter = computeSummaryMetrics(trainCompliant);
  const trainDelta = computeDeltas(trainBefore, trainAfter);

  const testBefore = computeSummaryMetrics(testRaw);
  const testAfter = computeSummaryMetrics(testCompliant);
  const testDelta = computeDeltas(testBefore, testAfter);

  // 6. Overfitting Detection
  const trainPnlDelta = Number(trainDelta.pnl_delta_inr);
  const testPnlDelta = Number(testDelta.pnl_delta_inr);
  const isOverfit = trainPnlDelta > 0 && testPnlDelta < -2000;
  const overfitReason = isOverfit
    ? `Rule gained +₹${trainPnlDelta.toLocaleString("en-IN")} on in-sample training but degraded by -₹${Math.abs(testPnlDelta).toLocaleString("en-IN")} out-of-sample.`
    : null;

  const smallSample = normalized.length < 30 || testRaw.length < 10;
  const smallSampleReason = smallSample
    ? `Dataset contains ${normalized.length} trades (${testRaw.length} in test split). Institutional statistical significance recommends at least 30 total trades.`
    : null;

  return {
    rule_type: rule?.rule_type || "RULE_REPLAY",
    overall_before: overallBefore,
    overall_after: overallAfter,
    delta: overallDelta,
    train_metrics: {
      before: trainBefore,
      after: trainAfter,
      delta: trainDelta,
    },
    test_metrics: {
      before: testBefore,
      after: testAfter,
      delta: testDelta,
    },
    is_overfit: isOverfit,
    overfit_reason: overfitReason,
    small_sample_warning: smallSample,
    small_sample_reason: smallSampleReason,
    skipped_summary: skippedSummary,
    skipped_trades: skippedTrades,
    dual_equity_curve: dualEquityCurve,
  };
}

/**
 * Evaluates an individual trade against single or composite rule logic.
 */
function evaluateTradeAgainstRule(
  rule: any,
  trade: {
    id: string;
    symbol: string;
    entryTime: Date;
    exitTime: Date;
    netPnl: number;
    quantity: number;
  },
  state: {
    dailyTradeCount: number;
    dailyRealizedPnl: number;
    dailyHalted: boolean;
    dailyHaltReason: string | null;
    lastLossExitTime: Date | null;
    lastLossAmount: number;
    consecutiveLosses: number;
    startingCapital: number;
  }
): { isSkipped: boolean; reason: string | null; triggeredRuleType: string | null } {
  if (!rule) return { isSkipped: false, reason: null, triggeredRuleType: null };

  // Handle COMPOSITE_RULE
  if (rule.rule_type === "COMPOSITE_RULE" && Array.isArray(rule.subrules)) {
    for (const sub of rule.subrules) {
      const res = evaluateAtomicRule(sub, trade, state);
      if (res.isSkipped) {
        return res;
      }
    }
    return { isSkipped: false, reason: null, triggeredRuleType: null };
  }

  // Handle Single Rule
  return evaluateAtomicRule(rule, trade, state);
}

/**
 * Evaluates an atomic catalog rule.
 */
function evaluateAtomicRule(
  rule: any,
  trade: {
    id: string;
    symbol: string;
    entryTime: Date;
    exitTime: Date;
    netPnl: number;
    quantity: number;
  },
  state: {
    dailyTradeCount: number;
    dailyRealizedPnl: number;
    dailyHalted: boolean;
    dailyHaltReason: string | null;
    lastLossExitTime: Date | null;
    lastLossAmount: number;
    consecutiveLosses: number;
    startingCapital: number;
  }
): { isSkipped: boolean; reason: string | null; triggeredRuleType: string | null } {
  const rType = rule.rule_type;

  // 1. COOL_OFF_AFTER_LOSS
  if (rType === "COOL_OFF_AFTER_LOSS") {
    const cooldownMins = Number(rule.cooldown_minutes || 15);
    const triggerLossInr = Number(rule.trigger_loss_inr || 0);

    if (state.lastLossExitTime) {
      const diffMs = trade.entryTime.getTime() - state.lastLossExitTime.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins >= 0 && diffMins < cooldownMins) {
        if (triggerLossInr <= 0 || Math.abs(state.lastLossAmount) >= triggerLossInr) {
          return {
            isSkipped: true,
            reason: `Re-entered after ${diffMins}m; mandatory ${cooldownMins}-minute cooldown required after loss of ₹${Math.abs(state.lastLossAmount).toLocaleString("en-IN")}.`,
            triggeredRuleType: "COOL_OFF_AFTER_LOSS",
          };
        }
      }
    }
  }

  // 2. MAX_DAILY_TRADES_LIMIT
  if (rType === "MAX_DAILY_TRADES_LIMIT" || rType === "MAX_TRADES_PER_DAY") {
    const maxTrades = Number(rule.max_trades || rule.max_daily_trades || 5);
    if (state.dailyTradeCount >= maxTrades) {
      return {
        isSkipped: true,
        reason: `Trade #${state.dailyTradeCount + 1} breached maximum session cap of ${maxTrades} trades.`,
        triggeredRuleType: "MAX_DAILY_TRADES_LIMIT",
      };
    }
  }

  // 3. MAX_CONSECUTIVE_LOSSES
  if (rType === "MAX_CONSECUTIVE_LOSSES") {
    const maxConsec = Number(rule.consecutive_losses || 3);
    if (state.consecutiveLosses >= maxConsec) {
      return {
        isSkipped: true,
        reason: `Loss streak circuit breaker triggered after ${state.consecutiveLosses} consecutive losing trades.`,
        triggeredRuleType: "MAX_CONSECUTIVE_LOSSES",
      };
    }
  }

  // 4. DAILY_LOSS_LIMIT
  if (rType === "DAILY_LOSS_LIMIT" || rType === "DAILY_LOSS_CUTOFF") {
    let limitInr = Number(rule.max_loss_inr || 5000);
    if (rule.max_loss_percent_capital) {
      limitInr = (state.startingCapital * Number(rule.max_loss_percent_capital)) / 100;
    }

    if (state.dailyRealizedPnl <= -limitInr) {
      return {
        isSkipped: true,
        reason: `Daily cumulative loss reached ₹${Math.abs(state.dailyRealizedPnl).toLocaleString("en-IN")}, breaching daily stop limit of ₹${limitInr.toLocaleString("en-IN")}.`,
        triggeredRuleType: "DAILY_LOSS_LIMIT",
      };
    }
  }

  // 5. TIME_OF_DAY_CUTOFF
  if (rType === "TIME_OF_DAY_CUTOFF") {
    const start = rule.allowed_start_time || "09:30";
    const end = rule.allowed_end_time || "15:00";
    const hours = String(trade.entryTime.getHours()).padStart(2, "0");
    const mins = String(trade.entryTime.getMinutes()).padStart(2, "0");
    const hhmm = `${hours}:${mins}`;

    if (hhmm < start || hhmm > end) {
      return {
        isSkipped: true,
        reason: `Entry at ${hhmm} outside permitted session hours (${start} - ${end}).`,
        triggeredRuleType: "TIME_OF_DAY_CUTOFF",
      };
    }

    if (rule.restricted_lunch_break && hhmm >= "11:30" && hhmm <= "13:00") {
      return {
        isSkipped: true,
        reason: `Entry at ${hhmm} occurred during restricted midday chop window (11:30 - 13:00).`,
        triggeredRuleType: "TIME_OF_DAY_CUTOFF",
      };
    }
  }

  // 6. MAX_POSITION_SIZE
  if (rType === "MAX_POSITION_SIZE") {
    const maxQty = Number(rule.max_quantity || 0);
    if (maxQty > 0 && trade.quantity > maxQty) {
      return {
        isSkipped: true,
        reason: `Position size of ${trade.quantity} exceeded maximum allocation cap of ${maxQty}.`,
        triggeredRuleType: "MAX_POSITION_SIZE",
      };
    }
  }

  // 7. NO_TRADING_ON_EXPIRY_DAY
  if (rType === "NO_TRADING_ON_EXPIRY_DAY") {
    const dayOfWeek = trade.entryTime.getDay(); // 3 = Thursday (Nifty), 2 = Wednesday (BankNifty)
    const indices = rule.affected_indices || ["NIFTY"];

    if (indices.includes("NIFTY") && dayOfWeek === 4) {
      return {
        isSkipped: true,
        reason: `Execution skipped on NIFTY expiry day (Thursday).`,
        triggeredRuleType: "NO_TRADING_ON_EXPIRY_DAY",
      };
    }
    if (indices.includes("BANKNIFTY") && dayOfWeek === 3) {
      return {
        isSkipped: true,
        reason: `Execution skipped on BANKNIFTY expiry day (Wednesday).`,
        triggeredRuleType: "NO_TRADING_ON_EXPIRY_DAY",
      };
    }
  }

  return { isSkipped: false, reason: null, triggeredRuleType: null };
}

/**
 * Computes performance summary stats for a trade set.
 */
function computeSummaryMetrics(trades: any[]): PerformanceSummary {
  const total = trades.length;
  if (total === 0) {
    return {
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0,
      breakeven_trades: 0,
      win_rate: "0.0",
      loss_rate: "0.0",
      breakeven_rate: "0.0",
      total_gross_pnl: "0.00",
      total_charges: "0.00",
      total_net_pnl: "0.00",
    };
  }

  const wins = trades.filter((t) => Number(t.netPnl ?? t.net_pnl) > 0).length;
  const losses = trades.filter((t) => Number(t.netPnl ?? t.net_pnl) < 0).length;
  const breakeven = total - wins - losses;

  const totalGross = trades.reduce((acc, t) => acc + Number(t.grossPnl ?? t.gross_pnl ?? 0), 0);
  const totalCharges = trades.reduce((acc, t) => acc + Number(t.charges ?? 0), 0);
  const totalNet = trades.reduce((acc, t) => acc + Number(t.netPnl ?? t.net_pnl ?? 0), 0);

  return {
    total_trades: total,
    winning_trades: wins,
    losing_trades: losses,
    breakeven_trades: breakeven,
    win_rate: ((wins / total) * 100).toFixed(1),
    loss_rate: ((losses / total) * 100).toFixed(1),
    breakeven_rate: ((breakeven / total) * 100).toFixed(1),
    total_gross_pnl: totalGross.toFixed(2),
    total_charges: totalCharges.toFixed(2),
    total_net_pnl: totalNet.toFixed(2),
  };
}

/**
 * Computes metric deltas between Before and After summary reports.
 */
function computeDeltas(before: PerformanceSummary, after: PerformanceSummary): MetricDelta {
  const pnlBefore = Number(before.total_net_pnl);
  const pnlAfter = Number(after.total_net_pnl);
  const pnlDelta = pnlAfter - pnlBefore;

  const tradesDelta = after.total_trades - before.total_trades;
  const winRateDelta = Number(after.win_rate) - Number(before.win_rate);

  const pctChange =
    pnlBefore !== 0
      ? Number(((pnlDelta / Math.abs(pnlBefore)) * 100).toFixed(1))
      : null;

  return {
    pnl_delta_inr: pnlDelta.toFixed(2),
    pnl_percentage_change: pctChange,
    trades_delta: tradesDelta,
    win_rate_delta: winRateDelta.toFixed(1),
    profit_factor_delta: null,
    max_drawdown_delta_inr: "0.00",
    expectancy_delta_inr: "0.00",
  };
}

/**
 * Builds an empty baseline ReplayResult when trade data is unavailable.
 */
function buildEmptyReplayResult(ruleType: string, startingCapital: number): ReplayResult {
  const emptySummary: PerformanceSummary = {
    total_trades: 0,
    winning_trades: 0,
    losing_trades: 0,
    breakeven_trades: 0,
    win_rate: "0.0",
    loss_rate: "0.0",
    breakeven_rate: "0.0",
    total_gross_pnl: "0.00",
    total_charges: "0.00",
    total_net_pnl: "0.00",
  };

  const emptyDelta: MetricDelta = {
    pnl_delta_inr: "0.00",
    pnl_percentage_change: null,
    trades_delta: 0,
    win_rate_delta: "0.0",
    profit_factor_delta: null,
    max_drawdown_delta_inr: "0.00",
    expectancy_delta_inr: "0.00",
  };

  return {
    rule_type: ruleType,
    overall_before: emptySummary,
    overall_after: emptySummary,
    delta: emptyDelta,
    train_metrics: { before: emptySummary, after: emptySummary, delta: emptyDelta },
    test_metrics: { before: emptySummary, after: emptySummary, delta: emptyDelta },
    is_overfit: false,
    overfit_reason: null,
    small_sample_warning: true,
    small_sample_reason: "No trades available to simulate.",
    skipped_summary: {
      total_skipped: 0,
      losing_trades_avoided_count: 0,
      loss_avoided_inr: 0,
      winning_trades_sacrificed_count: 0,
      profit_sacrificed_inr: 0,
      net_savings_inr: 0,
    },
    skipped_trades: [],
    dual_equity_curve: [
      {
        timestamp: new Date().toISOString(),
        trade_id: null,
        actual_equity: startingCapital,
        simulated_equity: startingCapital,
        is_skipped: false,
      },
    ],
  };
}
