"use client";

import React, { useState } from "react";
import { X, Tag, FileText, Check, ShieldAlert, Award } from "lucide-react";
import {
  type RoundTripTradeView,
  type PsychologicalTag,
  PSYCHOLOGICAL_TAGS,
} from "@/lib/trades/trade-filters";
import { TradeTagPill } from "./trade-tag-pill";
import {
  formatCurrencyINR,
  formatSignedCurrency,
  formatPercentage,
} from "@/lib/utils/format";

export interface TradeDetailDrawerProps {
  trade: RoundTripTradeView | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateTrade: (updated: RoundTripTradeView) => void;
}

export function TradeDetailDrawer({
  trade,
  isOpen,
  onClose,
  onUpdateTrade,
}: TradeDetailDrawerProps) {
  if (!isOpen || !trade) return null;

  const [notes, setNotes] = useState(trade.notes || "");
  const [selectedTags, setSelectedTags] = useState<PsychologicalTag[]>(trade.tags || []);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const toggleTag = (tag: PsychologicalTag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSave = () => {
    const updated: RoundTripTradeView = {
      ...trade,
      tags: selectedTags,
      notes: notes.trim(),
    };
    onUpdateTrade(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const allAvailableTags = Object.keys(PSYCHOLOGICAL_TAGS) as PsychologicalTag[];
  const isNetPositive = trade.netPnl >= 0;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[2px] transition-opacity"
      data-testid="trade-detail-drawer"
    >
      <div className="w-full max-w-md bg-white dark:bg-[#0c1017] border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isNetPositive ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {trade.symbol} • Trade Journal
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Trade KPI Overview */}
          <div className="p-4 rounded-[4px] bg-slate-50 dark:bg-[#0d131f] border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">Net Realized P&L</span>
              <span
                className={`text-lg font-bold tabular-nums ${
                  isNetPositive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {formatSignedCurrency(trade.netPnl)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/80 text-xs tabular-nums">
              <div>
                <span className="text-slate-400">Entry: </span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {formatCurrencyINR(trade.entryPrice)} ({trade.quantity} qty)
                </span>
              </div>
              <div>
                <span className="text-slate-400">Exit: </span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {formatCurrencyINR(trade.exitPrice)}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Gross: </span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {formatSignedCurrency(trade.grossPnl)}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Charges: </span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {formatCurrencyINR(trade.charges)}
                </span>
              </div>
              <div className="col-span-2 text-[11px] text-slate-400 pt-1">
                <span>Timestamp: {new Date(trade.exitTime).toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          {/* Active Psychological Tags */}
          <div className="space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <span>Assigned Tags</span>
            </div>
            <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded bg-slate-50/50 dark:bg-slate-900/20 border border-slate-200/80 dark:border-slate-800">
              {selectedTags.length > 0 ? (
                selectedTags.map((t) => (
                  <TradeTagPill key={t} tag={t} onRemove={() => toggleTag(t)} />
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">No tags selected</span>
              )}
            </div>
          </div>

          {/* Tag Selector Palette */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Add Execution & Psychological Tags
            </span>
            <div className="flex flex-wrap gap-1.5">
              {allAvailableTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                const isDisciplined = PSYCHOLOGICAL_TAGS[tag].category === "disciplined";
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 rounded-[3px] text-xs font-medium border transition-colors ${
                      isSelected
                        ? isDisciplined
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-rose-600 text-white border-rose-600"
                        : "bg-white dark:bg-[#0d131f] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Journal Notes Textarea */}
          <div className="space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Trader Journal Notes</span>
            </div>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What triggered this entry? Did you follow your risk management rules? What would you do differently?"
              className="w-full text-xs p-3 rounded-[4px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#0d131f]">
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            {savedSuccess && "Changes saved!"}
          </span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-[4px] border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="btn-zerodha-primary text-xs py-1.5 px-4"
            >
              Save Annotation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
