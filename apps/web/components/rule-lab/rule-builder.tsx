"use client";

import React, { useState, useEffect } from "react";
import {
  Sliders,
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldAlert,
  Flame,
  TrendingDown,
  Layers,
  ChevronDown,
} from "lucide-react";
import {
  CATALOG_RULE_DEFINITIONS,
  RuleType,
  translateRuleApi,
} from "@/lib/rules/types";

export interface RuleBuilderProps {
  onRunReplay: (rule: any) => Promise<void>;
  isLoading: boolean;
  initialRuleType?: string | null;
  initialParams?: Record<string, string>;
}

export function RuleBuilder({
  onRunReplay,
  isLoading,
  initialRuleType,
  initialParams,
}: RuleBuilderProps) {
  const [activeTab, setActiveTab] = useState<"catalog" | "ai">("catalog");
  const [selectedRuleType, setSelectedRuleType] = useState<RuleType>("COOL_OFF_AFTER_LOSS");

  // Rule Form State initialized from first catalog rule
  const [rulePayload, setRulePayload] = useState<Record<string, any>>({
    ...CATALOG_RULE_DEFINITIONS[0].defaultPayload,
  });

  // AI Prompt State
  const [aiPrompt, setAiPrompt] = useState(
    "Don't let me trade for 20 minutes after losing money, and cap me at 5 trades per day"
  );
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationStatus, setTranslationStatus] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);

  // Sync when initialRuleType or initialParams change (e.g. from ?prefillRule=...)
  useEffect(() => {
    if (initialRuleType) {
      const match = CATALOG_RULE_DEFINITIONS.find((r) => r.type === initialRuleType);
      if (match) {
        setSelectedRuleType(match.type);
        const merged = { ...match.defaultPayload };
        if (initialParams) {
          Object.entries(initialParams).forEach(([k, v]) => {
            if (!isNaN(Number(v))) {
              merged[k] = Number(v);
            } else if (v === "true") {
              merged[k] = true;
            } else if (v === "false") {
              merged[k] = false;
            } else {
              merged[k] = v;
            }
          });
        }
        setRulePayload(merged);
      }
    }
  }, [initialRuleType, initialParams]);

  // Handle changing selected rule template
  const handleSelectRuleType = (type: RuleType) => {
    setSelectedRuleType(type);
    const def = CATALOG_RULE_DEFINITIONS.find((r) => r.type === type);
    if (def) {
      setRulePayload({ ...def.defaultPayload });
      setTranslationStatus(null);
    }
  };

  // Update a single payload parameter
  const updateParam = (key: string, value: any) => {
    setRulePayload((prev) => ({ ...prev, [key]: value }));
  };

  // Handle AI Translation
  const handleTranslate = async () => {
    if (!aiPrompt.trim()) return;
    setIsTranslating(true);
    setTranslationStatus(null);
    try {
      const res = await translateRuleApi(aiPrompt);
      if (res.success && res.rule) {
        setRulePayload(res.rule);
        setSelectedRuleType(res.rule.rule_type as RuleType);
        setTranslationStatus({
          success: true,
          message: res.explanation || "Rule translated and verified successfully.",
        });
      } else {
        setTranslationStatus({
          success: false,
          message: res.unsupported_reason || "Unable to translate prompt into an approved catalog rule.",
        });
      }
    } catch (err: any) {
      setTranslationStatus({
        success: false,
        message: err.message || "Translation service error. Please try again.",
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const currentDefinition =
    CATALOG_RULE_DEFINITIONS.find((r) => r.type === selectedRuleType) ||
    CATALOG_RULE_DEFINITIONS[0];

  return (
    <div
      data-testid="rule-builder-container"
      className="p-5 sm:p-6 border border-slate-200/80 dark:border-white/[0.08] rounded-[6px] space-y-5 bg-white dark:bg-[#090e1a] shadow-sm transition-all duration-200"
    >
      {/* Tab Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setActiveTab("catalog")}
            className={`px-3 py-1.5 rounded-[5px] text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              activeTab === "catalog"
                ? "bg-slate-900 text-white dark:bg-white/[0.1] dark:text-white dark:border dark:border-white/[0.12] shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Catalog Templates</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`px-3 py-1.5 rounded-[5px] text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              activeTab === "ai"
                ? "bg-slate-900 text-white dark:bg-white/[0.1] dark:text-white dark:border dark:border-white/[0.12] shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Plain English (AI)</span>
          </button>
        </div>

        <div className="text-right text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          9 Fixed Institutional Rules • V1 Supported
        </div>
      </div>

      {/* Mode 1: Catalog Template Selector */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-1 md:col-span-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Guardrail Rule Template
              </label>
              <div className="relative">
                <select
                  value={selectedRuleType}
                  onChange={(e) => handleSelectRuleType(e.target.value as RuleType)}
                  aria-label="Guardrail Rule Template"
                  className="w-full appearance-none px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[4px] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#387ed1] pr-8"
                >
                  {CATALOG_RULE_DEFINITIONS.map((def) => (
                    <option key={def.type} value={def.type}>
                      {def.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2.5 top-2.5 pointer-events-none text-slate-400" />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
                {currentDefinition.description}
              </p>
            </div>

            {/* Dynamic Parameter Sliders & Inputs */}
            <div className="col-span-1 md:col-span-2 p-4 bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-[4px] space-y-4">
              {selectedRuleType === "COOL_OFF_AFTER_LOSS" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        Cooldown Pause Duration
                      </span>
                      <span className="font-mono font-semibold text-[#387ed1]">
                        {rulePayload.cooldown_minutes ?? 15} mins
                      </span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={120}
                      step={5}
                      value={rulePayload.cooldown_minutes ?? 15}
                      onChange={(e) => updateParam("cooldown_minutes", Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#387ed1]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Trigger Loss Amount (Optional ₹)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 1000"
                      value={rulePayload.trigger_loss_inr ?? ""}
                      onChange={(e) =>
                        updateParam(
                          "trigger_loss_inr",
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {selectedRuleType === "MAX_CONSECUTIVE_LOSSES" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        Loss Streak Threshold
                      </span>
                      <span className="font-mono font-semibold text-[#387ed1]">
                        {rulePayload.consecutive_losses ?? 3} losses
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={6}
                      step={1}
                      value={rulePayload.consecutive_losses ?? 3}
                      onChange={(e) => updateParam("consecutive_losses", Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#387ed1]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Circuit Breaker Action
                    </label>
                    <select
                      value={rulePayload.action ?? "HALT_FOR_DAY"}
                      onChange={(e) => updateParam("action", e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white"
                    >
                      <option value="HALT_FOR_DAY">Halt for the Day</option>
                      <option value="MANDATORY_COOLDOWN">Mandatory Cooldown (30m)</option>
                    </select>
                  </div>
                </div>
              )}

              {selectedRuleType === "DAILY_LOSS_LIMIT" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Max Daily Realized Loss (₹)
                    </label>
                    <input
                      type="number"
                      step={500}
                      min={500}
                      value={rulePayload.max_loss_inr ?? 5000}
                      onChange={(e) => updateParam("max_loss_inr", Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Action on Breach
                    </label>
                    <input
                      type="text"
                      disabled
                      value="HALT_FOR_DAY (Hard Stop)"
                      className="w-full px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-500 dark:text-slate-400 cursor-not-allowed"
                    />
                  </div>
                </div>
              )}

              {selectedRuleType === "MAX_DAILY_TRADES_LIMIT" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        Maximum Permitted Trades
                      </span>
                      <span className="font-mono font-semibold text-[#387ed1]">
                        {rulePayload.max_trades ?? 5} trades
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      step={1}
                      value={rulePayload.max_trades ?? 5}
                      onChange={(e) => updateParam("max_trades", Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#387ed1]"
                    />
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 self-center">
                    Once trade count reaches {rulePayload.max_trades ?? 5}, any further entry attempts on the same calendar day are simulated as skipped.
                  </div>
                </div>
              )}

              {selectedRuleType === "TIME_OF_DAY_CUTOFF" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                      Allowed Start Time
                    </label>
                    <input
                      type="time"
                      value={rulePayload.allowed_start_time ?? "09:30"}
                      onChange={(e) => updateParam("allowed_start_time", e.target.value)}
                      className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                      Allowed Cutoff Time
                    </label>
                    <input
                      type="time"
                      value={rulePayload.allowed_end_time ?? "15:00"}
                      onChange={(e) => updateParam("allowed_end_time", e.target.value)}
                      className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-4">
                    <input
                      type="checkbox"
                      id="lunchBreak"
                      checked={rulePayload.restricted_lunch_break ?? true}
                      onChange={(e) => updateParam("restricted_lunch_break", e.target.checked)}
                      className="rounded border-slate-300 text-[#387ed1] focus:ring-[#387ed1]"
                    />
                    <label htmlFor="lunchBreak" className="text-xs text-slate-700 dark:text-slate-300">
                      Avoid Lunch Chop (11:30 - 13:00)
                    </label>
                  </div>
                </div>
              )}

              {selectedRuleType === "MAX_POSITION_SIZE" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                      Max Share Quantity
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 100"
                      value={rulePayload.max_quantity ?? 100}
                      onChange={(e) => updateParam("max_quantity", Number(e.target.value))}
                      className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                      Max Capital Per Trade (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 50000"
                      value={rulePayload.max_capital_per_trade_inr ?? 50000}
                      onChange={(e) => updateParam("max_capital_per_trade_inr", Number(e.target.value))}
                      className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                      Segment
                    </label>
                    <select
                      value={rulePayload.segment ?? "ALL"}
                      onChange={(e) => updateParam("segment", e.target.value)}
                      className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white"
                    >
                      <option value="ALL">All Segments</option>
                      <option value="EQUITY">Equity Only</option>
                      <option value="FNO">F&O Only</option>
                    </select>
                  </div>
                </div>
              )}

              {selectedRuleType === "SKIP_INSTRUMENT_TYPE" && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Disallowed Instrument Product Types
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["OPTIONS_BUY", "OPTIONS_SELL", "FUTURES", "EQUITY_INTRADAY"].map((pType) => {
                      const isSelected = (rulePayload.disallowed_types || []).includes(pType);
                      return (
                        <button
                          key={pType}
                          type="button"
                          onClick={() => {
                            const current = [...(rulePayload.disallowed_types || [])];
                            if (isSelected) {
                              updateParam(
                                "disallowed_types",
                                current.filter((x) => x !== pType)
                              );
                            } else {
                              updateParam("disallowed_types", [...current, pType]);
                            }
                          }}
                          className={`px-2.5 py-1 rounded text-xs font-mono transition ${
                            isSelected
                              ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800 font-semibold"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {isSelected ? "✕ " : "+ "}
                          {pType}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedRuleType === "NO_TRADING_ON_EXPIRY_DAY" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Affected Underlying Index
                    </label>
                    <select
                      value={(rulePayload.affected_indices || ["NIFTY"])[0]}
                      onChange={(e) => updateParam("affected_indices", [e.target.value])}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white"
                    >
                      <option value="ALL">All Expiry Days</option>
                      <option value="NIFTY">NIFTY (Thursday Expiries)</option>
                      <option value="BANKNIFTY">BANKNIFTY (Wednesday Expiries)</option>
                      <option value="FINNIFTY">FINNIFTY (Tuesday Expiries)</option>
                      <option value="SENSEX">SENSEX (Friday Expiries)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Action on Expiry Session
                    </label>
                    <select
                      value={rulePayload.action ?? "HALT_FOR_DAY"}
                      onChange={(e) => updateParam("action", e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white"
                    >
                      <option value="HALT_FOR_DAY">HALT_FOR_DAY (No trading)</option>
                      <option value="CAP_LOTS">CAP_LOTS (Downsized Exposure)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Plain English AI Input */}
      {activeTab === "ai" && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Describe your rule in natural language:</span>
              <span className="text-[11px] font-normal text-slate-500">
                Fast regex + LLM compilation
              </span>
            </label>
            <textarea
              rows={3}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. Pause trading for 30 minutes after losing more than 2000 rupees, and don't allow trades between 11:30 and 13:00"
              className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[4px] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#387ed1]"
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              disabled={isTranslating || !aiPrompt.trim()}
              onClick={handleTranslate}
              className="kiro-btn-cta !h-8 !px-3.5 text-xs inline-flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{isTranslating ? "Translating with AI..." : "Translate with AI"}</span>
            </button>

            {translationStatus && (
              <div
                className={`text-xs flex items-center space-x-1.5 font-medium ${
                  translationStatus.success
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {translationStatus.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5" />
                )}
                <span>{translationStatus.message}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Footer & Run Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1.5 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Active Rule: <strong>{rulePayload.rule_type}</strong></span>
        </div>

        <button
          type="button"
          disabled={isLoading}
          onClick={() => onRunReplay(rulePayload)}
          className="kiro-btn-cta !h-9 !px-6 text-xs inline-flex items-center justify-center space-x-2 font-bold tracking-wide shadow-[0_0_18px_rgba(43,127,255,0.45)] disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{isLoading ? "Simulating Historical Trades..." : "Run Replay Backtest"}</span>
        </button>
      </div>
    </div>
  );
}
