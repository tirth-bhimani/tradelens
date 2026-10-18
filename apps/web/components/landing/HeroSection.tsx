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
            {/* Live Indicator Pill: Institutional Badge */}
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-[4px] bg-slate-100 dark:bg-slate-850 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Behavioral Audit Engine • Deterministic Backtester</span>
            </div>

            {/* Main Headline: Razor-sharp Dribbble Typography */}
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.12]"
            >
              Stop trading on emotion. <br className="hidden sm:inline" />
              <span className="text-[#387ed1]">Quantify and eliminate your leaks.</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="text-slate-600 dark:text-slate-300 text-sm sm:text-base max-w-xl leading-relaxed"
            >
              Import your broker tradebook to uncover the exact rupee cost of overtrading, revenge entries, and holding losers. Backtest personal rule guardrails with rigorous 70/30 out-of-sample replay.
            </motion.p>

            {/* CTA Group: Crisp 4px Professional Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1"
            >
              <Link
                href="/signup"
                className="btn-zerodha-primary text-sm py-2.5 px-6 inline-flex items-center justify-center space-x-2"
              >
                <span>Import Tradebook Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="#leaks"
                className="btn-zerodha-secondary text-sm py-2.5 px-6 inline-flex items-center justify-center"
              >
                <span>Audit 4 Deadly Leaks</span>
              </Link>
            </motion.div>

            {/* Supported Trading Segments */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.6 }}
              className="pt-5 border-t border-slate-200/80 dark:border-slate-800"
            >
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2.5">
                Indian Broker &amp; Exchange Ingestion
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                {TRADING_SEGMENTS.map((seg) => (
                  <span
                    key={seg.name}
                    className="px-2.5 py-1 rounded-[4px] bg-slate-50 dark:bg-[#0c111c] border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${seg.color}`} /> {seg.name}
                  </span>
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
