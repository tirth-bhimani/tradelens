"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ArrowRight, ShieldCheck, Zap, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { HeroDashboardGraphic } from "./HeroDashboardGraphic";

const TRADING_SEGMENTS = [
  { name: "Equity Intraday", color: "bg-blue-500" },
  { name: "F&O Index Options", color: "bg-emerald-500" },
  { name: "Stock Futures", color: "bg-indigo-500" },
  { name: "Commodity & MCX", color: "bg-amber-500" },
  { name: "CSV & Excel Ledgers", color: "bg-slate-700" },
];

const ROTATING_WORDS = ["Journal", "Backtest", "Replay", "Audit Leaks", "Autopsy Tilt"];

export function HeroSection() {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative overflow-hidden pt-24 pb-16 md:pt-32 md:pb-24 bg-white dark:bg-[#050814] transition-colors duration-200">
      {/* Background Soft Mesh Ambient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-tr from-blue-200/25 dark:from-blue-900/25 via-sky-100/20 dark:via-sky-950/15 to-transparent rounded-[30px] blur-3xl pointer-events-none -z-10" />

      {/* ====================================================================
          TradersJournal Signature Traveling Grid Laser Beams & Spark Impacts
          ==================================================================== */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden select-none -z-10">
        {/* Vertical Dotted Grid Lines */}
        <div
          className="absolute top-0 bottom-0 left-[8%] w-[1px] opacity-60 dark:opacity-40"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, rgba(43, 127, 255, 0.25) 0px, rgba(43, 127, 255, 0.25) 5px, transparent 5px, transparent 14px)",
            maskImage: "linear-gradient(to bottom, transparent 0%, #000 16%, #000 84%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 16%, #000 84%, transparent 100%)",
          }}
        />
        <div
          className="absolute top-0 bottom-0 left-[52%] w-[1px] opacity-60 dark:opacity-40"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, rgba(43, 127, 255, 0.25) 0px, rgba(43, 127, 255, 0.25) 5px, transparent 5px, transparent 14px)",
            maskImage: "linear-gradient(to bottom, transparent 0%, #000 16%, #000 84%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 16%, #000 84%, transparent 100%)",
          }}
        />
        <div
          className="absolute top-0 bottom-0 left-[92%] w-[1px] opacity-60 dark:opacity-40"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, rgba(43, 127, 255, 0.25) 0px, rgba(43, 127, 255, 0.25) 5px, transparent 5px, transparent 14px)",
            maskImage: "linear-gradient(to bottom, transparent 0%, #000 16%, #000 84%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 16%, #000 84%, transparent 100%)",
          }}
        />

        {/* Horizontal Dotted Grid Lines */}
        <div
          className="absolute left-0 right-0 top-[18%] h-[1px] opacity-60 dark:opacity-40"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to right, rgba(43, 127, 255, 0.25) 0px, rgba(43, 127, 255, 0.25) 5px, transparent 5px, transparent 14px)",
            maskImage: "linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%)",
          }}
        />
        <div
          className="absolute left-0 right-0 top-[54%] h-[1px] opacity-60 dark:opacity-40"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to right, rgba(43, 127, 255, 0.25) 0px, rgba(43, 127, 255, 0.25) 5px, transparent 5px, transparent 14px)",
            maskImage: "linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%)",
          }}
        />
        <div
          className="absolute left-0 right-0 top-[82%] h-[1px] opacity-60 dark:opacity-40"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to right, rgba(43, 127, 255, 0.25) 0px, rgba(43, 127, 255, 0.25) 5px, transparent 5px, transparent 14px)",
            maskImage: "linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%)",
          }}
        />

        {/* Intersection Anchor Dots */}
        <div className="absolute left-[8%] top-[18%] w-1.5 h-1.5 rounded-full bg-blue-500/30 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute left-[8%] top-[54%] w-1.5 h-1.5 rounded-full bg-blue-500/30 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute left-[8%] top-[82%] w-1.5 h-1.5 rounded-full bg-blue-500/30 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute left-[52%] top-[18%] w-1.5 h-1.5 rounded-full bg-blue-500/30 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute left-[52%] top-[54%] w-1.5 h-1.5 rounded-full bg-blue-500/30 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute left-[52%] top-[82%] w-1.5 h-1.5 rounded-full bg-blue-500/30 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute left-[92%] top-[18%] w-1.5 h-1.5 rounded-full bg-blue-500/30 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute left-[92%] top-[54%] w-1.5 h-1.5 rounded-full bg-blue-500/30 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute left-[92%] top-[82%] w-1.5 h-1.5 rounded-full bg-blue-500/30 -translate-x-1/2 -translate-y-1/2" />

        {/* Traveling Grid Laser Beams */}
        <div className="hero-grid-beam-track" style={{ top: "18%", width: "44%", ["--beam-delay" as string]: "0s" }}>
          <div className="hero-grid-beam" />
        </div>
        <div className="hero-grid-beam-track" style={{ top: "54%", width: "44%", ["--beam-delay" as string]: "2.8s" }}>
          <div className="hero-grid-beam" />
        </div>
        <div className="hero-grid-beam-track" style={{ top: "82%", width: "44%", ["--beam-delay" as string]: "5.6s" }}>
          <div className="hero-grid-beam" />
        </div>

        {/* Impact Explosion Points with Radiating Sparks */}
        <div className="hero-grid-impact" style={{ left: "52%", top: "18%", ["--beam-delay" as string]: "0s" }}>
          <span className="hero-grid-impact-flash" />
          <span className="hero-grid-impact-bubble" />
          <span className="hero-grid-impact-haze" />
          <span className="hero-grid-impact-dot" style={{ ["--dx" as string]: "-5px", ["--dy" as string]: "-15px", ["--size" as string]: "2.6px" }} />
          <span className="hero-grid-impact-dot" style={{ ["--dx" as string]: "4px", ["--dy" as string]: "-18px", ["--size" as string]: "2.8px" }} />
          <span className="hero-grid-impact-dot" style={{ ["--dx" as string]: "8px", ["--dy" as string]: "-12px", ["--size" as string]: "2.4px" }} />
          <span className="hero-grid-impact-dot" style={{ ["--dx" as string]: "-8px", ["--dy" as string]: "-9px", ["--size" as string]: "2.2px" }} />
          <span className="hero-grid-impact-dot" style={{ ["--dx" as string]: "10px", ["--dy" as string]: "-7px", ["--size" as string]: "2.1px" }} />
        </div>

        <div className="hero-grid-impact" style={{ left: "52%", top: "54%", ["--beam-delay" as string]: "2.8s" }}>
          <span className="hero-grid-impact-flash" />
          <span className="hero-grid-impact-bubble" />
          <span className="hero-grid-impact-haze" />
          <span className="hero-grid-impact-dot" style={{ ["--dx" as string]: "-6px", ["--dy" as string]: "-14px", ["--size" as string]: "2.6px" }} />
          <span className="hero-grid-impact-dot" style={{ ["--dx" as string]: "3px", ["--dy" as string]: "-19px", ["--size" as string]: "2.9px" }} />
          <span className="hero-grid-impact-dot" style={{ ["--dx" as string]: "7px", ["--dy" as string]: "-11px", ["--size" as string]: "2.3px" }} />
          <span className="hero-grid-impact-dot" style={{ ["--dx" as string]: "-7px", ["--dy" as string]: "-10px", ["--size" as string]: "2.1px" }} />
        </div>

        <div className="hero-grid-impact" style={{ left: "52%", top: "82%", ["--beam-delay" as string]: "5.6s" }}>
          <span className="hero-grid-impact-flash" />
          <span className="hero-grid-impact-bubble" />
          <span className="hero-grid-impact-haze" />
          <span className="hero-grid-impact-dot" style={{ ["--dx" as string]: "-5px", ["--dy" as string]: "-16px", ["--size" as string]: "2.7px" }} />
          <span className="hero-grid-impact-dot" style={{ ["--dx" as string]: "4px", ["--dy" as string]: "-18px", ["--size" as string]: "2.8px" }} />
          <span className="hero-grid-impact-dot" style={{ ["--dx" as string]: "9px", ["--dy" as string]: "-13px", ["--size" as string]: "2.4px" }} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Value Proposition with Motion Stagger */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 space-y-6 text-left"
          >
            {/* "The Unfair Advantage" Interactive Folder Fan-Out Cards */}
            <div>
              <button
                type="button"
                className="adv-tag group cursor-pointer"
                aria-label="The Unfair Advantage"
                onClick={() => {
                  const target = document.getElementById("features");
                  target?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <span className="adv-icon" aria-hidden="true">
                  {/* Fanning Card 1: Replay Engine */}
                  <span
                    className="adv-card c1 flex flex-col justify-between p-1 bg-gradient-to-br from-blue-950 to-slate-900 border-blue-400/40 text-[6px] text-blue-300 font-mono font-bold"
                  >
                    <span>REPLAY</span>
                    <span className="text-emerald-400">+₹94K</span>
                  </span>

                  {/* Fanning Card 2: Tilt Autopsy */}
                  <span
                    className="adv-card c2 flex flex-col justify-between p-1 bg-gradient-to-br from-rose-950 to-slate-900 border-rose-400/40 text-[6px] text-rose-300 font-mono font-bold"
                  >
                    <span>AUTOPSY</span>
                    <span className="text-rose-400">-₹38K</span>
                  </span>

                  {/* Fanning Card 3: Rule Lab */}
                  <span
                    className="adv-card c3 flex flex-col justify-between p-1 bg-gradient-to-br from-amber-950 to-slate-900 border-amber-400/40 text-[6px] text-amber-300 font-mono font-bold"
                  >
                    <span>70/30</span>
                    <span className="text-emerald-400">ALPHA</span>
                  </span>

                  {/* Fanning Card 4: Sec 288B Tax */}
                  <span
                    className="adv-card c4 flex flex-col justify-between p-1 bg-gradient-to-br from-emerald-950 to-slate-900 border-emerald-400/40 text-[6px] text-emerald-300 font-mono font-bold"
                  >
                    <span>TAX 288B</span>
                    <span className="text-sky-300">0% ERR</span>
                  </span>

                  {/* Golden Folder with Perspective 3D Flap */}
                  <svg className="adv-folder-svg" width="26" height="21" viewBox="0 0 26 21" fill="none">
                    <defs>
                      <linearGradient id="afb-Rlm" x1="13" y1="7" x2="13" y2="21" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#FFE060" />
                        <stop offset="44%" stopColor="#FFC018" />
                        <stop offset="100%" stopColor="#D88000" />
                      </linearGradient>
                      <linearGradient id="aff-Rlm" x1="13" y1="5.5" x2="13" y2="12" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#FFEE80" />
                        <stop offset="100%" stopColor="#FFC820" />
                      </linearGradient>
                      <linearGradient id="aft-Rlm" x1="6" y1="3" x2="6" y2="8" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#FFE880" />
                        <stop offset="100%" stopColor="#FFBB18" />
                      </linearGradient>
                    </defs>
                    <rect x="1" y="7.5" width="24" height="12.5" rx="2" fill="url(#afb-Rlm)" />
                    <rect x="1" y="7.5" width="24" height="2.5" rx="1" fill="rgba(255,244,138,0.38)" />
                    <rect x="2" y="18.5" width="22" height="1" rx="0.5" fill="rgba(0,0,0,0.16)" />
                    <path d="M1 8.5 L1 5.5 Q1 3.5 2.5 3.5 L9.5 3.5 Q11.2 3.5 12 6 L13 8.5 Z" fill="url(#aft-Rlm)" />
                    <path d="M2 8 L2 6.2 Q2 5 3 5 L9 5 Q10.2 5 10.8 6.5 L11.5 8 Z" fill="rgba(255,252,172,0.28)" />
                    <g className="adv-flap">
                      <rect x="1" y="5.5" width="24" height="5.5" rx="1.5" fill="url(#aff-Rlm)" />
                      <rect x="1" y="5.5" width="24" height="2" rx="1" fill="rgba(255,252,190,0.62)" />
                    </g>
                  </svg>
                </span>

                <span>The Unfair Advantage</span>
                <span className="adv-sep" />
                <span className="adv-arrow">→</span>
              </button>
            </div>

            {/* Main Headline with Smooth Rotating Word */}
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.14]"
            >
              <span>Stop trading on emotion.</span> <br />
              <span className="text-slate-800 dark:text-slate-100">The #1 platform to </span>
              <span className="inline-flex min-w-[7.5ch] h-[1.12em] overflow-hidden align-baseline">
                <span
                  key={wordIndex}
                  className="hero-rotating-word text-[#2b7fff] dark:text-[#387ed1]"
                >
                  {ROTATING_WORDS[wordIndex]}
                </span>
              </span>
              <br className="hidden sm:inline" />
              <span className="text-slate-800 dark:text-slate-100"> your trades.</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="text-slate-600 dark:text-slate-300 text-sm sm:text-base max-w-xl leading-relaxed"
            >
              Import your Zerodha, Groww, AngelOne, or Dhan tradebook. Uncover the exact rupee cost of revenge entries, overtrading, and tilt with forensic precision. Replay rules with 70/30 out-of-sample rigor.
            </motion.p>

            {/* CTA Group: TradersJournal Signature Liquid Circle Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1"
            >
              <Link
                href="/signup"
                className="hero-kiro-btn-cta text-sm"
              >
                <span>Import Tradebook Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="#leaks"
                className="hero-kiro-btn-outline text-sm"
              >
                <span>Audit 4 Deadly Leaks</span>
              </Link>
            </motion.div>

            {/* Supported Trading Segments */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.6 }}
              className="pt-5 border-t border-slate-200/80 dark:border-slate-800/80"
            >
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2.5 uppercase tracking-wider">
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

          {/* Right Column: Hero Dashboard Graphic with Ambient Floating Badges */}
          <div className="lg:col-span-6 relative flex items-center justify-center">
            {/* Top-Right Floating Telemetry Badge */}
            <div className="hidden sm:flex absolute -top-5 right-2 z-20 items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-white text-xs font-semibold shadow-xl backdrop-blur-md animate-float">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>70/30 OOS Replay Verified</span>
            </div>

            {/* Bottom-Left Floating Forensic Tilt Badge */}
            <div className="hidden sm:flex absolute -bottom-5 left-2 z-20 items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-blue-500/40 text-blue-200 text-xs font-semibold shadow-xl backdrop-blur-md animate-float-delayed">
              <Activity className="w-3.5 h-3.5 text-[#2b7fff]" />
              <span>Forensic Cascade Intercept Active</span>
            </div>

            <HeroDashboardGraphic />
          </div>
        </div>
      </div>
    </section>
  );
}
