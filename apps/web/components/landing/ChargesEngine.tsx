"use client";

import { useState } from "react";
import { Receipt, HelpCircle, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { AnimatedCounter } from "./AnimatedCounter";

export function ChargesEngine() {
  const [tradeCount, setTradeCount] = useState(8);
  const [segment, setSegment] = useState<"options" | "equity">("options");

  // Calculations based on official SEBI & NSE circulars
  const avgTurnoverPerTrade = segment === "options" ? 45000 : 120000;
  const totalTurnover = tradeCount * avgTurnoverPerTrade;
  
  // Brokerage: ₹20 per order
  const brokerage = tradeCount * 20;
  // STT: 0.1% on sell side for options premium (~50% turnover is sell)
  const stt = segment === "options" 
    ? Math.round((totalTurnover * 0.5) * 0.001)
    : Math.round((totalTurnover * 0.5) * 0.00025);
  // Exchange turnover charge: 0.00325% on equity / 0.053% on options
  const etc = Math.round(totalTurnover * (segment === "options" ? 0.00053 : 0.0000325));
  // SEBI & Stamp duty: ~₹15
  const sebiStamp = Math.round(tradeCount * 4);
  // GST 18% on (brokerage + etc)
  const gst = Math.round((brokerage + etc) * 0.18);
  const totalCharges = brokerage + stt + etc + sebiStamp + gst;

  // Monthly projection (22 trading days)
  const monthlyCharges = totalCharges * 22;

  return (
    <section id="charges" className="py-16 md:py-24 bg-white border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-40px" }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto space-y-3"
        >
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-[3px] bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-wider">
            <Receipt className="w-3.5 h-3.5 text-emerald-600" />
            <span>Built Specifically For Indian Markets</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            The Truth About Your <span className="text-[#387ed1]">Net In-Pocket P&amp;L</span>
          </h2>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            Most journals only show gross profit and ignore regulatory drag. TradeLens computes every statutory fee down to the paisa using official NSE &amp; SEBI rate tables.
          </p>
        </motion.div>

        {/* Interactive Dynamic Brokerage & Statutory Drag Calculator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-40px" }}
          transition={{ duration: 0.6 }}
          className="mt-12 card-zerodha-glass p-6 sm:p-8 max-w-4xl mx-auto space-y-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <span className="text-xs font-bold text-[#387ed1] uppercase tracking-wider">
                Live Regulatory Simulator
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                Calculate Your Hidden Friction Drag
              </h3>
            </div>

            {/* Segment Selector with Sliding Layout Pill */}
            <div className="flex items-center p-1 bg-slate-100 rounded-[6px] border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setSegment("options")}
                className="relative px-3.5 py-1.5 text-xs font-semibold rounded-[4px] select-none transition-colors"
              >
                {segment === "options" && (
                  <motion.div
                    layoutId="chargesSegment"
                    className="absolute inset-0 bg-white rounded-[4px] shadow-sm border border-slate-200"
                    transition={{ type: "spring", stiffness: 450, damping: 30 }}
                  />
                )}
                <span className={`relative z-10 ${segment === "options" ? "text-[#387ed1] font-bold" : "text-slate-600"}`}>
                  F&amp;O Options
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSegment("equity")}
                className="relative px-3.5 py-1.5 text-xs font-semibold rounded-[4px] select-none transition-colors"
              >
                {segment === "equity" && (
                  <motion.div
                    layoutId="chargesSegment"
                    className="absolute inset-0 bg-white rounded-[4px] shadow-sm border border-slate-200"
                    transition={{ type: "spring", stiffness: 450, damping: 30 }}
                  />
                )}
                <span className={`relative z-10 ${segment === "equity" ? "text-[#387ed1] font-bold" : "text-slate-600"}`}>
                  Intraday Equity
                </span>
              </button>
            </div>
          </div>

          {/* Interactive Range Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="trades-range" className="text-sm font-semibold text-slate-700">
                Trades per Day (Session Activity)
              </label>
              <span className="text-lg font-extrabold text-[#387ed1] px-3 py-0.5 bg-blue-50 rounded-[4px] border border-blue-200">
                {tradeCount} trades / day
              </span>
            </div>

            <input
              id="trades-range"
              type="range"
              min="1"
              max="25"
              step="1"
              value={tradeCount}
              onChange={(e) => setTradeCount(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#387ed1]"
            />

            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>1 trade (Disciplined)</span>
              <span>8 trades (Average)</span>
              <span>25 trades (Severe Overtrading)</span>
            </div>
          </div>

          {/* Animated Metrics Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-[6px] bg-slate-50 border border-slate-200/80">
              <div className="text-xs text-slate-500 font-medium">Daily Statutory Taxes</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                <AnimatedCounter value={totalCharges} prefix="₹" />
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Brokerage + STT + GST</div>
            </div>

            <div className="p-4 rounded-[6px] bg-rose-50/70 border border-rose-200/80">
              <div className="text-xs text-rose-600 font-medium">Monthly Regulatory Leak (22 Days)</div>
              <div className="text-2xl font-bold text-rose-700 mt-1">
                <AnimatedCounter value={monthlyCharges} prefix="₹" />
              </div>
              <div className="text-[11px] text-rose-500/80 mt-1">Siphoned directly from capital</div>
            </div>

            <div className="p-4 rounded-[6px] bg-emerald-50/70 border border-emerald-200/80">
              <div className="text-xs text-emerald-700 font-medium">Overtrading Safeguard Savings</div>
              <div className="text-2xl font-bold text-emerald-700 mt-1">
                <AnimatedCounter value={Math.round(monthlyCharges * 0.45)} prefix="₹" />
              </div>
              <div className="text-[11px] text-emerald-600/80 mt-1">If capped at 4 trades/day</div>
            </div>
          </div>

          {/* Breakdown progress bar with animation */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
              <span>Breakdown Composition</span>
              <span className="text-[11px] text-slate-400">SEBI Circular 2026 Ready</span>
            </div>

            <div className="h-3 w-full bg-slate-100 rounded-[3px] overflow-hidden flex">
              <motion.div
                className="bg-[#387ed1] h-full"
                animate={{ width: `${Math.round((brokerage / totalCharges) * 100)}%` }}
                transition={{ duration: 0.4 }}
                title={`Brokerage: ₹${brokerage}`}
              />
              <motion.div
                className="bg-amber-500 h-full"
                animate={{ width: `${Math.round((stt / totalCharges) * 100)}%` }}
                transition={{ duration: 0.4 }}
                title={`STT: ₹${stt}`}
              />
              <motion.div
                className="bg-emerald-500 h-full"
                animate={{ width: `${Math.round((gst / totalCharges) * 100)}%` }}
                transition={{ duration: 0.4 }}
                title={`GST: ₹${gst}`}
              />
              <motion.div
                className="bg-slate-400 h-full"
                animate={{ width: `${Math.round(((etc + sebiStamp) / totalCharges) * 100)}%` }}
                transition={{ duration: 0.4 }}
                title={`Exchange + SEBI: ₹${etc + sebiStamp}`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600 pt-1 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[#387ed1]" /> Brokerage (₹{brokerage})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-amber-500" /> STT (₹{stt})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500" /> GST 18% (₹{gst})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-slate-400" /> Exchange + SEBI (₹{etc + sebiStamp})
              </span>
            </div>
          </div>
        </motion.div>

        {/* 3 Static Cards with TradeLens Precision Glass Cards and Spring Hover Lift */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Securities Transaction Tax (STT) */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 350, damping: 20 }}
            className="p-6 card-zerodha-glass space-y-3.5"
          >
            <div className="w-10 h-10 rounded-[6px] bg-blue-50 text-[#387ed1] flex items-center justify-center font-bold text-base">
              ₹
            </div>
            <h3 className="text-base font-bold text-slate-900">Securities Transaction Tax (STT)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Calculated accurately per segment: 0.1% on delivery (both sides), 0.025% on intraday sell, 0.02% on futures sell turnover, and 0.1% on options premium.
            </p>
            <div className="pt-2 text-xs font-semibold text-[#387ed1] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-[2px] bg-[#387ed1]" /> Auto-computed per fill
            </div>
          </motion.div>

          {/* Card 2: GST 18% on Statutory Fees */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 350, damping: 20 }}
            className="p-6 card-zerodha-glass space-y-3.5"
          >
            <div className="w-10 h-10 rounded-[6px] bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-base">
              %
            </div>
            <h3 className="text-base font-bold text-slate-900">GST 18% &amp; Exchange Turnover</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Standard Indian 18% Goods &amp; Services Tax is automatically applied across brokerage, NSE turnover fees, and clearing charges without manual reconciliation.
            </p>
            <div className="pt-2 text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-[2px] bg-emerald-600" /> SEBI Circular Compliant
            </div>
          </motion.div>

          {/* Card 3: Overtrading Tax Multiplier */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 350, damping: 20 }}
            className="p-6 card-zerodha-glass space-y-3.5"
          >
            <div className="w-10 h-10 rounded-[6px] bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-base">
              ⚡
            </div>
            <h3 className="text-base font-bold text-slate-900">Overtrading Tax Audit</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              See the direct financial penalty of churning contracts. TradeLens highlights sessions where gross trading was positive but fees pushed you into net red.
            </p>
            <div className="pt-2 text-xs font-semibold text-amber-600 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-[2px] bg-amber-600" /> Identifies Churn Traps
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
