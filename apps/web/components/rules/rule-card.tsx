"use client";

import React, { useTransition } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Trash2,
  Clock,
  Layers,
  Calendar,
  Zap,
} from "lucide-react";
import type { SavedRule } from "@/lib/rules/adherence-types";

export interface RuleCardProps {
  rule: SavedRule;
  onToggleActive: (ruleId: string, isActive: boolean) => Promise<void>;
  onDeleteRule: (ruleId: string) => Promise<void>;
}

export function RuleCard({ rule, onToggleActive, onDeleteRule }: RuleCardProps) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      await onToggleActive(rule.id, !rule.is_active);
    });
  };

  const handleDelete = () => {
    if (confirm(`Delete rule "${rule.rule_type}" from your Rulebook?`)) {
      startTransition(async () => {
        await onDeleteRule(rule.id);
      });
    }
  };

  const getRuleIcon = () => {
    switch (rule.rule_type) {
      case "COOL_OFF_AFTER_LOSS":
        return <Clock className="w-4 h-4 text-rose-500" />;
      case "MAX_TRADES_PER_DAY":
      case "MAX_DAILY_TRADES_LIMIT":
        return <Layers className="w-4 h-4 text-amber-500" />;
      case "DAILY_LOSS_CUTOFF":
      case "DAILY_LOSS_LIMIT":
        return <ShieldAlert className="w-4 h-4 text-rose-600" />;
      case "MAX_POSITION_SIZE":
        return <Sliders className="w-4 h-4 text-sky-500" />;
      default:
        return <ShieldCheck className="w-4 h-4 text-[#2b7fff]" />;
    }
  };

  return (
    <div
      data-testid={`rule-card-${rule.id}`}
      className={`card-luminous p-5 rounded-[8px] border transition-all ${
        rule.is_active
          ? "border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a]"
          : "border-slate-200/50 dark:border-white/[0.04] bg-slate-50/50 dark:bg-white/[0.01] opacity-75"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        {/* Left: Rule Type, Explanation & Parameters */}
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center space-x-2.5">
            <span className="p-1.5 rounded-[4px] bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08]">
              {getRuleIcon()}
            </span>
            <div>
              <h3 className="text-sm font-bold font-mono text-slate-900 dark:text-white flex items-center gap-2">
                <span>{rule.rule_type}</span>
                {rule.is_active ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    ACTIVE
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-200/60 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400">
                    PAUSED
                  </span>
                )}
              </h3>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
            {rule.natural_language_text || "Custom algorithmic guardrail active in personal portfolio."}
          </p>

          {/* Parameters Payload Chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {Object.entries(rule.rule_payload || {}).map(([key, val]) => (
              <span
                key={key}
                className="px-2 py-0.5 rounded-[4px] bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/[0.06] text-[11px] font-mono"
              >
                <strong className="text-slate-500 dark:text-slate-400">{key}:</strong>{" "}
                {String(val)}
              </span>
            ))}
          </div>
        </div>

        {/* Right: Toggle Switch & Delete Action */}
        <div className="flex items-center space-x-3 shrink-0 self-end sm:self-center">
          {/* Toggle Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={rule.is_active}
            disabled={isPending}
            onClick={handleToggle}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#2b7fff] focus:ring-offset-2 ${
              rule.is_active ? "bg-[#2b7fff]" : "bg-slate-300 dark:bg-slate-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                rule.is_active ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>

          {/* Delete Action */}
          <button
            type="button"
            disabled={isPending}
            onClick={handleDelete}
            className="p-1.5 rounded-[4px] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
            title="Delete rule from Rulebook"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
