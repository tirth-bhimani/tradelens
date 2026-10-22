import type { SavedRule, AdherenceReport, TradeViolation, RuleAdherenceStat } from "./adherence-types";

/**
 * Deterministically evaluates round-trip trades against active saved rules.
 * Runs on frontend or server-side without external dependencies.
 */
export function evaluateClientAdherence(
  trades: Array<{
    id?: string;
    trade_id?: string;
    symbol: string;
    entry_time?: string;
    entryTime?: string;
    exit_time?: string;
    exitTime?: string;
    net_pnl?: number;
    netPnl?: number;
    quantity?: number;
    qty?: number;
  }>,
  rules: SavedRule[]
): AdherenceReport {
  if (!trades || trades.length === 0 || !rules || rules.length === 0) {
    return {
      total_trades_evaluated: trades?.length || 0,
      total_adhering_trades: trades?.length || 0,
      total_violating_trades: 0,
      discipline_score_pct: 100.0,
      total_avoidable_losses_incurred: 0.0,
      violations: [],
      rules_breakdown: [],
      evaluated_at: new Date().toISOString(),
    };
  }

  const activeRules = (Array.isArray(rules) ? rules : []).filter((r) => r.is_active);

  // Sort trades chronologically
  const safeTrades = Array.isArray(trades) ? trades : [];
  const sorted = [...safeTrades].sort((a, b) => {
    const timeA = new Date(a.entry_time || a.entryTime || "").getTime();
    const timeB = new Date(b.entry_time || b.entryTime || "").getTime();
    return timeA - timeB;
  });

  const violations: TradeViolation[] = [];
  const violatingTradeIds = new Set<string>();
  const ruleViolationsMap: Record<string, number> = {};
  const ruleLossesMap: Record<string, number> = {};

  rules.forEach((r) => {
    ruleViolationsMap[r.id] = 0;
    ruleLossesMap[r.id] = 0;
  });

  let currentDateStr: string | null = null;
  let dailyTradeCount = 0;
  let dailyCumPnl = 0;
  let lastLossExitTime: Date | null = null;
  let lastLossAmount = 0;

  for (const trade of sorted) {
    const tradeId = trade.id || trade.trade_id || "";
    const symbol = trade.symbol || "";
    const entryDate = new Date(trade.entry_time || trade.entryTime || Date.now());
    const exitDate = new Date(trade.exit_time || trade.exitTime || trade.entry_time || trade.entryTime || Date.now());
    const netPnl = typeof trade.net_pnl === "number" ? trade.net_pnl : (trade.netPnl ?? 0);
    const quantity = trade.quantity || trade.qty || 0;

    const dateStr = entryDate.toISOString().slice(0, 10);
    if (currentDateStr !== dateStr) {
      currentDateStr = dateStr;
      dailyTradeCount = 0;
      dailyCumPnl = 0;
      lastLossExitTime = null;
      lastLossAmount = 0;
    }

    dailyTradeCount += 1;

    for (const rule of activeRules) {
      const payload = rule.rule_payload || {};
      let violated = false;
      let violationCode = "";
      let explanation = "";

      // 1. COOL_OFF_AFTER_LOSS
      if (rule.rule_type === "COOL_OFF_AFTER_LOSS") {
        const cooldownMinutes = Number(payload.cooldown_minutes || 15);
        const triggerLoss = Number(payload.trigger_loss_inr || payload.loss_threshold || 0);

        if (lastLossExitTime) {
          const gapMs = entryDate.getTime() - lastLossExitTime.getTime();
          const gapMin = Math.floor(gapMs / 60000);
          if (gapMin < cooldownMinutes) {
            if (triggerLoss <= 0 || Math.abs(lastLossAmount) >= triggerLoss) {
              violated = true;
              violationCode = "COOLDOWN_VIOLATION";
              explanation = `Re-entered after ${gapMin}m; mandatory ${cooldownMinutes}m cooldown required after loss of -₹${Math.abs(lastLossAmount).toLocaleString("en-IN")}.`;
            }
          }
        }
      }

      // 2. MAX_TRADES_PER_DAY / MAX_DAILY_TRADES_LIMIT
      else if (rule.rule_type === "MAX_TRADES_PER_DAY" || rule.rule_type === "MAX_DAILY_TRADES_LIMIT") {
        const maxTrades = Number(payload.max_trades || payload.max_daily_trades || 4);
        if (dailyTradeCount > maxTrades) {
          violated = true;
          violationCode = "OVERTRADING_CAP_EXCEEDED";
          explanation = `Trade #${dailyTradeCount} breached session cap of ${maxTrades} trades.`;
        }
      }

      // 3. DAILY_LOSS_CUTOFF / DAILY_LOSS_LIMIT
      else if (rule.rule_type === "DAILY_LOSS_CUTOFF" || rule.rule_type === "DAILY_LOSS_LIMIT") {
        const maxLoss = Math.abs(Number(payload.max_loss || payload.max_daily_loss_inr || 5000));
        if (dailyCumPnl <= -maxLoss) {
          violated = true;
          violationCode = "DAILY_LOSS_CUTOFF_BREACHED";
          explanation = `Executed after daily net loss reached -₹${Math.abs(dailyCumPnl).toLocaleString("en-IN")} (cutoff: -₹${maxLoss.toLocaleString("en-IN")}).`;
        }
      }

      // 4. MAX_POSITION_SIZE
      else if (rule.rule_type === "MAX_POSITION_SIZE") {
        const maxQty = Number(payload.max_quantity || payload.max_qty || 0);
        if (maxQty > 0 && quantity > maxQty) {
          violated = true;
          violationCode = "MAX_POSITION_SIZE_EXCEEDED";
          explanation = `Position size (${quantity}) exceeded maximum lot limit (${maxQty}).`;
        }
      }

      // 5. NO_CHOP_ZONE / TIME_OF_DAY_CUTOFF
      else if (rule.rule_type === "NO_CHOP_ZONE" || rule.rule_type === "TIME_OF_DAY_CUTOFF") {
        const startStr = payload.start_time || "11:30";
        const endStr = payload.end_time || "13:30";
        const hours = String(entryDate.getHours()).padStart(2, "0");
        const minutes = String(entryDate.getMinutes()).padStart(2, "0");
        const entryHHMM = `${hours}:${minutes}`;
        if (entryHHMM >= startStr && entryHHMM <= endStr) {
          violated = true;
          violationCode = "RESTRICTED_TIME_WINDOW";
          explanation = `Entered at ${entryHHMM} during restricted chop consolidation window (${startStr} - ${endStr}).`;
        }
      }

      if (violated) {
        violatingTradeIds.add(tradeId);
        ruleViolationsMap[rule.id] = (ruleViolationsMap[rule.id] || 0) + 1;
        const lossAmount = netPnl < 0 ? Math.abs(netPnl) : 0;
        ruleLossesMap[rule.id] = (ruleLossesMap[rule.id] || 0) + lossAmount;

        violations.push({
          trade_id: tradeId,
          symbol,
          entry_time: entryDate.toISOString(),
          rule_id: rule.id,
          rule_type: rule.rule_type,
          violation_code: violationCode,
          penalty_pnl: netPnl,
          explanation,
        });
      }
    }

    dailyCumPnl += netPnl;
    if (netPnl < 0) {
      lastLossExitTime = exitDate;
      lastLossAmount = netPnl;
    }
  }

  const totalEvaluated = sorted.length;
  const totalViolating = violatingTradeIds.size;
  const totalAdhering = totalEvaluated - totalViolating;
  const disciplineScore = totalEvaluated > 0 ? Number(((totalAdhering / totalEvaluated) * 100).toFixed(1)) : 100.0;

  const totalAvoidableLosses = violations.reduce((acc, v) => (v.penalty_pnl < 0 ? acc + Math.abs(v.penalty_pnl) : acc), 0);

  const rulesBreakdown: RuleAdherenceStat[] = rules.map((r) => {
    const vCount = ruleViolationsMap[r.id] || 0;
    const adherenceRate = totalEvaluated > 0 ? Number((((totalEvaluated - vCount) / totalEvaluated) * 100).toFixed(1)) : 100.0;
    return {
      rule_id: r.id,
      rule_type: r.rule_type,
      is_active: r.is_active,
      total_evaluations: totalEvaluated,
      violations_count: vCount,
      adherence_pct: adherenceRate,
      avoidable_loss_incurred: ruleLossesMap[r.id] || 0,
    };
  });

  return {
    total_trades_evaluated: totalEvaluated,
    total_adhering_trades: totalAdhering,
    total_violating_trades: totalViolating,
    discipline_score_pct: disciplineScore,
    total_avoidable_losses_incurred: totalAvoidableLosses,
    violations,
    rules_breakdown: rulesBreakdown,
    evaluated_at: new Date().toISOString(),
  };
}
