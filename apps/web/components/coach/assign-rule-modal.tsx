"use client";

import React, { useState } from "react";
import { ShieldAlert, Check, X, Sliders, AlertTriangle } from "lucide-react";
import { assignCoachRuleAction } from "@/lib/coach/coach-actions";

interface AssignRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  traderId: string;
  traderName: string;
  onRuleAssigned?: (ruleName: string) => void;
}

interface RulePreset {
  id: string;
  name: string;
  ruleType: string;
  defaultThreshold: number;
  unit: string;
  descriptionTemplate: (val: number) => string;
  payloadBuilder: (val: number) => Record<string, any>;
}

const RULE_PRESETS: RulePreset[] = [
  {
    id: "max_daily_loss",
    name: "Max Daily Loss Limit",
    ruleType: "max_daily_loss",
    defaultThreshold: 10000,
    unit: "INR (₹)",
    descriptionTemplate: (val) =>
      `Halt all trading executions if cumulative daily net loss exceeds ₹${val.toLocaleString("en-IN")}.`,
    payloadBuilder: (val) => ({ max_loss_inr: val }),
  },
  {
    id: "stop_after_consecutive_losses",
    name: "Stop Trading After Consecutive Losses",
    ruleType: "stop_after_consecutive_losses",
    defaultThreshold: 3,
    unit: "Losses",
    descriptionTemplate: (val) =>
      `Enforce a mandatory session halt after ${val} consecutive losing trades to prevent tilt spirals.`,
    payloadBuilder: (val) => ({ max_consecutive_losses: val }),
  },
  {
    id: "max_position_size",
    name: "Max Position Size Lot Cap",
    ruleType: "max_position_size",
    defaultThreshold: 4,
    unit: "Lots",
    descriptionTemplate: (val) =>
      `Restrict single-order execution volume to a maximum of ${val} lots per trade on index options.`,
    payloadBuilder: (val) => ({ max_lots: val }),
  },
  {
    id: "loss_cooldown",
    name: "Loss Cooldown Interval",
    ruleType: "loss_cooldown",
    defaultThreshold: 20,
    unit: "Minutes",
    descriptionTemplate: (val) =>
      `Mandate a ${val}-minute cooling-off window following any trade closed at a loss > ₹2,000.`,
    payloadBuilder: (val) => ({ cooldown_minutes: val, min_loss_trigger_inr: 2000 }),
  },
];

export function AssignRuleModal({
  isOpen,
  onClose,
  traderId,
  traderName,
  onRuleAssigned,
}: AssignRuleModalProps) {
  const [selectedPresetId, setSelectedPresetId] = useState(RULE_PRESETS[0].id);
  const [threshold, setThreshold] = useState<number>(RULE_PRESETS[0].defaultThreshold);
  const [actionMode, setActionMode] = useState<"restrict" | "flag_only">("flag_only");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const activePreset = RULE_PRESETS.find((p) => p.id === selectedPresetId) || RULE_PRESETS[0];

  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    const p = RULE_PRESETS.find((x) => x.id === presetId);
    if (p) setThreshold(p.defaultThreshold);
  };

  const handleAssign = async () => {
    setIsSubmitting(true);
    setError(null);

    const naturalText = activePreset.descriptionTemplate(threshold);
    const payload = activePreset.payloadBuilder(threshold);

    const res = await assignCoachRuleAction({
      traderId,
      ruleName: activePreset.name,
      ruleType: activePreset.ruleType,
      rulePayload: payload,
      naturalLanguageText: naturalText,
      actionMode,
    });

    setIsSubmitting(false);

    if (res.success) {
      setSuccess(true);
      if (onRuleAssigned) onRuleAssigned(activePreset.name);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } else {
      setError(res.error || "Failed to assign rule to student.");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-rule-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card-luminous relative w-full max-w-lg rounded-[12px] border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#090e1a] shadow-2xl overflow-hidden p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/[0.06] pb-3">
          <div>
            <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-blue-500/10 text-[#2b7fff] border border-blue-500/20 mb-1">
              <ShieldAlert className="w-3 h-3" />
              <span>COACH INTERVENTION</span>
            </div>
            <h3 id="assign-rule-title" className="text-lg font-bold text-slate-900 dark:text-white">
              Assign Rule to {traderName}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Recommend a portfolio guardrail rule directly into the student&apos;s rulebook.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[5px] text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preset Selector */}
        <div className="space-y-2">
          <label className="text-xs font-mono uppercase font-bold text-slate-600 dark:text-slate-400">
            Select Guardrail Template
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {RULE_PRESETS.map((p) => {
              const isSelected = p.id === selectedPresetId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePresetChange(p.id)}
                  className={`p-2.5 rounded-[6px] border text-left transition ${
                    isSelected
                      ? "border-[#2b7fff] bg-blue-500/10 text-[#2b7fff] shadow-2xs font-bold"
                      : "border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.03] text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className="text-xs">{p.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.unit}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Threshold Parameter Input */}
        <div className="space-y-2">
          <label className="text-xs font-mono uppercase font-bold text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span>Threshold Limit ({activePreset.unit})</span>
            <span className="font-mono text-slate-900 dark:text-white text-xs">
              Value: {threshold.toLocaleString("en-IN")} {activePreset.unit}
            </span>
          </label>
          <input
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            min={1}
            className="w-full text-xs font-mono p-2.5 rounded-[6px] border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#2b7fff]"
          />
          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
            &quot;{activePreset.descriptionTemplate(threshold)}&quot;
          </p>
        </div>

        {/* Action Mode Toggle */}
        <div className="space-y-2">
          <label className="text-xs font-mono uppercase font-bold text-slate-600 dark:text-slate-400">
            Enforcement Mode
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActionMode("flag_only")}
              className={`p-2 rounded-[6px] border text-xs font-semibold text-center transition ${
                actionMode === "flag_only"
                  ? "border-[#2b7fff] bg-blue-500/10 text-[#2b7fff]"
                  : "border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400"
              }`}
            >
              Flag &amp; Behavioral Audit
            </button>
            <button
              type="button"
              onClick={() => setActionMode("restrict")}
              className={`p-2 rounded-[6px] border text-xs font-semibold text-center transition ${
                actionMode === "restrict"
                  ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400"
              }`}
            >
              Strict Warning Banner
            </button>
          </div>
        </div>

        {/* Status feedback */}
        {error && (
          <div className="p-2.5 rounded-[6px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-2.5 rounded-[6px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center space-x-1.5">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>Rule successfully assigned to {traderName}&apos;s rulebook!</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
          <button
            type="button"
            onClick={onClose}
            className="kiro-btn-outline !h-8 !px-3 text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting || success}
            onClick={handleAssign}
            className="kiro-btn-cta !h-8 !px-4 text-xs font-bold inline-flex items-center space-x-1.5 disabled:opacity-50"
          >
            <span>{isSubmitting ? "Assigning..." : "Assign Rule"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
