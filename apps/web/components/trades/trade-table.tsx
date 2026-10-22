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
import {
  formatCurrencyINR,
  formatSignedCurrency,
  formatPercentage,
} from "@/lib/utils/format";

export interface TradeTableProps {
  trades?: RoundTripTradeView[];
  selectedDate?: string;
  onClearDateFilter?: () => void;
  onTradeUpdated?: (trade: RoundTripTradeView) => void;
  className?: string;
}

// Sample baseline dataset representing closed round-trip trades
export const DEFAULT_TRADE_LOG: RoundTripTradeView[] = [
  {
    id: "TR-101",
    symbol: "RELIANCE",
    segment: "EQUITY",
    entryTime: "2024-03-01T09:30:00",
    exitTime: "2024-03-01T10:15:00",
    quantity: 50,
    entryPrice: 2920.0,
    exitPrice: 2988.0,
    grossPnl: 3400.0,
    charges: 124.5,
    netPnl: 3275.5,
    returnPct: 2.33,
    tags: ["Planned Setup", "Rule Followed"],
    notes: "15-minute opening breakout, honored 1:2 R:R target",
  },
  {
    id: "TR-102",
    symbol: "TCS",
    segment: "EQUITY",
    entryTime: "2024-03-04T10:00:00",
    exitTime: "2024-03-04T11:20:00",
    quantity: 30,
    entryPrice: 3820.0,
    exitPrice: 3993.33,
    grossPnl: 5200.0,
    charges: 168.0,
    netPnl: 5032.0,
    returnPct: 4.54,
    tags: ["Planned Setup", "Good Risk/Reward"],
    notes: "Clean retest of previous day high",
  },
  {
    id: "TR-103",
    symbol: "INFY",
    segment: "EQUITY",
    entryTime: "2024-03-06T14:15:00",
    exitTime: "2024-03-06T14:50:00",
    quantity: 60,
    entryPrice: 1620.0,
    exitPrice: 1585.0,
    grossPnl: -2100.0,
    charges: 95.0,
    netPnl: -2195.0,
    returnPct: -2.16,
    tags: ["FOMO"],
    notes: "Jumped in after large red candle, bad fill",
  },
  {
    id: "TR-104",
    symbol: "HDFCBANK",
    segment: "EQUITY",
    entryTime: "2024-03-08T09:45:00",
    exitTime: "2024-03-08T11:00:00",
    quantity: 80,
    entryPrice: 1450.0,
    exitPrice: 1510.0,
    grossPnl: 4800.0,
    charges: 152.0,
    netPnl: 4648.0,
    returnPct: 4.14,
    tags: ["Rule Followed"],
  },
  {
    id: "TR-105",
    symbol: "ICICIBANK",
    segment: "EQUITY",
    entryTime: "2024-03-11T10:15:00",
    exitTime: "2024-03-11T12:00:00",
    quantity: 100,
    entryPrice: 1050.0,
    exitPrice: 1111.0,
    grossPnl: 6100.0,
    charges: 175.0,
    netPnl: 5925.0,
    returnPct: 5.81,
    tags: ["Good Risk/Reward", "Planned Setup"],
  },
  {
    id: "TR-106",
    symbol: "SBIN",
    segment: "EQUITY",
    entryTime: "2024-03-13T13:30:00",
    exitTime: "2024-03-13T14:45:00",
    quantity: 120,
    entryPrice: 750.0,
    exitPrice: 715.0,
    grossPnl: -4200.0,
    charges: 142.0,
    netPnl: -4342.0,
    returnPct: -4.67,
    tags: ["Held Loser"],
    notes: "Did not cut at stop-loss level, held into close",
  },
  {
    id: "TR-107",
    symbol: "KOTAKBANK",
    segment: "EQUITY",
    entryTime: "2024-03-15T14:00:00",
    exitTime: "2024-03-15T15:10:00",
    quantity: 100,
    entryPrice: 1820.0,
    exitPrice: 1778.0,
    grossPnl: -4200.0,
    charges: 180.0,
    netPnl: -4380.0,
    returnPct: -2.31,
    tags: ["Revenge Trade", "Size Creep"],
    notes: "Doubled lot size to recover SBIN loss",
  },
  {
    id: "TR-108",
    symbol: "BAJFINANCE",
    segment: "EQUITY",
    entryTime: "2024-03-18T09:20:00",
    exitTime: "2024-03-18T10:45:00",
    quantity: 25,
    entryPrice: 6500.0,
    exitPrice: 6800.0,
    grossPnl: 7500.0,
    charges: 210.0,
    netPnl: 7290.0,
    returnPct: 4.62,
    tags: ["Rule Followed"],
  },
  {
    id: "TR-109",
    symbol: "NIFTY24MAR22000CE",
    segment: "FNO",
    entryTime: "2024-03-20T10:30:00",
    exitTime: "2024-03-20T11:45:00",
    quantity: 200,
    entryPrice: 125.0,
    exitPrice: 169.5,
    grossPnl: 8900.0,
    charges: 280.0,
    netPnl: 8620.0,
    returnPct: 35.6,
    tags: ["Good Risk/Reward"],
  },
];

export function TradeTable({
  trades = DEFAULT_TRADE_LOG,
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
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {trade.tags && trade.tags.length > 0 ? (
                          trade.tags.map((t) => <TradeTagPill key={t} tag={t} />)
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No tags</span>
                        )}
                      </div>
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
