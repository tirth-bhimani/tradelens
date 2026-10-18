import React from "react";
import Link from "next/link";
import { ArrowRight, BarChart2, Shield } from "lucide-react";
import {
  FrontendLeakDiagnosis,
  FrontendSuggestedRule,
  buildRuleLabDeepLink,
} from "@/lib/insights/types";
import { formatIndianCurrency } from "@/lib/utils/format";
import { SampleSizeWarning } from "./sample-size-warning";

interface InsightCardProps {
  leak: FrontendLeakDiagnosis;
  rule?: FrontendSuggestedRule;
  totalTradesAnalyzed?: number;
}

export function InsightCard({
  leak,
  rule,
  totalTradesAnalyzed,
}: InsightCardProps) {
  const tradeCount = leak.trade_count ?? totalTradesAnalyzed ?? 0;

  const deepLink = rule
    ? buildRuleLabDeepLink(rule.rule_id, rule.recommended_parameters)
    : `/rule-lab?prefillRule=${encodeURIComponent(leak.leak_type)}`;

  return (
    <div
      data-testid="insight-card"
      className="p-5 rounded-[4px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1017] flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
    >
      {/* Header: Clean Institutional Risk Classification & Financial Impact */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400 font-mono">
              Priority: {leak.severity}
            </span>
          </div>

          {leak.pnl_impact_inr !== undefined && (
            <div className="text-right">
              <span className="text-xs font-bold tabular-nums text-rose-600 dark:text-rose-400">
                {leak.pnl_impact_inr <= 0 ? "-" : ""}
                {formatIndianCurrency(Math.abs(leak.pnl_impact_inr))}
              </span>
            </div>
          )}
        </div>

        {/* Title & Diagnostic Observation */}
        <div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
            {leak.title}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-1.5">
            {leak.diagnosis}
          </p>
        </div>

        {/* Evidence & Metric Proof */}
        <div className="p-3 rounded-[3px] bg-slate-50 dark:bg-[#090d14] border border-slate-200 dark:border-slate-800/60 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
              Observed Metrics
            </span>
            {tradeCount > 0 && (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                <BarChart2 className="w-3 h-3 text-slate-400" />
                {tradeCount} Trades Involved
              </span>
            )}
          </div>

          <p className="text-xs text-slate-700 dark:text-slate-300 font-mono text-[11px] leading-relaxed">
            {leak.evidence}
          </p>

          {tradeCount > 0 && (
            <SampleSizeWarning tradeCount={tradeCount} threshold={30} />
          )}
        </div>
      </div>

      {/* Suggested Guardrail Rule & Terminal Backtest Link */}
      {rule && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-semibold text-xs">
              <Shield className="w-3 h-3 text-slate-400 dark:text-slate-500" />
              <span>Recommended Guardrail: {rule.rule_name}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
              {rule.rationale}
            </p>
          </div>

          <Link
            href={deepLink}
            data-testid="test-rule-link"
            className="w-full py-2 px-3 rounded-[4px] bg-slate-100 dark:bg-[#131b29] hover:bg-slate-200 dark:hover:bg-[#1c263a] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center justify-between transition-colors"
          >
            <span>Test This Rule in Rule Lab</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
          </Link>
        </div>
      )}
    </div>
  );
}
