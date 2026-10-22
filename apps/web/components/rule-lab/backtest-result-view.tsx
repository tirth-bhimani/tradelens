"use client";

import React, { useState } from "react";
import {
  BookmarkPlus,
  RotateCcw,
  CheckCircle2,
  Sliders,
  Sparkles,
} from "lucide-react";
import { ReplayResult } from "@/lib/rules/types";
import { saveRuleAction } from "@/lib/rules/rulebook-actions";
import { ComparisonMetrics } from "./comparison-metrics";
import { DualEquityChart } from "./dual-equity-chart";
import { SplitMetricsCard } from "./split-metrics-card";
import { SkippedTradesTable } from "./skipped-trades-table";

export interface BacktestResultViewProps {
  result: ReplayResult;
  onReset: () => void;
  onSaveRule?: (ruleType: string) => void;
}

export function BacktestResultView({
  result,
  onReset,
  onSaveRule,
}: BacktestResultViewProps) {
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveRuleAction({
        rule_type: result.rule_type,
        rule_payload: { rule_type: result.rule_type },
        natural_language_text: `Verified guardrail: ${result.rule_type} simulated in Rule Lab.`,
        is_active: true,
      });
      setSavedSuccess(true);
      if (onSaveRule) onSaveRule(result.rule_type);
    } catch {
      // Handled gracefully
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="backtest-result-view">
      {/* Comparative KPI Metrics Grid */}
      <ComparisonMetrics
        before={result.overall_before}
        after={result.overall_after}
        delta={result.delta}
      />

      {/* Dual Equity Curve Time-series */}
      <DualEquityChart points={result.dual_equity_curve} />

      {/* 70/30 Train/Test Validation & Overfitting Detection Card */}
      <SplitMetricsCard
        train={result.train_metrics}
        test={result.test_metrics}
        isOverfit={result.is_overfit}
        overfitReason={result.overfit_reason}
        smallSampleWarning={result.small_sample_warning}
        smallSampleReason={result.small_sample_reason}
      />

      {/* Disqualified Trades Ledger & Avoided Loss Summary */}
      <SkippedTradesTable
        trades={result.skipped_trades}
        summary={result.skipped_summary}
      />

      {/* Footer Action Ribbon */}
      <div className="card-luminous flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-[8px] border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] shadow-sm transition-all duration-200">
        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          Simulation for <strong className="text-slate-900 dark:text-white">{result.rule_type}</strong> • 100% Deterministic Replay
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onReset}
            className="kiro-btn-outline !h-9 !px-4 text-xs font-semibold inline-flex items-center space-x-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Modify Parameters</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={savedSuccess}
            className="kiro-btn-cta !h-9 !px-4 text-xs font-bold inline-flex items-center space-x-1.5 shadow-[0_0_18px_rgba(43,127,255,0.45)] disabled:opacity-75 transition-all"
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Saved to Rulebook</span>
              </>
            ) : (
              <>
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>Save to Rulebook</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
