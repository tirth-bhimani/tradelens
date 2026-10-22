"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Sliders, Beaker, Plus, ArrowRight } from "lucide-react";
import type { SavedRule } from "@/lib/rules/adherence-types";
import { RuleCard } from "./rule-card";
import { toggleRuleActiveAction, deleteRuleAction } from "@/lib/rules/rulebook-actions";

export interface RulebookListProps {
  initialRules: SavedRule[];
}

export function RulebookList({ initialRules }: RulebookListProps) {
  const [rules, setRules] = useState<SavedRule[]>(initialRules);
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "PAUSED">("ALL");

  const activeRules = rules.filter((r) => r.is_active);
  const pausedRules = rules.filter((r) => !r.is_active);

  const displayedRules =
    filter === "ACTIVE"
      ? activeRules
      : filter === "PAUSED"
      ? pausedRules
      : rules;

  const handleToggle = async (ruleId: string, isActive: boolean) => {
    // Optimistic state update
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, is_active: isActive } : r))
    );
    await toggleRuleActiveAction(ruleId, isActive);
  };

  const handleDelete = async (ruleId: string) => {
    // Optimistic state update
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
    await deleteRuleAction(ruleId);
  };

  return (
    <div className="space-y-6" data-testid="rulebook-list">
      {/* Top Filter Ribbon & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-white/[0.08]">
        {/* Filter Tabs */}
        <div className="flex items-center space-x-1.5 text-xs font-mono">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-[5px] transition-colors ${
              filter === "ALL"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05]"
            }`}
          >
            All Rules ({rules.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("ACTIVE")}
            className={`px-3 py-1.5 rounded-[5px] transition-colors ${
              filter === "ACTIVE"
                ? "bg-emerald-600 text-white font-bold"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05]"
            }`}
          >
            Active ({activeRules.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("PAUSED")}
            className={`px-3 py-1.5 rounded-[5px] transition-colors ${
              filter === "PAUSED"
                ? "bg-slate-600 text-white font-bold"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05]"
            }`}
          >
            Paused ({pausedRules.length})
          </button>
        </div>

        {/* Action Button: Open Rule Lab */}
        <Link
          href="/rule-lab"
          className="kiro-btn-cta !h-8 !px-3.5 text-xs font-bold inline-flex items-center space-x-1.5 self-start sm:self-auto shadow-[0_0_15px_-3px_rgba(43,127,255,0.4)]"
        >
          <Beaker className="w-3.5 h-3.5" />
          <span>Test New Rule in Rule Lab</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Rules Stack or Empty State */}
      {displayedRules.length > 0 ? (
        <div className="space-y-3.5">
          {displayedRules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onToggleActive={handleToggle}
              onDeleteRule={handleDelete}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="card-luminous p-10 text-center space-y-4 border border-dashed border-slate-300 dark:border-white/[0.12] rounded-[8px] bg-slate-50/50 dark:bg-white/[0.01]">
          <div className="w-12 h-12 rounded-[6px] bg-slate-100 dark:bg-white/[0.06] text-[#2b7fff] border border-slate-200 dark:border-white/[0.1] mx-auto flex items-center justify-center">
            <Sliders className="w-6 h-6" />
          </div>

          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No {filter !== "ALL" ? `${filter.toLowerCase()} ` : ""}rules in your Rulebook
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
              Test candidate guardrails in the Rule Lab using historical trades and save them here to automatically evaluate post-import discipline.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/rule-lab"
              className="kiro-btn-cta !h-9 !px-4 text-xs font-bold inline-flex items-center space-x-1.5 shadow-[0_0_15px_-3px_rgba(43,127,255,0.4)]"
            >
              <span>Backtest a Rule in Rule Lab</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
