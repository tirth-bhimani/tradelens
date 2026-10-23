"use client";

import React, { useState } from "react";
import {
  Flame,
  ShieldAlert,
  ShieldCheck,
  Zap,
  TrendingDown,
  Sparkles,
} from "lucide-react";
import { TiltAutopsyOverview, TiltCascadeEvent } from "@/lib/tilt/types";
import { formatCurrencyINR } from "@/lib/utils/format";
import { CascadeTimeline } from "./cascade-timeline";
import { CircuitBreakerCard } from "./circuit-breaker-card";

export interface TiltAutopsyViewProps {
  overview: TiltAutopsyOverview;
}

export function TiltAutopsyView({ overview }: TiltAutopsyViewProps) {
  const [selectedCascadeId, setSelectedCascadeId] = useState<string>(
    overview.cascades[0]?.id || ""
  );

  const selectedCascade =
    overview.cascades.find((c) => c.id === selectedCascadeId) || overview.cascades[0];

  return (
    <div className="space-y-6" data-testid="tilt-autopsy-view">
      {/* 4-Metric High-Level Autopsy KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Total Tilt Events */}
        <div className="card-luminous p-4 rounded-[8px] border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Tilt Cascades Detected</span>
            <Flame className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight tabular-nums text-slate-900 dark:text-white">
            {overview.total_cascades_detected} Spirals
          </div>
          <p className="text-[11px] font-mono text-slate-400">
            Automated velocity analysis
          </p>
        </div>

        {/* Metric 2: Capital Drained */}
        <div className="card-luminous p-4 rounded-[8px] border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Capital Drained by Tilt</span>
            <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight tabular-nums text-rose-600 dark:text-rose-400">
            -{formatCurrencyINR(overview.total_capital_drained_by_tilt_inr)}
          </div>
          <p className="text-[11px] font-mono text-slate-400">
            Attributable emotional losses
          </p>
        </div>

        {/* Metric 3: Avg Cascade Duration */}
        <div className="card-luminous p-4 rounded-[8px] border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Avg Spiral Velocity</span>
            <Zap className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight tabular-nums text-slate-900 dark:text-white">
            {overview.avg_cascade_duration_minutes} Minutes
          </div>
          <p className="text-[11px] font-mono text-slate-400">
            Trigger to exhaustion window
          </p>
        </div>

        {/* Metric 4: Recoverable Capital */}
        <div className="card-luminous p-4 rounded-[8px] border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-medium">
            <span>Recoverable with Rules</span>
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">
            +{formatCurrencyINR(overview.potential_capital_recoverable_inr)}
          </div>
          <p className="text-[11px] font-mono text-emerald-600/80 dark:text-emerald-400/80">
            Protected via circuit breakers
          </p>
        </div>
      </div>

      {/* Cascade Event Selector Tabs & Detail or Clean Zero-Tilt State */}
      {overview.cascades.length === 0 ? (
        <div className="card-luminous p-8 sm:p-10 rounded-[8px] border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 mx-auto flex items-center justify-center">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Zero Tilt Cascades Detected
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
              Forensic analysis detected no revenge trading spirals, velocity compression, or emotional lot size inflation in your trades. Your execution discipline remains intact.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                Isolated Tilt Incident Records
              </h3>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Click to inspect forensic sequence
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {overview.cascades.map((cascade) => {
                const isSelected = cascade.id === selectedCascade?.id;

                return (
                  <button
                    key={cascade.id}
                    type="button"
                    onClick={() => setSelectedCascadeId(cascade.id)}
                    className={`p-3.5 rounded-[6px] text-left border transition-colors ${
                      isSelected
                        ? "bg-[#2b7fff]/10 border-[#2b7fff] text-slate-900 dark:text-white dark:bg-[#2b7fff]/15"
                        : "bg-white dark:bg-[#090e1a] border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.16]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-xs font-bold font-mono flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          <span>{cascade.title}</span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {cascade.total_trades_count} trades in {cascade.total_duration_minutes}m • Min Gap {cascade.min_reentry_interval_minutes}m
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
                          -{formatCurrencyINR(cascade.total_cascade_loss_inr)}
                        </div>
                        <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                          +{formatCurrencyINR(cascade.counterfactual_circuit_breaker.avoided_loss_inr)} savable
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Cascade Detail View */}
          {selectedCascade && (
            <div className="space-y-6">
              {/* Counterfactual Circuit Breaker Simulation */}
              <CircuitBreakerCard cascade={selectedCascade} />

              {/* Chronological Step-by-Step Flow */}
              <CascadeTimeline cascade={selectedCascade} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
