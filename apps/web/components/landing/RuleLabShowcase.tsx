"use client";

import { useState } from "react";
import { Check, Sliders, ShieldCheck, ArrowRight, Activity } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedCounter } from "./AnimatedCounter";

const CATALOG_RULES = [
  {
    id: "cooldown",
    title: "Cooldown After Loss",
    params: "30 min mandatory pause after 2 consecutive stopouts",
    benefit: "Eliminates emotional tilt entries",
    tag: "Discipline",
    beforeMetric: "Max Drawdown: -₹42,000",
    afterMetric: "Max Drawdown: -₹18,500",
    saved: 23500,
    path: "M0,70 L30,65 L60,85 L90,55 L120,40 L150,45 L180,25 L210,15 L250,5",
  },
  {
    id: "cutoff",
    title: "Daily Loss Cutoff",
    params: "Auto-lock trading when daily loss reaches -₹5,000",
    benefit: "Protects base capital from black-swan days",
    tag: "Risk Cap",
    beforeMetric: "Worst Day: -₹31,400",
    afterMetric: "Worst Day: -₹5,000",
    saved: 26400,
    path: "M0,70 L40,60 L75,75 L110,50 L145,50 L180,35 L215,20 L250,10",
  },
  {
    id: "maxtrades",
    title: "Max Trades Per Day",
    params: "Limit session to 4 high-conviction setups",
    benefit: "Cuts turnover charges by up to 55%",
    tag: "Overtrading",
    beforeMetric: "Avg Fees: ₹1,420/day",
    afterMetric: "Avg Fees: ₹380/day",
    saved: 18200,
    path: "M0,65 L35,55 L70,50 L105,42 L140,30 L175,25 L210,18 L250,8",
  },
  {
    id: "positionsize",
    title: "Fixed Position Sizing",
    params: "Cap size at 2 lots (NIFTY) regardless of confidence",
    benefit: "Prevents account-busting size creep",
    tag: "Position Sizing",
    beforeMetric: "Variance: ±₹28,000/trade",
    afterMetric: "Variance: ±₹4,500/trade",
    saved: 34100,
    path: "M0,70 L35,62 L70,48 L105,40 L140,32 L175,22 L210,15 L250,6",
  },
];

export function RuleLabShowcase() {
  const [selectedRuleId, setSelectedRuleId] = useState("cooldown");
  const selectedRule = CATALOG_RULES.find((r) => r.id === selectedRuleId) || CATALOG_RULES[0];

  return (
    <section id="rule-lab" className="py-16 md:py-24 bg-white dark:bg-[#0b0f19] border-t border-slate-200/80 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Explanation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, margin: "-40px" }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-5 space-y-6"
          >
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-[3px] bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[#387ed1] dark:text-sky-400 text-xs font-bold uppercase tracking-wider">
              <Sliders className="w-3.5 h-3.5 text-[#387ed1] dark:text-sky-400" />
              <span>Backtest Your Own History</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              Rule Lab Replay: See What <span className="text-[#387ed1]">Discipline Would Have Made You</span>
            </h2>

            <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
              Don&apos;t guess what rules would do. TradeLens deterministically replays your past trade executions through fixed behavioral filters.
            </p>

            <div className="space-y-3 pt-1">
              <div className="flex items-start space-x-3">
                <div className="p-1 rounded-[3px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">70/30 Train &amp; Test Split</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Rules calibrated on the first 70% of trades are rigorously tested against the remaining 30% out-of-sample data.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-1 rounded-[3px] bg-blue-50 dark:bg-blue-950/40 text-[#387ed1] dark:text-sky-400 mt-0.5 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Zero Overfitting Guarantee</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Curated rule templates prevent curve-fitting illusions and preserve true real-world edge.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/signup"
                className="btn-zerodha-primary"
              >
                <span>Replay your trades</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </motion.div>

          {/* Right Column: Interactive TradeLens Rule Selector & Backtest Chart */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, margin: "-40px" }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 space-y-4"
          >
            {/* Interactive Tab Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 bg-slate-100/80 dark:bg-slate-900 rounded-[6px] border border-slate-200 dark:border-slate-800">
              {CATALOG_RULES.map((rule) => {
                const isSelected = rule.id === selectedRuleId;
                return (
                  <button
                    key={rule.id}
                    type="button"
                    onClick={() => setSelectedRuleId(rule.id)}
                    className="relative text-xs font-semibold py-2 px-2.5 rounded-[4px] transition-colors text-center cursor-pointer select-none"
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="activeRuleTab"
                        className="absolute inset-0 bg-white dark:bg-slate-800 rounded-[4px] shadow-sm border border-slate-200/80 dark:border-slate-700"
                        transition={{ type: "spring", stiffness: 450, damping: 30 }}
                      />
                    )}
                    <span className={`relative z-10 ${isSelected ? "text-[#387ed1] dark:text-sky-400 font-bold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}>
                      {rule.title}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Simulation Card with Animated Curve and Metrics */}
            <div className="card-zerodha-glass p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="tag-zerodha bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-[#387ed1] dark:text-sky-400">
                      {selectedRule.tag}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Replay Simulation</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">{selectedRule.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{selectedRule.params}</p>
                </div>

                <div className="sm:text-right">
                  <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Capital Protected
                  </div>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    +<AnimatedCounter value={selectedRule.saved} prefix="₹" />
                  </div>
                </div>
              </div>

              {/* Dynamic SVG Equity Curve Replay with Animated Path */}
              <div className="relative bg-slate-50/80 dark:bg-slate-900/80 rounded-[6px] p-4 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                    <Activity className="w-3.5 h-3.5 text-[#387ed1] dark:text-sky-400" />
                    Equity Curve with Rule (Out-of-sample Test 30%)
                  </span>
                  <span className="tag-zerodha bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-200/60 dark:border-emerald-800/60">
                    +18.4% Alpha
                  </span>
                </div>

                <div className="h-32 w-full relative flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    <motion.svg
                      key={selectedRule.id}
                      viewBox="0 0 250 80"
                      className="w-full h-full overflow-visible"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {/* Grid lines */}
                      <line x1="0" y1="20" x2="250" y2="20" stroke="currentColor" className="text-slate-200 dark:text-slate-700/60" strokeDasharray="3 3" />
                      <line x1="0" y1="45" x2="250" y2="45" stroke="currentColor" className="text-slate-200 dark:text-slate-700/60" strokeDasharray="3 3" />
                      <line x1="0" y1="70" x2="250" y2="70" stroke="currentColor" className="text-slate-200 dark:text-slate-700/60" strokeDasharray="3 3" />

                      {/* Ghost line (Without Rule) */}
                      <path
                        d="M0,70 L30,68 L60,78 L90,82 L120,72 L150,78 L180,82 L210,88 L250,90"
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />

                      {/* Active Line (With Rule) */}
                      <motion.path
                        d={selectedRule.path}
                        fill="none"
                        stroke="#387ed1"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.9, ease: "easeOut" }}
                      />
                    </motion.svg>
                  </AnimatePresence>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                      <span className="w-2.5 h-0.5 bg-[#387ed1] inline-block" /> With TradeLens Guardrail
                    </span>
                    <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                      <span className="w-2.5 h-0.5 bg-slate-400 border-dashed border-t inline-block" /> Unfiltered Baseline
                    </span>
                  </div>
                  <span>142 Replay Fills</span>
                </div>
              </div>

              {/* Before vs After Callout */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-[4px] bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/40">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Without Guardrail</div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{selectedRule.beforeMetric}</div>
                </div>
                <div className="p-3 rounded-[4px] bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/40">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">With TradeLens Replay</div>
                  <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 mt-0.5">{selectedRule.afterMetric}</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
