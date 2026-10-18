"use client";

import React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Sliders, Play, X } from "lucide-react";

export function RuleLabPrefillBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const prefillRule = searchParams.get("prefillRule");
  if (!prefillRule) return null;

  // Extract all other query parameters as rule parameters
  const params: Record<string, string> = {};
  searchParams.forEach((val, key) => {
    if (key !== "prefillRule") {
      params[key] = val;
    }
  });

  const ruleDisplayTitle = (() => {
    switch (prefillRule) {
      case "COOL_OFF_AFTER_LOSS":
        return "Post-Loss Cooldown Window";
      case "MAX_DAILY_TRADES_LIMIT":
        return "Daily Max Trade Limit";
      case "TIMED_LOSS_CUTOFF":
        return "Timed Loss Liquidation Cutoff";
      case "RE_ENTRY_TILT":
        return "15-Minute Cooldown After Loss";
      case "OVERTRADING":
        return "Max 5 Trades Per Market Session";
      case "HOLDING_LOSERS":
        return "10-Minute Maximum Holding Cutoff for Losers";
      default:
        return prefillRule.replace(/_/g, " ");
    }
  })();

  const clearPrefill = () => {
    router.replace("/rule-lab");
  };

  return (
    <div
      data-testid="rule-lab-prefill-banner"
      className="p-4 rounded-[4px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1017] space-y-3"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] text-[10px] font-semibold tracking-wider uppercase bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-mono">
            <Sliders className="w-3 h-3 text-slate-400 dark:text-slate-500" />
            <span>Pre-filled Configuration</span>
          </div>

          <h3 className="text-xs font-bold text-slate-900 dark:text-white pt-0.5">
            Rule Configured: {ruleDisplayTitle}
          </h3>

          <p className="text-xs text-slate-600 dark:text-slate-400">
            Parameters pre-loaded from diagnostic audit to simulate counter-factual guardrail impact.
          </p>
        </div>

        <button
          type="button"
          onClick={clearPrefill}
          className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title="Clear prefill"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Extracted Parameters List */}
      <div className="flex flex-wrap gap-2 pt-1">
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 self-center">
          Active Parameters:
        </span>
        {Object.entries(params).length > 0 ? (
          Object.entries(params).map(([k, v]) => (
            <span
              key={k}
              className="px-2 py-0.5 rounded-[3px] text-[11px] font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
            >
              {k}: <strong className="font-semibold text-slate-900 dark:text-white">{v}</strong>
            </span>
          ))
        ) : (
          <span className="px-2 py-0.5 rounded-[3px] text-[11px] font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
            default: <strong className="font-semibold text-slate-900 dark:text-white">enabled</strong>
          </span>
        )}
      </div>

      <div className="pt-1 flex items-center gap-3">
        <button
          type="button"
          className="btn-zerodha-primary text-xs py-1.5 px-3.5 inline-flex items-center space-x-1.5"
          onClick={() => {
            alert(`Running deterministic replay backtest for ${ruleDisplayTitle} with 70/30 train/test split.`);
          }}
        >
          <Play className="w-3 h-3 fill-current" />
          <span>Execute Backtest (70/30 Replay)</span>
        </button>
      </div>
    </div>
  );
}
