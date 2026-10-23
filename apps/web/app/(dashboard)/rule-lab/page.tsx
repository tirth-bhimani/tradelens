"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Beaker,
  ArrowRight,
  ShieldAlert,
  Info,
  BookOpen,
  UploadCloud,
} from "lucide-react";
import { RuleBuilder } from "@/components/rule-lab/rule-builder";
import { BacktestResultView } from "@/components/rule-lab/backtest-result-view";
import { ReplayResult, runReplayApi, RuleReplayTrade } from "@/lib/rules/types";
import { getUserTradesAction } from "@/lib/trades/actions";

function RuleLabContent() {
  const searchParams = useSearchParams();
  const prefillRule = searchParams.get("prefillRule");

  // Extract query params for pre-filling
  const prefillParams: Record<string, string> = {};
  searchParams.forEach((val, key) => {
    if (key !== "prefillRule") {
      prefillParams[key] = val;
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [replayResult, setReplayResult] = useState<ReplayResult | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [userTrades, setUserTrades] = useState<RuleReplayTrade[] | null>(null);

  useEffect(() => {
    getUserTradesAction().then((res) => {
      if (res.trades && res.trades.length > 0) {
        const replayMapped: RuleReplayTrade[] = res.trades.map((t) => ({
          id: t.id,
          symbol: t.symbol,
          segment: t.segment === "FNO" ? "OPTIONS" : "EQUITY_INTRADAY",
          instrument_type: t.segment === "FNO" ? "CE" : "EQ",
          is_short: false,
          is_intraday: true,
          entry_time: t.entryTime,
          exit_time: t.exitTime,
          trade_duration_seconds: 1800,
          quantity: t.quantity,
          entry_price: t.entryPrice,
          exit_price: t.exitPrice,
          gross_pnl: t.grossPnl,
          charges: t.charges,
          net_pnl: t.netPnl,
        }));
        setUserTrades(replayMapped);
      }
    });
  }, []);

  const handleRunReplay = async (rule: any) => {
    setIsLoading(true);
    setSimulationError(null);
    try {
      if (!userTrades || userTrades.length === 0) {
        setSimulationError(
          "No tradebook data found. Please import your broker tradebook before executing rule backtest simulations."
        );
        setIsLoading(false);
        return;
      }
      const res = await runReplayApi(rule, userTrades, 100000);
      setReplayResult(res);
    } catch (err: any) {
      setSimulationError(err.message || "Failed to execute backtest simulation.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="card-luminous p-6 sm:p-7 relative overflow-hidden transition-all duration-200 border border-slate-200/80 dark:border-white/[0.08] rounded-[8px] bg-white dark:bg-[#090e1a] shadow-sm">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 w-80 h-80 rounded-full bg-blue-500/10 dark:bg-blue-600/10 blur-3xl"
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-[5px] bg-slate-100 dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 text-xs font-mono border border-slate-200 dark:border-white/[0.08]">
              <Beaker className="w-3.5 h-3.5 text-[#2b7fff]" />
              <span>RULE LAB • DETERMINISTIC REPLAY</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Trading Rule Lab
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Design behavioral risk guardrails from the canonical catalog (post-loss cooldowns, session trade limits, loss cutoffs) and simulate their counter-factual impact against past trades with a 70/30 train/test split.
            </p>
          </div>

          <div className="shrink-0 flex items-center space-x-3">
            <Link
              href="/imports"
              className="kiro-btn-cta !h-9 !px-4 text-xs font-bold inline-flex items-center space-x-1.5 shadow-[0_0_15px_-3px_rgba(43,127,255,0.4)]"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Import Tradebook</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Institutional Disclaimer Banner */}
      <div
        data-testid="disclaimer-banner"
        className="p-3.5 rounded-[5px] border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/80 dark:bg-white/[0.03] text-slate-600 dark:text-slate-400 text-xs flex items-start space-x-2.5"
      >
        <Info className="w-4 h-4 text-[#2b7fff] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Institutional Disclaimer:</strong> Replay backtesting is a counter-factual mathematical approximation based on past trade fills. Live market order queue priorities, bid-ask slippage, and real-time execution adherence may differ from simulated outcomes.
        </p>
      </div>

      {/* Tradebook Requirement / Small Sample Notice */}
      {(!userTrades || userTrades.length === 0) && (
        <div className="p-4 rounded-[6px] border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>Tradebook Required:</strong> You have not imported any trade records yet. Import your broker tradebook to backtest rules against your personal trading execution history.
            </span>
          </div>
          <Link
            href="/imports"
            className="shrink-0 kiro-btn-cta !h-7 !px-3 text-[11px] font-bold inline-flex items-center space-x-1 shadow-sm"
          >
            <UploadCloud className="w-3 h-3" />
            <span>Import Now</span>
          </Link>
        </div>
      )}

      {userTrades && userTrades.length > 0 && userTrades.length < 5 && (
        <div className="p-3.5 rounded-[5px] border border-blue-200/80 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 text-xs flex items-center space-x-2.5">
          <Info className="w-4 h-4 shrink-0 text-[#2b7fff]" />
          <span>
            <strong>Small Sample Notice:</strong> You have {userTrades.length} trades imported. Backtest simulations will run against your real trades, but statistical significance improves with &gt; 20 trades.
          </span>
        </div>
      )}

      {/* Error Banner */}
      {simulationError && (
        <div className="p-3.5 rounded-[5px] border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2 font-medium">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{simulationError}</span>
        </div>
      )}

      {/* Rule Builder Input Interface */}
      <RuleBuilder
        onRunReplay={handleRunReplay}
        isLoading={isLoading}
        initialRuleType={prefillRule}
        initialParams={prefillParams}
      />

      {/* Backtest Results View */}
      {replayResult && (
        <BacktestResultView
          result={replayResult}
          onReset={() => setReplayResult(null)}
        />
      )}
    </div>
  );
}

export default function RuleLabPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400 font-mono">Loading Rule Lab...</div>}>
      <RuleLabContent />
    </Suspense>
  );
}
