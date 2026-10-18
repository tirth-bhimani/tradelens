"use client";

import { useState } from "react";
import { formatIndianCurrency } from "@/lib/utils/format";
import type { SymbolReconciliationItem } from "./discrepancy-card";

interface ReconciliationTableProps {
  symbols: SymbolReconciliationItem[];
}

export function ReconciliationTable({ symbols }: ReconciliationTableProps) {
  const [filter, setFilter] = useState<"ALL" | "DISCREPANCY" | "MATCHED">("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSymbols = symbols.filter((item) => {
    const matchesFilter =
      filter === "ALL"
        ? true
        : filter === "DISCREPANCY"
        ? item.status !== "MATCHED"
        : item.status === "MATCHED";

    const matchesSearch = item.symbol.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Table Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div role="group" aria-label="Symbol reconciliation status filters" className="inline-flex p-1 rounded-[6px] bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-[4px] font-semibold transition ${
              filter === "ALL"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            All Symbols ({symbols.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("DISCREPANCY")}
            className={`px-3 py-1.5 rounded-[4px] font-semibold transition flex items-center gap-1.5 ${
              filter === "DISCREPANCY"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
            <span>Audit Variances ({symbols.filter((s) => s.status !== "MATCHED").length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("MATCHED")}
            className={`px-3 py-1.5 rounded-[4px] font-semibold transition flex items-center gap-1.5 ${
              filter === "MATCHED"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Matched ({symbols.filter((s) => s.status === "MATCHED").length})</span>
          </button>
        </div>

        <div>
          <input
            type="text"
            aria-label="Search scrip by symbol"
            placeholder="Search scrip (e.g. RELIANCE)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 px-3 py-1.5 text-xs rounded-[4px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#387ed1]"
          />
        </div>
      </div>

      {/* Scrip Comparison Table */}
      <div className="overflow-x-auto rounded-[6px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f]">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/50 text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4">Symbol</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">App Gross</th>
              <th className="py-3 px-3 text-right">Broker Gross</th>
              <th className="py-3 px-3 text-right">App Charges</th>
              <th className="py-3 px-3 text-right">Broker Charges</th>
              <th className="py-3 px-3 text-right">App Net P&L</th>
              <th className="py-3 px-3 text-right">Broker Net P&L</th>
              <th className="py-3 px-4 text-right">Delta (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredSymbols.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-500 dark:text-slate-400">
                  No symbols matching selected filter.
                </td>
              </tr>
            ) : (
              filteredSymbols.map((item) => {
                const isMatched = item.status === "MATCHED";
                const isMissing = item.status.startsWith("MISSING");

                return (
                  <tr
                    key={item.symbol}
                    className="hover:bg-sky-50/60 dark:hover:bg-[#121c2e] transition-colors cursor-default border-b border-slate-100 dark:border-slate-800/60 last:border-0"
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                        <span>{item.symbol}</span>
                        {item.has_open_positions && (
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" title="Has residual open positions" />
                        )}
                      </div>
                      {item.explanation && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 max-w-xs truncate pt-0.5">
                          {item.explanation}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {isMatched ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-medium border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Matched</span>
                        </span>
                      ) : isMissing ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          <span>Missing</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                          <span>Variance</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-medium text-slate-700 dark:text-slate-300">
                      {formatIndianCurrency(item.app_gross_pnl)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-medium text-slate-700 dark:text-slate-300">
                      {formatIndianCurrency(item.broker_gross_pnl)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-slate-600 dark:text-slate-400">
                      {formatIndianCurrency(item.app_charges)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-slate-600 dark:text-slate-400">
                      {formatIndianCurrency(item.broker_charges)}
                    </td>
                    <td className={`py-3 px-3 text-right tabular-nums font-semibold ${item.app_net_pnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {formatIndianCurrency(item.app_net_pnl)}
                    </td>
                    <td className={`py-3 px-3 text-right tabular-nums font-semibold ${item.broker_net_pnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {formatIndianCurrency(item.broker_net_pnl)}
                    </td>
                    <td className={`py-3 px-4 text-right tabular-nums font-semibold ${
                      Math.abs(item.net_delta) <= 1.00
                        ? "text-slate-500 dark:text-slate-400"
                        : item.net_delta > 0
                        ? "text-slate-900 dark:text-white"
                        : "text-slate-700 dark:text-slate-300"
                    }`}>
                      {item.net_delta > 0 ? "+" : ""}{formatIndianCurrency(item.net_delta)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
