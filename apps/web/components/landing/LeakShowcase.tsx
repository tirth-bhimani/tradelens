"use client";

import { AlertOctagon, TrendingDown } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { AnimatedCounter } from "./AnimatedCounter";

const LEAKS = [
  {
    id: "revenge-trading",
    name: "Revenge Trading",
    badge: "Most Destructive",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200/80",
    description: "Taking an immediate high-emotion trade within 5 minutes of a stop-loss hit to 'win back' money.",
    stat: "42% of monthly losses",
    impactVal: 38500,
    impactPrefix: "-₹",
    ruleFix: "Cooldown period: 30-minute mandatory break after consecutive losses.",
    ruleImpact: "84% drawdown avoided",
    svgPath: "M0,15 Q30,5 60,25 T120,40 T180,60",
    strokeColor: "#e11d48",
  },
  {
    id: "overtrading",
    name: "Overtrading & Chop Addiction",
    badge: "Fee Drainer",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200/80",
    description: "Exceeding your planned trade count and forcing entries into low-probability afternoon consolidation.",
    stat: "12+ trades / session",
    impactVal: 14200,
    impactPrefix: "₹",
    impactSuffix: " in avoidable fees",
    ruleFix: "Max trades per day cutoff + No new entries after 1:30 PM.",
    ruleImpact: "+₹14,200 net retained",
    svgPath: "M0,20 Q40,10 80,45 T140,30 T180,55",
    strokeColor: "#d97706",
  },
  {
    id: "size-creep",
    name: "Position Size Creep",
    badge: "Risk Violation",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200/80",
    description: "Arbitrarily doubling or tripling lot sizes to recover faster, turning small drawdowns into blown capital.",
    stat: "3x normal lot exposure",
    impactVal: 24600,
    impactPrefix: "-₹",
    impactSuffix: " single trade blowup",
    ruleFix: "Fixed position size rule: Strict max 2 lots per contract.",
    ruleImpact: "Stabilizes equity variance",
    svgPath: "M0,10 Q50,15 90,50 T150,65 T180,70",
    strokeColor: "#9333ea",
  },
  {
    id: "holding-losers",
    name: "Asymmetric Holding Time",
    badge: "Psychological Trap",
    badgeColor: "bg-blue-50 text-[#387ed1] border-blue-200/80",
    description: "Cutting profitable scalps in 3 minutes while holding losing positions for 2 hours hoping for breakeven.",
    stat: "1:4 Risk-Reward distortion",
    impactVal: 19800,
    impactPrefix: "-₹",
    impactSuffix: " trailing drag",
    ruleFix: "Hard stop-loss enforcement + Time-based exit at 45 minutes.",
    ruleImpact: "Positive expectancy restored",
    svgPath: "M0,25 Q45,20 90,35 T140,60 T180,68",
    strokeColor: "#387ed1",
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

export function LeakShowcase() {
  return (
    <section id="leaks" className="py-16 md:py-24 bg-slate-50/60 border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-40px" }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto space-y-3"
        >
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-[3px] bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-wider">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
            <span>Behavioral Diagnostics</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            The 4 Deadly Leaks <span className="text-rose-600">Draining Indian Traders</span>
          </h2>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            Most traders don&apos;t fail because of technical analysis. They fail because of predictable psychological leaks that quietly wipe out hard-earned profits.
          </p>
        </motion.div>

        {/* 4 Cards Grid with In-View Stagger and Animated Drawdown Curve */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: "-40px" }}
          className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-5"
        >
          {LEAKS.map((leak) => (
            <motion.div
              key={leak.id}
              variants={cardVariants}
              whileHover={{ y: -4, transition: { type: "spring", stiffness: 350, damping: 20 } }}
              className="p-6 card-zerodha-glass flex flex-col justify-between space-y-4 cursor-default relative overflow-hidden group"
            >
              {/* Subtle background animated curve on hover */}
              <div className="absolute top-2 right-2 w-36 h-20 opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity">
                <svg viewBox="0 0 180 80" className="w-full h-full overflow-visible">
                  <motion.path
                    d={leak.svgPath}
                    fill="none"
                    stroke={leak.strokeColor}
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: false }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                </svg>
              </div>

              <div className="space-y-3 relative z-10">
                <div className="flex items-center justify-between">
                  <span className={`tag-zerodha border ${leak.badgeColor}`}>
                    {leak.badge}
                  </span>
                  <div className="flex items-center space-x-1 text-xs font-bold text-rose-600">
                    <TrendingDown className="w-3.5 h-3.5 inline" />
                    <span>
                      <AnimatedCounter
                        value={leak.impactVal}
                        prefix={leak.impactPrefix}
                        suffix={leak.impactSuffix}
                      />
                    </span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#387ed1] transition-colors">
                  {leak.name}
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {leak.description}
                </p>

                <div className="flex items-center space-x-2 text-xs text-slate-500 pt-1">
                  <span className="font-semibold text-slate-700">Metric Indicator:</span>
                  <span className="text-slate-600">{leak.stat}</span>
                </div>
              </div>

              {/* Guardrail Fix Callout */}
              <div className="pt-3 border-t border-slate-100 bg-slate-50/70 -mx-6 -mb-6 p-4 rounded-b-[7px] flex items-center justify-between relative z-10">
                <div>
                  <div className="text-[11px] font-semibold text-[#387ed1]">Rule Lab Guardrail:</div>
                  <div className="text-xs text-slate-800 font-medium mt-0.5">{leak.ruleFix}</div>
                </div>
                <div className="text-right pl-3 shrink-0">
                  <div className="text-xs font-bold text-emerald-600">{leak.ruleImpact}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
