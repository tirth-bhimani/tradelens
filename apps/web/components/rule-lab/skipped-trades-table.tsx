"use client";

import React, { useState, useMemo } from "react";
import {
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertTriangle,
  MinusCircle,
  HelpCircle,
} from "lucide-react";
import { SkippedTradeDetail, SkippedTradesSummary } from "@/lib/rules/types";
import { formatCurrencyINR } from "@/lib/utils/format";

export interface SkippedTradesTableProps {
  trades: SkippedTradeDetail[];
  summary: SkippedTradesSummary;
}

export function SkippedTradesTable({ trades, summary }: SkippedTradesTableProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTrades = useMemo(() => {
    if (!searchTerm.trim()) return trades;
    const q = searchTerm.toLowerCase();
    return trades.filter(
      (t) =>
        t.symbol.toLowerCase().includes(q) ||
        t.reason.toLowerCase().includes(q) ||
        t.rule_type.toLowerCase().includes(q)
    );
  }, [trades, searchTerm]);

  const netSavings = Number(summary.net_savings_inr);
  const isPositiveSavings = netSavings > 0;

  return (
    <div
      data-testid="skipped-trades-table"
      className="p-5 sm:p-6 border border-slate-200/80 dark:border-white/[0.08] rounded-[6px] bg-white dark:bg-[#090e1a] space-y-4 shadow-sm transition-all duration-200"
    >
      {/* Header and Summary Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div className="space-y-0.5">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <span>Disqualified Trades Ledger</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
              {summary.total_skipped} Disqualified
            </span>
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Granular breakdown of avoided losses and sacrificed winning trades prevented by the rule.
          </p>
        </div>

        {/* Financial Edge Summary */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <div className="px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400">
            <span className="text-[10px] uppercase font-sans text-emerald-800 dark:text-emerald-500 mr-1.5">
              Avoided Loss:
            </span>
            <strong>+{formatCurrencyINR(Number(summary.loss_avoided_inr))}</strong>{" "}
            <span className="text-[10px] opacity-75">({summary.losing_trades_avoided_count}L)</span>
          </div>

          <div className="px-2.5 py-1 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400">
            <span className="text-[10px] uppercase font-sans text-rose-800 dark:text-rose-500 mr-1.5">
              Sacrificed Win:
            </span>
            <strong>-{formatCurrencyINR(Number(summary.profit_sacrificed_inr))}</strong>{" "}
            <span className="text-[10px] opacity-75">({summary.winning_trades_sacrificed_count}W)</span>
          </div>

          <div
            className={`px-2.5 py-1 rounded border font-bold ${
              isPositiveSavings
                ? "bg-[#387ed1]/10 text-[#387ed1] border-[#387ed1]/30"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
            }`}
          >
            <span className="text-[10px] uppercase font-sans mr-1.5">Net Edge:</span>
            <span>
              {isPositiveSavings ? "+" : ""}
              {formatCurrencyINR(netSavings)}
            </span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {trades.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search skipped trades by symbol or reason..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#387ed1]"
          />
        </div>
      )}

      {/* Table Content */}
      {trades.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
          <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
          <div className="font-semibold text-slate-700 dark:text-slate-300">
            Zero Trade Violations
          </div>
          <p className="text-[11px]">
            All executed trades adhered fully to the active rule parameters.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="sticky top-0 bg-white dark:bg-[#0c1017] border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 z-10">
              <tr>
                <th className="py-2 pr-3 font-semibold font-sans">Timestamp (IST)</th>
                <th className="py-2 px-3 font-semibold">Symbol</th>
                <th className="py-2 px-3 font-semibold">Avoided Net P&L</th>
                <th className="py-2 pl-3 font-semibold font-sans">Disqualification Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredTrades.map((t, idx) => {
                const pnl = Number(t.net_pnl);
                const isLossAvoided = pnl < 0;

                return (
                  <tr
                    key={t.trade_id || idx}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition"
                  >
                    <td className="py-2 pr-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {t.entry_time.slice(0, 16).replace("T", " ")}
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {t.symbol}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                          isLossAvoided
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold"
                            : "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {isLossAvoided ? "+" : ""}
                        {formatCurrencyINR(Math.abs(pnl))} {isLossAvoided ? "(Avoided Loss)" : "(Missed Gain)"}
                      </span>
                    </td>
                    <td className="py-2 pl-3 text-slate-600 dark:text-slate-300 font-sans text-xs">
                      {t.reason}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
