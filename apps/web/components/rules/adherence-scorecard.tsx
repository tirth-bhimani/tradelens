"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  CheckCircle2,
  Sliders,
} from "lucide-react";
import type { AdherenceReport } from "@/lib/rules/adherence-types";
import { formatCurrencyINR } from "@/lib/utils/format";

export interface AdherenceScorecardProps {
  report: AdherenceReport;
  className?: string;
}

export function AdherenceScorecard({ report, className = "" }: AdherenceScorecardProps) {
  const score = report.discipline_score_pct;

  const getGradeInfo = () => {
    if (score >= 90) {
      return {
        label: "Institutional Grade",
        color: "text-emerald-600 dark:text-emerald-400",
        badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        summary: "Exceptional execution discipline honoring rule guardrails.",
      };
    }
    if (score >= 75) {
      return {
        label: "Disciplined",
        color: "text-sky-600 dark:text-sky-400",
        badgeBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
        summary: "Solid rule adherence with occasional impulsive entries.",
      };
    }
    if (score >= 60) {
      return {
        label: "Moderate Tilt Drift",
        color: "text-amber-600 dark:text-amber-400",
        badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        summary: "Systemic rule breaches contributing to avoidable drawdown.",
      };
    }
    return {
      label: "Severe Risk Tilt",
      color: "text-rose-600 dark:text-rose-400",
      badgeBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
      summary: "High emotional tilt frequency severely compromising trading edge.",
    };
  };

  const grade = getGradeInfo();

  return (
    <div
      data-testid="adherence-scorecard"
      className={`card-luminous p-5 sm:p-6 rounded-[8px] border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] shadow-sm space-y-5 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded-[4px] bg-[#2b7fff]/10 text-[#2b7fff] border border-[#2b7fff]/20">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold font-mono tracking-tight text-slate-900 dark:text-white">
              Rulebook Execution Discipline Scorecard
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Automated verification evaluating recent round-trip trades against active portfolio guardrails.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <span className={`px-2.5 py-0.5 rounded-[4px] border text-xs font-mono font-bold ${grade.badgeBg}`}>
            {grade.label}
          </span>
          <Link
            href="/rules"
            className="kiro-btn-outline !h-7 !px-2.5 text-[11px] font-semibold inline-flex items-center space-x-1"
          >
            <span>Manage Rules</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-white/[0.08] border border-slate-200/80 dark:border-white/[0.08] rounded-[6px] overflow-hidden bg-slate-50/50 dark:bg-white/[0.02]">
        {/* Metric 1: Discipline Score */}
        <div className="p-4 space-y-1">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Net Adherence Score
          </div>
          <div className={`text-2xl sm:text-3xl font-extrabold font-mono tabular-nums ${grade.color}`}>
            {score.toFixed(1)}%
          </div>
          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            {report.total_adhering_trades} of {report.total_trades_evaluated} trades honored rules
          </div>
        </div>

        {/* Metric 2: Rule Violations Count */}
        <div className="p-4 space-y-1">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Rule Violations Detected
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
            {report.total_violating_trades} Trades
          </div>
          <div className="text-[11px] font-mono text-rose-500">
            {report.total_violating_trades > 0 ? "Compromised risk parameters" : "Clean execution"}
          </div>
        </div>

        {/* Metric 3: Avoidable Losses Incurred */}
        <div className="p-4 space-y-1">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Avoidable Losses Incurred
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-rose-600 dark:text-rose-400 tabular-nums">
            -{formatCurrencyINR(report.total_avoidable_losses_incurred)}
          </div>
          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            Losses on rule-violating trades
          </div>
        </div>
      </div>

      {/* Rules Breakdown Mini-Matrix */}
      {report.rules_breakdown.length > 0 && (
        <div className="space-y-2.5 pt-1">
          <div className="text-xs font-bold font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Per-Rule Adherence Breakdown</span>
            <span>Adherence Rate</span>
          </div>

          <div className="space-y-2">
            {report.rules_breakdown.map((r) => (
              <div
                key={r.rule_id}
                className="p-2.5 rounded-[5px] bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${r.violations_count > 0 ? "bg-rose-500" : "bg-emerald-500"}`} />
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {r.rule_type}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    ({r.violations_count} breaches)
                  </span>
                </div>

                <div className="flex items-center space-x-3 font-mono">
                  {r.avoidable_loss_incurred > 0 && (
                    <span className="text-rose-600 dark:text-rose-400 text-[11px]">
                      -{formatCurrencyINR(r.avoidable_loss_incurred)}
                    </span>
                  )}
                  <span
                    className={`font-bold tabular-nums ${
                      r.adherence_pct >= 90
                        ? "text-emerald-600 dark:text-emerald-400"
                        : r.adherence_pct >= 75
                        ? "text-sky-600 dark:text-sky-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {r.adherence_pct.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
