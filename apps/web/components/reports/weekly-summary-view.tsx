"use client";

import React, { useState } from "react";
import { WeeklyReportSummary } from "@/lib/reports/report-types";
import { generateWeeklyReportAction } from "@/lib/reports/report-actions";
import {
  Printer,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  Receipt,
  CheckCircle2,
  HelpCircle,
  FileText,
  Loader2,
} from "lucide-react";

interface WeeklySummaryViewProps {
  report: WeeklyReportSummary;
  onReportGenerated?: (newReport: WeeklyReportSummary) => void;
}

export function WeeklySummaryView({ report, onReportGenerated }: WeeklySummaryViewProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationMsg, setGenerationMsg] = useState<string | null>(null);

  const isProfit = report.net_pnl >= 0;
  const pnlSign = isProfit ? "+" : "";
  const formattedNetPnl = `${pnlSign}₹${report.net_pnl.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const formattedGrossPnl = `₹${report.gross_pnl.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const formattedCharges = `₹${report.total_charges.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleGenerateOnDemand = async () => {
    setIsGenerating(true);
    setGenerationMsg(null);
    try {
      const res = await generateWeeklyReportAction();
      if (res.success && res.report) {
        setGenerationMsg("Weekly report generated successfully.");
        if (onReportGenerated) {
          onReportGenerated(res.report);
        }
      } else {
        setGenerationMsg(res.error || "Generation failed.");
      }
    } catch {
      setGenerationMsg("An error occurred during generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 print:space-y-4 printable-report">
      {/* Top Action Bar (Hidden in Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-slate-800 print:hidden shadow-sm">
        <div className="flex items-center space-x-2.5">
          <Calendar className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
            Selected Week: <strong className="text-slate-900 dark:text-white">{report.week_start_date}</strong> to{" "}
            <strong className="text-slate-900 dark:text-white">{report.week_end_date}</strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* On-Demand Generate Action */}
          <button
            onClick={handleGenerateOnDemand}
            disabled={isGenerating}
            className="kiro-btn-outline !h-8 !px-3 text-xs font-semibold inline-flex items-center space-x-1.5"
            title="Compile fresh weekly summary report"
          >
            {isGenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span>Generate Report Now</span>
          </button>

          {/* Print / Save PDF Trigger */}
          <button
            onClick={handlePrint}
            className="kiro-btn-primary !h-8 !px-3.5 text-xs font-semibold inline-flex items-center space-x-1.5"
            title="Print or export as clean PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {generationMsg && (
        <div className="p-3 text-xs rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium print:hidden">
          {generationMsg}
        </div>
      )}

      {/* Interactive On-Screen Report (Hidden when Printing) */}
      <div className="space-y-6 print:hidden">
        {/* Report Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold">
                TradeLens Weekly Audit
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
                Performance &amp; Behavioral Digest
              </h1>
            </div>
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Week of {report.week_start_date} &rarr; {report.week_end_date}
            </div>
          </div>
        </div>

        {/* Net P&L Hero Card */}
        <div className="card-luminous p-6 sm:p-7 relative overflow-hidden transition-colors border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                Weekly Net P&amp;L (After All Charges &amp; Brokerage)
              </span>
              <div
                className={`text-3xl sm:text-4xl md:text-5xl font-black font-mono tracking-tight ${
                  isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {formattedNetPnl}
              </div>
              <div className="flex items-center space-x-3 text-xs text-slate-600 dark:text-slate-400 pt-1">
                <span>
                  Gross P&amp;L: <strong className="text-slate-900 dark:text-white font-mono">{formattedGrossPnl}</strong>
                </span>
                <span>&bull;</span>
                <span>
                  Statutory Charges: <strong className="text-rose-600 dark:text-rose-400 font-mono">-{formattedCharges}</strong>
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-4 md:pt-0 md:pl-6 text-xs font-mono">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Total Executions:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{report.total_trades}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Winning Trades:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{report.winning_trades}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Losing Trades:</span>
                <span className="font-semibold text-rose-600 dark:text-rose-400">{report.losing_trades}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4-Card Performance Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Win Rate */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Win Rate
            </span>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {report.win_rate}%
            </div>
            <div className="text-[11px] text-slate-500">
              {report.winning_trades} wins &middot; {report.losing_trades} losses
            </div>
          </div>

          {/* Rule Adherence */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Rule Adherence
            </span>
            <div className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400">
              {report.adherence_score}%
            </div>
            <div className="text-[11px] text-slate-500">
              {report.rule_violations_count} rule violations logged
            </div>
          </div>

          {/* Best Day */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Best Day
            </span>
            <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 truncate">
              {report.best_day_date ? `+₹${report.best_day_pnl.toLocaleString("en-IN")}` : "N/A"}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              {report.best_day_date || "No trades"}
            </div>
          </div>

          {/* Worst Day */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Worst Day
            </span>
            <div className="text-base font-bold font-mono text-rose-600 dark:text-rose-400 truncate">
              {report.worst_day_date ? `₹${report.worst_day_pnl.toLocaleString("en-IN")}` : "N/A"}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              {report.worst_day_date || "No trades"}
            </div>
          </div>
        </div>

        {/* Top Behavioral Leak Banner */}
        {report.top_behavioral_leak && (
          <div className="p-4 sm:p-5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-900 dark:text-rose-200">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Primary Behavioral Leak Detected
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {report.top_behavioral_leak}
                </div>
                <div className="text-xs text-rose-700 dark:text-rose-300">
                  Estimated P&amp;L damage:{" "}
                  <strong className="font-mono">
                    -₹{report.top_leak_loss.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </strong>
                  . Re-evaluate entry rules to stop repeated tilt losses.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actionable Focus Item Banner */}
        <div className="p-5 sm:p-6 rounded-xl bg-sky-50 dark:bg-[#0a1b2d] border border-sky-200 dark:border-sky-500/30 text-sky-900 dark:text-sky-100">
          <div className="flex items-start space-x-3.5">
            <Sparkles className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <span className="text-[11px] uppercase tracking-wider font-bold text-sky-600 dark:text-sky-400">
                Actionable Focus For Next Week
              </span>
              <p className="text-sm sm:text-base font-medium leading-relaxed">
                {report.focus_item}
              </p>
            </div>
          </div>
        </div>

        {/* Daily Breakdown Table */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1222] overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Daily Execution Ledger
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {report.daily_breakdown.length} active sessions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Trades</th>
                  <th className="px-4 py-3">Win/Loss</th>
                  <th className="px-4 py-3">Gross P&amp;L</th>
                  <th className="px-4 py-3">Charges</th>
                  <th className="px-4 py-3">Net P&amp;L</th>
                  <th className="px-4 py-3">Win Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {report.daily_breakdown.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                      No trading activity recorded for this period.
                    </td>
                  </tr>
                ) : (
                  report.daily_breakdown.map((day) => {
                    const dayProfit = day.net_pnl >= 0;
                    return (
                      <tr key={day.trade_date} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                          {day.trade_date}
                        </td>
                        <td className="px-4 py-3">{day.trades_count}</td>
                        <td className="px-4 py-3 text-slate-500">
                          <span className="text-emerald-600 dark:text-emerald-400">{day.winning_trades}W</span> /{" "}
                          <span className="text-rose-600 dark:text-rose-400">{day.losing_trades}L</span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          ₹{day.gross_pnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-rose-600 dark:text-rose-400">
                          -₹{day.total_charges.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td
                          className={`px-4 py-3 font-bold ${
                            dayProfit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {dayProfit ? "+" : ""}₹{day.net_pnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3">{day.win_rate}%</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Statutory Charges Breakdown */}
        {report.charges_breakdown && Object.keys(report.charges_breakdown).length > 0 && (
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1222] space-y-3">
            <div className="flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Statutory Regulatory Charges &amp; Brokerage Breakdown
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase">Brokerage</span>
                <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                  ₹{Number(report.charges_breakdown.brokerage || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase">STT / CTT</span>
                <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                  ₹{Number(report.charges_breakdown.stt || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase">Exchange Turnover</span>
                <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                  ₹{Number(report.charges_breakdown.exchange_turnover || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase">GST</span>
                <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                  ₹{Number(report.charges_breakdown.gst || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase">Stamp Duty</span>
                <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                  ₹{Number(report.charges_breakdown.stamp_duty || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          PRINT-ONLY FORMAL AUDIT STATEMENT (Simple Report Paper Format)
          Renders ONLY when printing or exporting to PDF via window.print()
          ========================================================================= */}
      <div className="hidden print:block text-slate-900 bg-white font-sans text-[11pt] leading-normal print-simple-report space-y-6 p-2">
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-3">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xl font-black uppercase tracking-tight text-slate-950">
                TradeLens &middot; Performance &amp; Discipline Audit
              </div>
              <p className="text-xs text-slate-600 mt-0.5 font-medium">
                Official Weekly Trade Performance, Rulebook Adherence &amp; Behavioral Risk Statement
              </p>
            </div>
            <div className="text-right text-xs font-mono text-slate-700 space-y-0.5">
              <div><strong>Audit Period:</strong> {report.week_start_date} to {report.week_end_date}</div>
              <div><strong>Status:</strong> Verified Final</div>
              <div><strong>Currency:</strong> Indian Rupee (INR)</div>
            </div>
          </div>
        </div>

        {/* Section 1: Executive Financial & Execution Summary Table */}
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1">
            1. Executive Financial &amp; Execution Summary
          </div>
          <table className="w-full text-xs border border-slate-300 border-collapse">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="p-2 bg-slate-50 font-semibold w-1/4 border-r border-slate-200">Weekly Net P&amp;L:</td>
                <td className="p-2 font-bold font-mono text-sm w-1/4 border-r border-slate-200">
                  {isProfit ? "+" : ""}₹{report.net_pnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
                <td className="p-2 bg-slate-50 font-semibold w-1/4 border-r border-slate-200">Rule Adherence Rate:</td>
                <td className="p-2 font-bold font-mono w-1/4">
                  {report.adherence_score}% ({report.rule_violations_count} breaches)
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-2 bg-slate-50 font-semibold border-r border-slate-200">Gross Trading P&amp;L:</td>
                <td className="p-2 font-mono border-r border-slate-200">
                  ₹{report.gross_pnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
                <td className="p-2 bg-slate-50 font-semibold border-r border-slate-200">Win Rate:</td>
                <td className="p-2 font-mono">
                  {report.win_rate}% ({report.winning_trades}W / {report.losing_trades}L)
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-2 bg-slate-50 font-semibold border-r border-slate-200">Regulatory Charges &amp; Brokerage:</td>
                <td className="p-2 font-mono text-slate-800 border-r border-slate-200">
                  -₹{report.total_charges.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
                <td className="p-2 bg-slate-50 font-semibold border-r border-slate-200">Total Round-Trip Trades:</td>
                <td className="p-2 font-mono">{report.total_trades} executions</td>
              </tr>
              <tr>
                <td className="p-2 bg-slate-50 font-semibold border-r border-slate-200">Best Trading Session:</td>
                <td className="p-2 font-mono border-r border-slate-200">
                  {report.best_day_date ? `${report.best_day_date} (+₹${report.best_day_pnl.toLocaleString("en-IN")})` : "N/A"}
                </td>
                <td className="p-2 bg-slate-50 font-semibold border-r border-slate-200">Worst Trading Session:</td>
                <td className="p-2 font-mono">
                  {report.worst_day_date ? `${report.worst_day_date} (₹${report.worst_day_pnl.toLocaleString("en-IN")})` : "N/A"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 2: Behavioral Risk Assessment & Actionable Focus */}
        <div className="border border-slate-300 p-3.5 bg-slate-50 rounded">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
            2. Behavioral Risk Assessment &amp; Next Week Focus
          </div>
          <div className="space-y-1.5 text-xs">
            {report.top_behavioral_leak && (
              <div>
                <span className="font-semibold text-slate-900">Primary Leak Detected: </span>
                <span className="text-slate-800">{report.top_behavioral_leak} </span>
                <span className="font-mono text-slate-700">(Estimated Drag: -₹{report.top_leak_loss.toLocaleString("en-IN", { minimumFractionDigits: 2 })})</span>
              </div>
            )}
            <div>
              <span className="font-semibold text-slate-900">Mandatory Actionable Focus: </span>
              <span className="italic text-slate-800">{report.focus_item}</span>
            </div>
          </div>
        </div>

        {/* Section 3: Daily Execution Ledger */}
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1">
            3. Daily Trading Sessions &amp; Net Ledger
          </div>
          <table className="w-full text-xs border border-slate-300 border-collapse text-left">
            <thead className="bg-slate-100 border-b border-slate-300 font-semibold">
              <tr>
                <th className="p-2 border-r border-slate-300">Date</th>
                <th className="p-2 border-r border-slate-300">Trades</th>
                <th className="p-2 border-r border-slate-300">Win / Loss</th>
                <th className="p-2 border-r border-slate-300 text-right">Gross P&amp;L</th>
                <th className="p-2 border-r border-slate-300 text-right">Charges</th>
                <th className="p-2 border-r border-slate-300 text-right">Net P&amp;L</th>
                <th className="p-2 text-right">Win Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {report.daily_breakdown.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-3 text-center text-slate-500 font-sans">
                    No active sessions recorded during this period.
                  </td>
                </tr>
              ) : (
                report.daily_breakdown.map((d) => (
                  <tr key={d.trade_date}>
                    <td className="p-2 border-r border-slate-200 font-sans font-medium">{d.trade_date}</td>
                    <td className="p-2 border-r border-slate-200">{d.trades_count}</td>
                    <td className="p-2 border-r border-slate-200">{d.winning_trades}W / {d.losing_trades}L</td>
                    <td className="p-2 border-r border-slate-200 text-right">₹{d.gross_pnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td className="p-2 border-r border-slate-200 text-right">-₹{d.total_charges.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td className="p-2 border-r border-slate-200 text-right font-bold">
                      {d.net_pnl >= 0 ? "+" : ""}₹{d.net_pnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-2 text-right">{d.win_rate}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Section 4: Statutory Charges & Brokerage Breakdown */}
        {report.charges_breakdown && Object.keys(report.charges_breakdown).length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1">
              4. Statutory Charges &amp; Brokerage Itemization (INR)
            </div>
            <table className="w-full text-xs border border-slate-300 border-collapse font-mono">
              <thead className="bg-slate-100 border-b border-slate-300 font-sans font-semibold">
                <tr>
                  <th className="p-2 border-r border-slate-300 text-left">Brokerage</th>
                  <th className="p-2 border-r border-slate-300 text-left">STT / CTT</th>
                  <th className="p-2 border-r border-slate-300 text-left">Exchange Turnover</th>
                  <th className="p-2 border-r border-slate-300 text-left">GST (18%)</th>
                  <th className="p-2 border-r border-slate-300 text-left">Stamp Duty</th>
                  <th className="p-2 text-right">Total Charges</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border-r border-slate-200">₹{Number(report.charges_breakdown.brokerage || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td className="p-2 border-r border-slate-200">₹{Number(report.charges_breakdown.stt || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td className="p-2 border-r border-slate-200">₹{Number(report.charges_breakdown.exchange_turnover || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td className="p-2 border-r border-slate-200">₹{Number(report.charges_breakdown.gst || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td className="p-2 border-r border-slate-200">₹{Number(report.charges_breakdown.stamp_duty || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td className="p-2 font-bold text-right">-₹{report.total_charges.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Section 5: Formal Statement Footer */}
        <div className="border-t border-slate-300 pt-3 text-[9pt] text-slate-500 flex justify-between items-center">
          <div>TradeLens Journal &middot; Strictly Confidential Trading Performance Statement</div>
          <div>Audit Document &middot; Page 1 of 1</div>
        </div>
      </div>
    </div>
  );
}
