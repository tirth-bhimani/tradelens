import {
  TiltCascadeEvent,
  CascadeTradeNode,
  TiltAutopsyOverview,
  SAMPLE_TILT_CASCADES,
} from "./types";

export interface DetectorOptions {
  maxReentryGapMinutes?: number; // threshold to trigger velocity compression (default 20 mins)
  minTriggerLossInr?: number;     // minimum loss to count as a trigger (default 1500)
  sizeInflationThreshold?: number; // lot size increase ratio (default 1.25)
  fallbackToSample?: boolean;     // whether to fall back to sample cascades when dataset is empty (default true for testing)
}

/**
 * Detects tilt cascades from a chronological sequence of trade fills.
 * A cascade occurs when a trigger loss is followed in rapid succession
 * by compressed-velocity revenge trades or size inflation.
 */
export function detectTiltCascades(
  rawTrades: any[] = [],
  options: DetectorOptions = {}
): TiltAutopsyOverview {
  const maxGap = options.maxReentryGapMinutes ?? 20;
  const minLoss = options.minTriggerLossInr ?? 1500;
  const sizeThreshold = options.sizeInflationThreshold ?? 1.25;
  const allowSampleFallback = options.fallbackToSample ?? true;

  if (!rawTrades || rawTrades.length < 2) {
    if (allowSampleFallback && (!rawTrades || rawTrades.length === 0)) {
      return buildOverviewFromCascades(SAMPLE_TILT_CASCADES);
    }
    return buildOverviewFromCascades([]);
  }

  // Parse and sort trades chronologically
  const parsed = rawTrades
    .map((t) => {
      const entryTime = new Date(t.entry_time || t.open_time || t.created_at || Date.now());
      const exitTime = new Date(t.exit_time || t.close_time || entryTime.getTime() + 15 * 60000);
      const netPnl = Number(t.net_pnl ?? t.pnl ?? 0);
      const qty = Math.abs(Number(t.quantity ?? t.qty ?? 1));
      const symbol = t.symbol || t.tradingsymbol || "EQUITY";

      return {
        id: t.id || t.trade_id || `trd-${Math.random().toString(36).substring(2, 8)}`,
        symbol,
        entryTime,
        exitTime,
        netPnl,
        qty,
        entryPrice: Number(t.entry_price ?? t.price ?? 100),
        exitPrice: Number(t.exit_price ?? 100),
      };
    })
    .sort((a, b) => a.entryTime.getTime() - b.entryTime.getTime());

  const detectedCascades: TiltCascadeEvent[] = [];
  let i = 0;

  while (i < parsed.length) {
    const current = parsed[i];

    // Check if current trade qualifies as a trigger loss
    if (current.netPnl <= -minLoss) {
      const cascadeMembers: typeof parsed = [current];
      let j = i + 1;

      while (j < parsed.length) {
        const prev = cascadeMembers[cascadeMembers.length - 1];
        const candidate = parsed[j];

        // Minutes between prev exit and candidate entry
        const gapMinutes = Math.max(
          0,
          (candidate.entryTime.getTime() - prev.exitTime.getTime()) / (1000 * 60)
        );

        // Same trading day check
        const isSameDay =
          candidate.entryTime.toDateString() === prev.entryTime.toDateString();

        // If candidate entered within compressed time gap AND is in the same session
        if (isSameDay && gapMinutes <= maxGap) {
          cascadeMembers.push(candidate);
          j++;
        } else {
          break;
        }
      }

      // A cascade must have at least 2 subsequent trades (>= 3 trades total) or severe loss expansion
      if (cascadeMembers.length >= 2) {
        const baselineQty = cascadeMembers[0].qty || 1;
        const triggerLoss = Math.abs(cascadeMembers[0].netPnl);
        const subsequentTrades = cascadeMembers.slice(1);
        const subsequentLoss = subsequentTrades.reduce((acc, t) => acc + (t.netPnl < 0 ? Math.abs(t.netPnl) : 0), 0);
        const totalCascadeLoss = triggerLoss + subsequentLoss;

        const dateStr = cascadeMembers[0].entryTime.toISOString().slice(0, 10);
        const firstEntry = cascadeMembers[0].entryTime.getTime();
        const lastExit = cascadeMembers[cascadeMembers.length - 1].exitTime.getTime();
        const totalDurationMins = Math.max(1, Math.round((lastExit - firstEntry) / (1000 * 60)));

        const nodes: CascadeTradeNode[] = cascadeMembers.map((t, idx) => {
          const isTrigger = idx === 0;
          const prevExit = idx > 0 ? cascadeMembers[idx - 1].exitTime.getTime() : null;
          const minsGap = prevExit ? Math.max(0, Math.round((t.entryTime.getTime() - prevExit) / (1000 * 60))) : null;
          const inflation = Number((t.qty / baselineQty).toFixed(2));

          let phase: CascadeTradeNode["psychological_phase"] = "REACTION_TILT";
          if (isTrigger) phase = "TRIGGER_LOSS";
          else if (inflation >= sizeThreshold || idx >= 2) phase = "DESPERATION_REVENGE";
          if (idx === cascadeMembers.length - 1 && cascadeMembers.length >= 3) phase = "EXHAUSTION_BLOWUP";

          let violation = "Standard execution.";
          if (isTrigger) {
            violation = `Trigger Loss: -₹${Math.abs(t.netPnl).toLocaleString("en-IN")} loss triggered emotional shift.`;
          } else if (minsGap !== null && minsGap <= 5) {
            violation = `Velocity Compression: Re-entered after only ${minsGap}m pause (${inflation}x baseline size).`;
          } else {
            violation = `Revenge Chasing: ${inflation}x size expansion during drawdown.`;
          }

          return {
            trade_id: t.id,
            symbol: t.symbol,
            entry_time: t.entryTime.toISOString(),
            exit_time: t.exitTime.toISOString(),
            quantity: t.qty,
            entry_price: t.entryPrice,
            exit_price: t.exitPrice,
            net_pnl: t.netPnl,
            is_trigger: isTrigger,
            minutes_since_previous: minsGap,
            size_inflation_ratio: inflation,
            psychological_phase: phase,
            violation_summary: violation,
          };
        });

        // Determine shortest re-entry gap
        const gaps = nodes.slice(1).map((n) => n.minutes_since_previous ?? 0);
        const minGap = gaps.length > 0 ? Math.min(...gaps) : 0;
        const maxInflation = Math.max(...nodes.map((n) => n.size_inflation_ratio));

        detectedCascades.push({
          id: `cascade-${dateStr}-${i}`,
          date: dateStr,
          title: `${cascadeMembers[0].symbol} ${cascadeMembers.length}-Trade Spiral (${dateStr})`,
          symbol_focus: cascadeMembers[0].symbol,
          total_cascade_loss_inr: Math.round(totalCascadeLoss),
          total_trades_count: cascadeMembers.length,
          total_duration_minutes: totalDurationMins,
          trigger_loss_inr: Math.round(triggerLoss),
          subsequent_spiral_loss_inr: Math.round(subsequentLoss),
          max_size_inflation: maxInflation,
          min_reentry_interval_minutes: minGap,
          trades: nodes,
          counterfactual_circuit_breaker: {
            recommended_rule_type: "COOL_OFF_AFTER_LOSS",
            recommended_param_name: "cooldown_minutes",
            recommended_param_value: 20,
            rule_description: `Mandatory 20-minute timeout after ${cascadeMembers[0].symbol} trigger loss.`,
            avoided_loss_inr: Math.round(subsequentLoss),
            trades_prevented_count: cascadeMembers.length - 1,
            simulated_net_pnl_inr: Math.round(cascadeMembers[0].netPnl),
          },
        });

        // Advance index to end of cascade
        i = j;
        continue;
      }
    }
    i++;
  }

  return buildOverviewFromCascades(detectedCascades);
}

function buildOverviewFromCascades(cascades: TiltCascadeEvent[]): TiltAutopsyOverview {
  const totalDrained = cascades.reduce((acc, c) => acc + c.total_cascade_loss_inr, 0);
  const totalRecoverable = cascades.reduce((acc, c) => acc + c.counterfactual_circuit_breaker.avoided_loss_inr, 0);
  const avgDuration =
    cascades.length > 0
      ? Math.round(cascades.reduce((acc, c) => acc + c.total_duration_minutes, 0) / cascades.length)
      : 0;

  return {
    total_cascades_detected: cascades.length,
    total_capital_drained_by_tilt_inr: totalDrained,
    avg_cascade_duration_minutes: avgDuration,
    potential_capital_recoverable_inr: totalRecoverable,
    cascades,
  };
}
