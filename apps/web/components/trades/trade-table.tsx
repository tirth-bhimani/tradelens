"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Tag,
  Calendar,
  X,
  FileEdit,
} from "lucide-react";
import {
  type RoundTripTradeView,
  type PsychologicalTag,
  type OutcomeFilter,
  type SortColumn,
  type SortDirection,
  PSYCHOLOGICAL_TAGS,
  filterTrades,
  sortTrades,
} from "@/lib/trades/trade-filters";
import { TradeTagPill } from "./trade-tag-pill";
import { TradeDetailDrawer } from "./trade-detail-drawer";
import { AdherenceBadge } from "@/components/rules/adherence-badge";
import type { TradeViolation } from "@/lib/rules/adherence-types";
import {
  formatCurrencyINR,
  formatSignedCurrency,
  formatPercentage,
} from "@/lib/utils/format";

export interface TradeTableProps {
  trades?: RoundTripTradeView[];
  violations?: TradeViolation[];
  selectedDate?: string;
  onClearDateFilter?: () => void;
  onTradeUpdated?: (trade: RoundTripTradeView) => void;
  className?: string;
}

import { DEFAULT_TRADE_LOG } from "@/lib/trades/trade-defaults";
export { DEFAULT_TRADE_LOG };

export function TradeTable({
  trades = DEFAULT_TRADE_LOG,
  violations = [],
  selectedDate,
  onClearDateFilter,
  onTradeUpdated,
  className = "",
}: TradeTableProps) {
  const [tradeList, setTradeList] = useState<RoundTripTradeView[]>(trades);
  const [searchQuery, setSearchQuery] = useState("");
  const [outcome, setOutcome] = useState<OutcomeFilter>("ALL");
  const [segment, setSegment] = useState("ALL");
  const [selectedTag, setSelectedTag] = useState<PsychologicalTag | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<SortColumn>("exitTime");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeEditingTrade, setActiveEditingTrade] = useState<RoundTripTradeView | null>(null);

  // Filter & sort
  const filteredTrades = useMemo(() => {
    const res = filterTrades(tradeList, {
      searchQuery,
      outcome,
      segment,
      selectedTag,
      date: selectedDate,
    });
    return sortTrades(res, sortBy, sortDirection);
  }, [tradeList, searchQuery, outcome, segment, selectedTag, selectedDate, sortBy, sortDirection]);

  // Pagination slicing
  const totalPages = Math.ceil(filteredTrades.length / pageSize) || 1;
  const paginatedTrades = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTrades.slice(start, start + pageSize);
  }, [filteredTrades, currentPage, pageSize]);

  const handleSortToggle = (col: SortColumn) => {
    if (sortBy === col) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortDirection("desc");
    }
  };

  const handleUpdateTrade = (updated: RoundTripTradeView) => {
    setTradeList((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    if (onTradeUpdated) onTradeUpdated(updated);
    setActiveEditingTrade(null);
  };

  const allTags = Object.keys(PSYCHOLOGICAL_TAGS) as PsychologicalTag[];

  return (
    <div
      data-testid="trade-table-container"
      className={`card-luminous rounded-[8px] border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] space-y-4 transition-colors shadow-sm ${className}`}
    >
      {/* Table Header & Controls Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Round-Trip Trade Journal
            </h3>
            <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
              ({filteredTrades.length} of {tradeList.length} trades)
            </span>
          </div>

          {/* Active Date Filter Chip if set from calendar */}
          {selectedDate && (
            <div className="flex items-center space-x-2 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Date: {selectedDate}</span>
              {onClearDateFilter && (
                <button
                  type="button"
                  onClick={onClearDateFilter}
                  className="p-0.5 hover:text-slate-900 dark:hover:text-white"
                  title="Clear date filter"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1 text-xs">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search symbol, notes..."
              className="w-full pl-8 pr-3 py-1.5 rounded-[4px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1017] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Outcome Filter Buttons */}
          <div className="flex rounded-[4px] p-0.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            {(["ALL", "WINNERS", "LOSERS"] as OutcomeFilter[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setOutcome(tab);
                  setCurrentPage(1);
                }}
                className={`flex-1 py-1 rounded-[3px] text-center font-medium transition-colors ${
                  outcome === tab
                    ? "bg-white dark:bg-[#0d131f] text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {tab === "ALL" ? "All" : tab === "WINNERS" ? "Winners" : "Losers"}
              </button>
            ))}
          </div>

          {/* Segment Selector */}
          <select
            value={segment}
            onChange={(e) => {
              setSegment(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 rounded-[4px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1017] text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Segments</option>
            <option value="EQUITY">Equity (Cash)</option>
            <option value="FNO">F&O Derivatives</option>
          </select>

          {/* Tag Filter */}
          <select
            value={selectedTag}
            onChange={(e) => {
              setSelectedTag(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 rounded-[4px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1017] text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Psychological Tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs tabular-nums border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 text-slate-500 dark:text-slate-400 font-medium">
              <th
                onClick={() => handleSortToggle("exitTime")}
                className="py-2.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white"
              >
                <div className="flex items-center space-x-1">
                  <span>Date & Exit</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSortToggle("symbol")}
                className="py-2.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white"
              >
                <div className="flex items-center space-x-1">
                  <span>Symbol</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-2.5 px-3">Segment</th>
              <th className="py-2.5 px-3">Qty</th>
              <th className="py-2.5 px-3">Buy / Sell</th>
              <th className="py-2.5 px-3">Charges</th>
              <th
                onClick={() => handleSortToggle("netPnl")}
                className="py-2.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white"
              >
                <div className="flex items-center space-x-1">
                  <span>Net P&L</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-2.5 px-4">Tags & Annotations</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {paginatedTrades.length > 0 ? (
              paginatedTrades.map((trade) => {
                const isPositive = trade.netPnl >= 0;
                return (
                  <tr
                    key={trade.id}
                    onClick={() => setActiveEditingTrade(trade)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      <div>{trade.exitTime.slice(0, 10)}</div>
                      <div className="text-[10px] text-slate-400">
                        {trade.exitTime.slice(11, 16) || "Session"}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {trade.symbol}
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {trade.segment}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-medium">
                      {trade.quantity}
                    </td>

                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      <div>{formatCurrencyINR(trade.entryPrice)}</div>
                      <div className="text-[10px] text-slate-400">
                        → {formatCurrencyINR(trade.exitPrice)}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                      {formatCurrencyINR(trade.charges)}
                    </td>

                    <td className="py-3 px-4">
                      <div
                        className={`font-bold ${
                          isPositive
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {formatSignedCurrency(trade.netPnl)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {formatPercentage(trade.returnPct, { includeSign: true })}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {(() => {
                        const violation = violations.find((v) => v.trade_id === trade.id);
                        return (
                          <div className="space-y-1">
                            {violation && <AdherenceBadge violation={violation} />}
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {trade.tags && trade.tags.length > 0 ? (
                                trade.tags.map((t) => <TradeTagPill key={t} tag={t} />)
                              ) : !violation ? (
                                <span className="text-[11px] text-slate-400 italic">No tags</span>
                              ) : null}
                            </div>
                          </div>
                        );
                      })()}
                      {trade.notes && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-xs pt-1">
                          &ldquo;{trade.notes}&rdquo;
                        </p>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveEditingTrade(trade);
                        }}
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        title="Annotate trade"
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="py-12 text-center text-xs text-slate-400">
                  No trades match the current filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Footer Controls */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center space-x-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1017]"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span>
            Page {currentPage} of {totalPages}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1.5 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="p-1.5 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Slide-over editing drawer */}
      <TradeDetailDrawer
        trade={activeEditingTrade}
        isOpen={Boolean(activeEditingTrade)}
        onClose={() => setActiveEditingTrade(null)}
        onUpdateTrade={handleUpdateTrade}
      />
    </div>
  );
}
