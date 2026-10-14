"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { HeroDashboardGraphic } from "./HeroDashboardGraphic";

const TRADING_SEGMENTS = [
  { name: "Equity Intraday", color: "bg-blue-500" },
  { name: "F&O Index Options", color: "bg-emerald-500" },
  { name: "Stock Futures", color: "bg-indigo-500" },
  { name: "Commodity & MCX", color: "bg-amber-500" },
  { name: "CSV & Excel Ledgers", color: "bg-slate-700" },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-8 pb-16 md:pt-14 md:pb-24 bg-white dark:bg-[#0b0f19] transition-colors duration-200">
      {/* Background Soft Mesh Ambient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-tr from-blue-100/30 dark:from-blue-900/20 via-sky-50/20 dark:via-sky-950/10 to-transparent rounded-[20px] blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Value Proposition with Motion Stagger */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 space-y-6 text-left"
          >
            {/* Live Indicator Pill */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="inline-flex items-center space-x-2 px-3 py-1 rounded-[4px] bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/80 text-[#387ed1] dark:text-sky-400 text-xs font-semibold"
            >
              <span className="radar-indicator w-2 h-2 rounded-full bg-emerald-500" />
              <span>NSE / BSE Live Engine Compatible</span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.14]"
            >
              Trade with discipline. <span className="text-[#387ed1]">Quantify your leaks.</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="text-slate-600 dark:text-slate-300 text-base sm:text-lg max-w-xl leading-relaxed"
            >
              Import tradebooks directly to isolate your costliest behavioral leaks: overtrading, revenge trading, and size creep. Test rule guardrails with deterministic 70/30 backtesting.
            </motion.p>

            {/* CTA Group with Shimmer Sweep */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2"
            >
              <Link
                href="/signup"
                className="btn-zerodha-primary btn-groww-shimmer text-base py-3.5 px-8"
              >
                <span>Start trading journal</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>

              <Link
                href="#rule-lab"
                className="btn-zerodha-secondary text-base py-3.5 px-8"
              >
                <span>Explore Rule Lab</span>
              </Link>
            </motion.div>

            {/* Supported Trading Segments with Spring Hover Lift */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.6 }}
              className="pt-6 border-t border-slate-200/80 dark:border-slate-800"
            >
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                Supported Markets &amp; Import Formats
              </p>
              <div className="flex flex-wrap items-center gap-3.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                {TRADING_SEGMENTS.map((seg) => (
                  <motion.span
                    key={seg.name}
                    whileHover={{ y: -3, scale: 1.03 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="px-3 py-1.5 rounded-[4px] bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm transition-colors cursor-default"
                  >
                    <span className={`w-2 h-2 rounded-[2px] ${seg.color}`} /> {seg.name}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column: Hero Dashboard Graphic */}
          <div className="lg:col-span-6 flex items-center justify-center">
            <HeroDashboardGraphic />
          </div>
        </div>
      </div>
    </section>
  );
}
