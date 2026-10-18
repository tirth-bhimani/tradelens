"use client";

import { useState } from "react";
import {
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Clock,
  ArrowUpRight,
  Activity,
  Layers,
  Lock,
} from "lucide-react";

export function HeroDashboardGraphic() {
  const [activeMode, setActiveMode] = useState<"guarded" | "unguided">("guarded");
  const [activeTimeframe, setActiveTimeframe] = useState<"1D" | "1W" | "1M" | "ALL">("1M");
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  // SVG Chart data for "Guarded" (steady compounding) vs "Unguided" (severe drawdown)
  const guardedPoints = [
    { x: 20, y: 155, pnl: "+₹12,400", label: "Trade #12: RELIANCE (Intraday)", date: "Oct 04" },
    { x: 90, y: 140, pnl: "+₹28,600", label: "Trade #28: NIFTY 24800 CE", date: "Oct 08" },
    { x: 160, y: 132, pnl: "+₹41,200", label: "Trade #45: TCS (Swing)", date: "Oct 11" },
    { x: 230, y: 125, pnl: "+₹58,400", label: "Trade #62: BANKNIFTY 51200 PE", date: "Oct 14" },
    { x: 300, y: 95, pnl: "+₹94,800", label: "Trade #88: INFY (Replay)", date: "Oct 18" },
    { x: 370, y: 70, pnl: "+₹1,32,400", label: "Trade #114: NIFTY 25000 CE", date: "Oct 22" },
    { x: 440, y: 48, pnl: "+₹1,64,100", label: "Trade #129: TATAMOTORS", date: "Oct 25" },
    { x: 500, y: 30, pnl: "+₹1,84,250", label: "Trade #142: HDFCBANK", date: "Oct 28" },
  ];

  const unguidedPoints = [
    { x: 20, y: 155, pnl: "+₹12,400", label: "Trade #12: RELIANCE", date: "Oct 04" },
    { x: 90, y: 130, pnl: "+₹35,000", label: "Trade #28: Overleveraged Win", date: "Oct 08" },
    { x: 160, y: 175, pnl: "-₹18,200", label: "Trade #49: Revenge Entry", date: "Oct 11" },
    { x: 230, y: 200, pnl: "-₹42,800", label: "Trade #71: 3x Lot Size Creep", date: "Oct 14" },
    { x: 300, y: 160, pnl: "-₹8,500", label: "Trade #94: Choppy Scalps", date: "Oct 18" },
    { x: 370, y: 195, pnl: "-₹36,400", label: "Trade #118: Afternoon Tilt", date: "Oct 22" },
    { x: 440, y: 215, pnl: "-₹58,200", label: "Trade #133: Holding Losers", date: "Oct 25" },
    { x: 500, y: 190, pnl: "-₹38,500", label: "Trade #142: Final Balance", date: "Oct 28" },
  ];

  const activePoints = activeMode === "guarded" ? guardedPoints : unguidedPoints;
  const pathD = activePoints.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, "");
  const areaPath = `${pathD} L 500 230 L 20 230 Z`;

  return (
    <div className="relative w-full max-w-2xl mx-auto lg:max-w-none select-none font-sans">
      {/* Outer Glow & Terminal Shell */}
      <div className="relative rounded-[8px] bg-[#0c111c] border border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden">
        {/* Terminal Header Bar (Institutional macOS / Bloomberg style) */}
        <div className="h-10 px-4 bg-[#080d16] border-b border-slate-800/80 flex items-center justify-between text-xs">
          {/* Left: Window Controls + Breadcrumb */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#eb5757]/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#f2c94c]/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#27ae60]/80 inline-block" />
            </div>
            <span className="text-slate-600 dark:text-slate-600">|</span>
            <span className="text-xs font-medium text-slate-300 tracking-normal flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#387ed1]" />
              <span>TradeLens Terminal • Behavioral Audit</span>
            </span>
          </div>

          {/* Right: Live Telemetry */}
          <div className="flex items-center space-x-3 text-xs">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>NSE / BSE Realtime</span>
            </span>
            <span className="px-2 py-0.5 rounded-[4px] bg-slate-800/80 text-slate-300 border border-slate-700/60 tabular-nums font-medium">
              42ms
            </span>
          </div>
        </div>

        {/* Telemetry Summary Strip */}
        <div className="px-4 py-2.5 bg-[#090e18] border-b border-slate-800/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Net Realized P&L</span>
            <span className={`text-sm font-bold tabular-nums ${activeMode === "guarded" ? "text-emerald-400" : "text-rose-400"}`}>
              {activeMode === "guarded" ? "+₹1,84,250.00" : "-₹38,500.00"}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Win Rate</span>
            <span className="text-sm font-bold text-slate-200 tabular-nums">
              {activeMode === "guarded" ? "68.4% (97/142)" : "41.5% (59/142)"}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Profit Factor</span>
            <span className="text-sm font-bold text-slate-200 tabular-nums">
              {activeMode === "guarded" ? "2.41" : "0.74"}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Max Peak Drawdown</span>
            <span className={`text-sm font-bold tabular-nums ${activeMode === "guarded" ? "text-emerald-400" : "text-rose-400"}`}>
              {activeMode === "guarded" ? "-4.2% (₹18.5k)" : "-18.6% (₹42.8k)"}
            </span>
          </div>
        </div>

        {/* Main Terminal Workspace: Two-Column Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/80">
          {/* Left Column: Interactive Equity Curve Chart (7 cols) */}
          <div className="lg:col-span-7 p-4 space-y-3">
            {/* Chart Toolbar */}
            <div className="flex items-center justify-between text-xs">
              {/* Simulation Mode Toggle (Guarded vs Emotional) */}
              <div className="inline-flex p-0.5 rounded-[4px] bg-[#080d16] border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveMode("guarded")}
                  className={`px-2.5 py-1 rounded-[3px] text-[11px] font-semibold transition flex items-center space-x-1.5 ${
                    activeMode === "guarded"
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Rule Guardrails Active</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMode("unguided")}
                  className={`px-2.5 py-1 rounded-[3px] text-[11px] font-semibold transition flex items-center space-x-1.5 ${
                    activeMode === "unguided"
                      ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <ShieldAlert className="w-3 h-3 text-rose-400" />
                  <span>Unguided (Emotional)</span>
                </button>
              </div>

              {/* Timeframe Pills */}
              <div className="hidden sm:flex items-center space-x-1 text-xs text-slate-400">
                {(["1D", "1W", "1M", "ALL"] as const).map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setActiveTimeframe(tf)}
                    className={`px-2 py-0.5 rounded-[3px] transition ${
                      activeTimeframe === tf
                        ? "bg-slate-800 text-slate-100 font-semibold"
                        : "hover:text-slate-200 hover:bg-slate-800/50"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Interactive Canvas */}
            <div className="relative w-full h-[220px] bg-[#070b13] rounded-[6px] border border-slate-800/60 p-2 overflow-hidden">
              {/* Background Grid Lines */}
              <div className="absolute inset-0 grid grid-rows-4 divide-y divide-slate-800/30 pointer-events-none">
                <div />
                <div />
                <div />
                <div />
              </div>

              {/* Zero P&L Benchmark Line */}
              <div className="absolute top-[165px] left-0 right-0 border-t border-dashed border-slate-700/60 pointer-events-none" />
              <span className="absolute top-[152px] right-2 text-[10px] font-medium text-slate-500">
                ₹0 Baseline
              </span>

              {/* SVG Curve */}
              <svg viewBox="0 0 520 240" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="guardedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="unguidedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Shaded Area */}
                <path
                  d={areaPath}
                  fill={activeMode === "guarded" ? "url(#guardedGrad)" : "url(#unguidedGrad)"}
                />

                {/* Main Curve Stroke */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={activeMode === "guarded" ? "#10b981" : "#ef4444"}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                />

                {/* Interactive Points */}
                {activePoints.map((pt, idx) => (
                  <g key={idx}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredPoint === idx ? "5" : "3"}
                      className={`cursor-pointer transition-all duration-150 ${
                        activeMode === "guarded" ? "fill-emerald-400 stroke-[#0c111c]" : "fill-rose-400 stroke-[#0c111c]"
                      }`}
                      strokeWidth="2"
                      onMouseEnter={() => setHoveredPoint(idx)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  </g>
                ))}
              </svg>

              {/* Active Hover Tooltip */}
              {hoveredPoint !== null && (
                <div
                  className="absolute z-20 pointer-events-none px-2.5 py-1.5 rounded-[4px] bg-[#141b2b] border border-slate-700 text-slate-100 text-xs shadow-xl"
                  style={{
                    left: `${Math.min(380, Math.max(20, activePoints[hoveredPoint].x - 60))}px`,
                    top: `${Math.max(10, activePoints[hoveredPoint].y - 45)}px`,
                  }}
                >
                  <div className="text-[11px] text-slate-400">{activePoints[hoveredPoint].label}</div>
                  <div className="font-semibold flex items-center justify-between gap-2 mt-0.5">
                    <span>{activePoints[hoveredPoint].date}</span>
                    <span className={`tabular-nums ${activeMode === "guarded" ? "text-emerald-400" : "text-rose-400"}`}>
                      {activePoints[hoveredPoint].pnl}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Chart Legend */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-0.5">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${activeMode === "guarded" ? "bg-emerald-400" : "bg-rose-400"}`} />
                <span>{activeMode === "guarded" ? "70/30 Out-Of-Sample Equity Curve" : "Unfiltered Emotional Execution"}</span>
              </span>
              <span className="tabular-nums">142 Paired Roundtrips</span>
            </div>
          </div>

          {/* Right Column: Live Behavioral Intercept Feed (5 cols) */}
          <div className="lg:col-span-5 p-4 flex flex-col justify-between space-y-3 bg-[#0a0f19]">
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#387ed1]" />
                  <span>Guardrail Execution Stream</span>
                </span>
                <span className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-[3px] font-medium">
                  3 Active
                </span>
              </div>

              {/* Feed Item 1: Revenge Trade Blocked */}
              <div className="p-2.5 rounded-[4px] bg-[#0d1424] border border-rose-900/50 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-rose-400 font-semibold flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Revenge Entry Intercepted</span>
                  </span>
                  <span className="text-slate-500 text-[11px] tabular-nums">11:42 IST</span>
                </div>
                <p className="text-xs text-slate-300">
                  Attempted entry on <span className="text-slate-100 font-semibold">NIFTY 24800 CE</span> within 3 mins of SL hit.
                </p>
                <div className="text-xs font-medium text-emerald-400 pt-0.5 tabular-nums">
                  ✓ Protected Capital: +₹18,500
                </div>
              </div>

              {/* Feed Item 2: Max Daily Trades Cap */}
              <div className="p-2.5 rounded-[4px] bg-[#0d1424] border border-amber-900/40 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-400 font-semibold flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Overtrading Limit Reached</span>
                  </span>
                  <span className="text-slate-500 text-[11px] tabular-nums">13:15 IST</span>
                </div>
                <p className="text-xs text-slate-300">
                  Session trade count cap reached (4/4 trades). Afternoon chop trades locked out.
                </p>
                <div className="text-xs text-slate-400 pt-0.5 tabular-nums">
                  Avoidable STT & GST saved: ₹1,420
                </div>
              </div>

              {/* Feed Item 3: Clean Disciplined Win */}
              <div className="p-2.5 rounded-[4px] bg-[#0d1424] border border-emerald-900/40 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Disciplined Setup Filled</span>
                  </span>
                  <span className="text-slate-500 text-[11px] tabular-nums">09:45 IST</span>
                </div>
                <p className="text-xs text-slate-300">
                  <span className="text-slate-100 font-semibold">RELIANCE</span> • 100 Qty • Entry ₹2,940 → Exit ₹2,990
                </p>
                <div className="text-xs font-medium text-emerald-400 pt-0.5 tabular-nums">
                  Net Realized: +₹4,545.14 (Taxes deducted)
                </div>
              </div>
            </div>

            {/* Bottom Status Callout */}
            <div className="p-2 rounded-[4px] bg-[#070b13] border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#387ed1]" />
                <span>Deterministic Replay Engine</span>
              </span>
              <span className="text-slate-300 font-medium">70/30 Split</span>
            </div>
          </div>
        </div>

        {/* Bottom Institutional KPI Ribbon */}
        <div className="px-4 py-2.5 bg-[#080d16] border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/80 text-xs">
          <div className="py-1 sm:py-0 sm:px-2 first:pl-0">
            <span className="text-[11px] text-slate-500 block">Total Drawdown Cut</span>
            <span className="text-xs font-bold text-emerald-400 tabular-nums">74.2% Lower</span>
          </div>
          <div className="py-1 sm:py-0 sm:px-2">
            <span className="text-[11px] text-slate-500 block">Revenge Entries</span>
            <span className="text-xs font-bold text-slate-200 tabular-nums">100% Intercepted</span>
          </div>
          <div className="py-1 sm:py-0 sm:px-2">
            <span className="text-[11px] text-slate-500 block">Avoidable Turnover Fees</span>
            <span className="text-xs font-bold text-emerald-400 tabular-nums">+₹14,200 Saved</span>
          </div>
          <div className="py-1 sm:py-0 sm:px-2 last:pr-0">
            <span className="text-[11px] text-slate-500 block">Statutory Audit</span>
            <span className="text-xs font-bold text-sky-400">Sec 288B Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
}
