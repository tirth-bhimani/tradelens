import React from "react";
import Link from "next/link";
import { Activity, Beaker, BookOpen, UploadCloud, ArrowRight } from "lucide-react";
import { InsightsSection } from "@/components/insights/insights-section";
import { getAiInsightsAction } from "@/lib/insights/actions";

export const metadata = {
  title: "AI Behavioral Execution Audit | TradeLens",
  description: "Objective diagnostic analysis of capital leaks, revenge trading spirals, and rule recommendations powered by AI.",
};

export default async function InsightsPage() {
  const { report, totalTradesAnalyzed, hasRealTrades } = await getAiInsightsAction();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="card-luminous p-6 sm:p-7 relative overflow-hidden transition-colors border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] shadow-sm">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 w-80 h-80 rounded-full bg-blue-500/10 dark:bg-blue-600/10 blur-3xl"
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-[5px] bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 text-xs font-mono font-medium">
              <Activity className="w-3.5 h-3.5 text-[#2b7fff]" />
              <span>AI EXECUTION DIAGNOSTICS • QUANTITATIVE AUDIT</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Behavioral Execution Audit
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 max-w-xl">
              Objective diagnostic analysis cross-referencing your trading execution against standard risk guardrails to identify capital leaks and recommend rule parameters.
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            <Link
              href="/rule-lab"
              className="kiro-btn-outline !h-9 !px-4 text-xs font-semibold inline-flex items-center space-x-1.5"
            >
              <Beaker className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Rule Lab</span>
            </Link>
            <Link
              href="/trades"
              className="kiro-btn-cta !h-9 !px-4 text-xs font-bold inline-flex items-center space-x-1.5 shadow-[0_0_15px_-3px_rgba(43,127,255,0.4)]"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Trade Journal</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Insights Section or Zero Trades Onboarding */}
      {!hasRealTrades || totalTradesAnalyzed === 0 ? (
        <div className="p-8 md:p-10 card-luminous border-dashed border-slate-300 dark:border-white/[0.12] bg-slate-50/50 dark:bg-[#070b14] hover:border-[#2b7fff]/50 text-center space-y-4 transition-all">
          <div className="w-10 h-10 rounded-[6px] bg-white dark:bg-white/[0.06] text-[#2b7fff] border border-slate-200 dark:border-white/[0.1] mx-auto flex items-center justify-center shadow-sm">
            <UploadCloud className="w-5 h-5" />
          </div>

          <div className="max-w-md mx-auto space-y-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">No Ingested Trades to Audit</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Upload your broker tradebook CSV to trigger automated behavioral diagnostics, identify capital leaks (revenge trading, overtrading), and receive tailored AI rule recommendations.
            </p>
          </div>

          <div className="pt-1">
            <Link
              href="/imports"
              className="kiro-btn-cta !h-9 !px-4 text-xs font-bold inline-flex items-center space-x-1.5 shadow-[0_0_15px_-3px_rgba(43,127,255,0.4)]"
            >
              <span>Upload Tradebook</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </div>
        </div>
      ) : (
        <InsightsSection report={report} totalTradesAnalyzed={totalTradesAnalyzed} />
      )}
    </div>
  );
}
