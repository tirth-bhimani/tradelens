"use client";

import { useState } from "react";
import { AlertOctagon, TrendingDown, ShieldCheck, ArrowRight, Activity, Zap } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AnimatedCounter } from "./AnimatedCounter";

const LEAKS = [
  {
    code: "LEAK 01",
    id: "revenge-trading",
    name: "Revenge Trading After Stopout",
    category: "EMOTIONAL TILT",
    description: "Executing an impulsive, high-emotion entry within 5 minutes of a losing trade to forcibly 'make back' capital.",
    statLabel: "Account Impact",
    statValue: "42% of monthly losses",
    impactVal: 38500,
    impactPrefix: "-₹",
    impactSuffix: "/mo",
    ruleGuard: "Rule 02: Mandatory 30-Min Post-Loss Cooldown",
    ruleImpact: "84% Drawdown Avoided",
    svgD: "M 0 30 Q 30 15, 60 45 T 120 70 T 180 95",
    color: "#ef4444",
  },
  {
    code: "LEAK 02",
    id: "overtrading",
    name: "Afternoon Overtrading & Chop Churn",
    category: "TURNOVER DRAG",
    description: "Forcing low-conviction scalps in 1:30 PM consolidation, turning a green morning session into a red day via statutory fees.",
    statLabel: "Frequency Drain",
    statValue: "12+ trades / session",
    impactVal: 14200,
    impactPrefix: "₹",
    impactSuffix: " in avoidable fees",
    ruleGuard: "Rule 01: Max 4 Trades/Day + 1:30 PM Session Cap",
    ruleImpact: "+₹14,200 Net Retained",
    svgD: "M 0 40 Q 40 25, 80 60 T 140 50 T 180 80",
    color: "#f59e0b",
  },
  {
    code: "LEAK 03",
    id: "size-creep",
    name: "Post-Loss Position Size Creep",
    category: "RISK MULTIPLIER",
    description: "Doubling or tripling lot exposure immediately following a loss, converting small controlled stopouts into blown accounts.",
    statLabel: "Risk Asymmetry",
    statValue: "3x normal lot exposure",
    impactVal: 24600,
    impactPrefix: "-₹",
    impactSuffix: " single blowup",
    ruleGuard: "Rule 03: Fixed Max 2 Lots Position Cap",
    ruleImpact: "Stabilizes Portfolio Variance",
    svgD: "M 0 20 Q 50 30, 90 75 T 150 90 T 180 100",
    color: "#8b5cf6",
  },
  {
    code: "LEAK 04",
    id: "holding-losers",
    name: "Asymmetric Loss Holding Time",
    category: "DISPOSITION EFFECT",
    description: "Snipping winning trades in 3 minutes for small profits while holding losing contracts for 2 hours hoping for breakeven.",
    statLabel: "Holding Ratio",
    statValue: "1:4 Win/Loss Time Distortion",
    impactVal: 19800,
    impactPrefix: "-₹",
    impactSuffix: " trailing drag",
    ruleGuard: "Rule 04: Hard Stoploss + 45-Min Time Exit",
    ruleImpact: "Positive Expectancy Restored",
    svgD: "M 0 35 Q 45 30, 90 55 T 140 85 T 180 95",
    color: "#387ed1",
  },
];

export function LeakShowcase() {
  const [hoveredLeak, setHoveredLeak] = useState<string | null>(null);

  return (
    <section id="leaks" className="py-16 md:py-24 bg-slate-50 dark:bg-[#070b13] border-t border-slate-200 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Section Header: Crisp Institutional Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-40px" }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800"
        >
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-[4px] bg-slate-100 dark:bg-slate-850 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium">
              <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
              <span>Behavioral Audit Matrix • Sec 288B Taxonomy</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              The 4 Systemic Leaks <span className="text-[#387ed1]">Draining Retail Accounts</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Traders rarely fail on chart analysis. They fail because unmeasured behavioral tilt destroys risk-to-reward ratios. TradeLens isolates these four specific failure modes from your trade fills.
            </p>
          </div>

          <div className="shrink-0">
            <Link
              href="/imports"
              className="btn-zerodha-primary text-xs py-2 px-4 inline-flex items-center space-x-1.5"
            >
              <span>Audit Your Tradebook</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>

        {/* Unified 4-Quadrant Behavioral Diagnostic Matrix (No Box-in-Box Soup) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-40px" }}
          transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c111c] rounded-[8px] overflow-hidden shadow-sm"
        >
          {LEAKS.map((leak, idx) => (
            <div
              key={leak.id}
              onMouseEnter={() => setHoveredLeak(leak.id)}
              onMouseLeave={() => setHoveredLeak(null)}
              className={`p-6 sm:p-7 flex flex-col justify-between space-y-5 transition-colors duration-150 ${
                idx >= 2 ? "md:border-t md:border-slate-200 dark:md:border-slate-800" : ""
              } ${hoveredLeak === leak.id ? "bg-slate-50/80 dark:bg-[#0f1624]" : ""}`}
            >
              {/* Header: Leak Code + Category */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-slate-900 dark:text-white px-2 py-0.5 rounded-[3px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      {leak.code}
                    </span>
                    <span className="text-xs text-slate-500">
                      {leak.category}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1 text-xs font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>
                      <AnimatedCounter
                        value={leak.impactVal}
                        prefix={leak.impactPrefix}
                        suffix={leak.impactSuffix}
                      />
                    </span>
                  </div>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white pt-1">
                  {leak.name}
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {leak.description}
                </p>
              </div>

              {/* Middle: Metric Indicator & Mini Drawdown Curve */}
              <div className="p-3 rounded-[4px] bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">
                    {leak.statLabel}
                  </span>
                  <span className="text-xs font-bold tabular-nums text-slate-800 dark:text-slate-200">
                    {leak.statValue}
                  </span>
                </div>

                {/* SVG Curve */}
                <div className="w-28 h-8 opacity-80">
                  <svg viewBox="0 0 180 100" className="w-full h-full overflow-visible">
                    <path
                      d={leak.svgD}
                      fill="none"
                      stroke={leak.color}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Footer: Prescribed Rule Lab Guardrail */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="space-y-0.5 max-w-[70%]">
                  <span className="text-[11px] text-[#387ed1] dark:text-sky-400 font-semibold block">
                    Rule Lab Countermeasure
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 block truncate">
                    {leak.ruleGuard}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-[3px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                    ✓ {leak.ruleImpact}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
