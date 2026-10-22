"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, ArrowRight, Sliders } from "lucide-react";
import { TiltCascadeEvent } from "@/lib/tilt/types";
import { formatCurrencyINR } from "@/lib/utils/format";

export interface CircuitBreakerCardProps {
  cascade: TiltCascadeEvent;
}

export function CircuitBreakerCard({ cascade }: CircuitBreakerCardProps) {
  const cb = cascade.counterfactual_circuit_breaker;
  const avoidedLoss = cb.avoided_loss_inr;
  const totalLoss = cascade.total_cascade_loss_inr;
  const percentageSaved = totalLoss > 0 ? ((avoidedLoss / totalLoss) * 100).toFixed(1) : "0.0";

  // Build direct Rule Lab link with pre-filled query parameters
  const ruleLabQuery = new URLSearchParams({
    prefillRule: cb.recommended_rule_type,
    [cb.recommended_param_name]: String(cb.recommended_param_value),
  }).toString();

  const ruleLabUrl = `/rule-lab?${ruleLabQuery}`;

  return (
    <div
      data-testid="circuit-breaker-card"
      className="card-luminous p-5 sm:p-6 rounded-[8px] border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] shadow-sm space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded-[4px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Counterfactual Circuit Breaker Simulation
            </h4>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Deterministic risk replay: What happens if an automated pause severs trading immediately after the trigger loss?
          </p>
        </div>

        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-[4px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 text-xs font-mono font-bold shrink-0">
          <span>{percentageSaved}% Loss Prevented</span>
        </div>
      </div>

      {/* Horizontal Financial Comparison Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-white/[0.08] border border-slate-200/80 dark:border-white/[0.08] rounded-[6px] overflow-hidden bg-slate-50/50 dark:bg-white/[0.02]">
        {/* Actual Loss Incurred */}
        <div className="p-4 space-y-1">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Actual Spiral Outcome
          </div>
          <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums">
            -{formatCurrencyINR(totalLoss)}
          </div>
          <p className="text-[11px] font-mono text-slate-400">
            {cascade.total_trades_count} trades over {cascade.total_duration_minutes}m
          </p>
        </div>

        {/* Counterfactual Simulated Outcome */}
        <div className="p-4 space-y-1">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Simulated with Circuit Breaker
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
            {formatCurrencyINR(cb.simulated_net_pnl_inr)}
          </div>
          <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            Trigger loss accepted • {cb.trades_prevented_count} trades blocked
          </p>
        </div>

        {/* Capital Preserved */}
        <div className="p-4 space-y-1">
          <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400 font-semibold">
            Capital Saved
          </div>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
            +{formatCurrencyINR(avoidedLoss)}
          </div>
          <p className="text-[11px] font-mono text-emerald-600/80 dark:text-emerald-400/80">
            Prevented drawdown retained in base capital
          </p>
        </div>
      </div>

      {/* Recommended Rule & Action Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="space-y-0.5 text-xs">
          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5 font-mono">
            <Sliders className="w-3.5 h-3.5 text-[#2b7fff]" />
            <span>Prescribed Fix: {cb.recommended_rule_type} ({cb.recommended_param_name}={cb.recommended_param_value})</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-[11px]">
            {cb.rule_description}
          </p>
        </div>

        <Link
          href={ruleLabUrl}
          className="kiro-btn-cta !h-8 !px-3.5 text-xs font-bold inline-flex items-center space-x-1.5 shrink-0 shadow-[0_0_15px_-3px_rgba(43,127,255,0.4)]"
        >
          <span>Backtest in Rule Lab</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
