"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, ShieldAlert, CheckCircle2, Zap } from "lucide-react";
import { AnimatedCounter } from "./AnimatedCounter";

const LIVE_EVENTS = [
  {
    icon: Zap,
    text: "Tradebook execution synced in 120ms",
    badge: "Live Sync",
    badgeColor: "bg-emerald-50 text-emerald-700",
  },
  {
    icon: ShieldAlert,
    text: "Revenge entry blocked on NIFTY 24800 CE",
    badge: "Risk Protected",
    badgeColor: "bg-rose-50 text-rose-700",
  },
  {
    icon: CheckCircle2,
    text: "Max daily loss rule locked terminal at 1:15 PM",
    badge: "Discipline Active",
    badgeColor: "bg-blue-50 text-[#387ed1]",
  },
];

export function HeroDashboardGraphic() {
  const [activeEventIndex, setActiveEventIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveEventIndex((prev) => (prev + 1) % LIVE_EVENTS.length);
    }, 3800);
    return () => clearInterval(timer);
  }, []);

  const currentEvent = LIVE_EVENTS[activeEventIndex];
  const IconComponent = currentEvent.icon;

  return (
    <div className="relative w-full max-w-2xl mx-auto lg:max-w-none select-none">
      {/* Background Soft Mesh Ambient */}
      <div className="absolute -top-8 -right-8 w-80 h-80 bg-sky-100/40 rounded-[12px] blur-3xl pointer-events-none" />

      {/* Main Isometric Illustration Canvas */}
      <div className="relative flex flex-col items-center justify-center p-2 sm:p-4">
        {/* High-DPI Vector Artwork with Framer Motion spring entrance */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-[620px] aspect-[720/670] flex items-center justify-center"
        >
          <Image
            src="/hero-trading-desk.png"
            alt="Traders collaborating at TradeLens workstation"
            width={720}
            height={670}
            priority
            className="w-full h-auto object-contain drop-shadow-[0_16px_30px_rgba(2,132,199,0.12)]"
          />
        </motion.div>

        {/* Card 1: Top-Right Badge (Ambient float with spring hover) */}
        <motion.div
          whileHover={{ scale: 1.04, y: -4 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          className="absolute -top-1 right-2 sm:right-6 card-zerodha-glass !rounded-[4px] px-3.5 py-1.5 hidden sm:flex items-center space-x-2 text-xs font-semibold text-slate-800 animate-float-ambient cursor-default"
        >
          <span className="radar-indicator w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-slate-900 font-bold">⚡ Direct Sync</span>
          <span className="text-slate-300">|</span>
          <span className="text-[#387ed1]">70/30 Backtested</span>
        </motion.div>

        {/* Card 2: Top-Left Return Card with Live Animated Counter */}
        <motion.div
          whileHover={{ scale: 1.04, y: -4 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          className="absolute top-10 left-0 sm:-left-3 card-zerodha-glass p-3.5 max-w-[210px] hidden sm:block animate-float-delayed cursor-default"
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Rule P&amp;L</span>
            <div className="w-5 h-5 rounded-[3px] bg-blue-50 text-[#387ed1] flex items-center justify-center">
              <TrendingUp className="w-3 h-3" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1 flex items-baseline gap-1.5">
            <span className="text-slate-900 font-bold">
              +<AnimatedCounter value={184250} prefix="₹" />
            </span>
            <span className="tag-zerodha bg-emerald-50 text-emerald-700">
              +32.4%
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">142 verified fills replay</p>
        </motion.div>

        {/* Card 3: Bottom-Left Capital Protection */}
        <motion.div
          whileHover={{ scale: 1.04, y: -4 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          className="absolute -bottom-2 left-2 sm:left-4 card-zerodha-glass p-3.5 max-w-[230px] hidden sm:block animate-float-reverse cursor-default"
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-[4px] bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Revenge Entry Blocked</div>
              <div className="text-[10px] text-slate-500">3 post-loss trades skipped</div>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">Capital Protected</span>
            <span className="font-bold text-emerald-600">
              +<AnimatedCounter value={18400} prefix="₹" />
            </span>
          </div>
        </motion.div>

        {/* Card 4: Bottom-Right Discipline Score with Spring Animated % */}
        <motion.div
          whileHover={{ scale: 1.04, y: -4 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          className="absolute bottom-4 right-0 sm:right-2 card-zerodha-glass !rounded-[4px] px-3 py-2 hidden sm:flex items-center space-x-2.5 animate-float-ambient cursor-default"
        >
          <div className="w-8 h-8 rounded-[4px] bg-[#387ed1] text-white flex items-center justify-center text-xs font-bold shadow-sm">
            <AnimatedCounter value={75} suffix="%" />
          </div>
          <div className="text-left">
            <div className="text-[11px] font-bold text-slate-900 leading-tight">Discipline Score</div>
            <div className="text-[10px] text-slate-500">Drawdown cut by 48%</div>
          </div>
        </motion.div>

        {/* Dynamic TradeLens Live Event Feed Pill */}
        <div className="mt-4 w-full max-w-md">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeEventIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="card-zerodha-glass !rounded-[6px] px-3.5 py-2 flex items-center justify-between text-xs text-slate-700 shadow-sm"
            >
              <div className="flex items-center space-x-2.5">
                <span className="radar-indicator w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-medium text-slate-800">{currentEvent.text}</span>
              </div>
              <span className={`tag-zerodha shrink-0 ml-2 ${currentEvent.badgeColor}`}>
                {currentEvent.badge}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
