"use client";

import React, { useState, useRef, useId } from "react";
import { DualEquityPoint } from "@/lib/rules/types";
import { formatCurrencyINR } from "@/lib/utils/format";
import { ShieldCheck, Info } from "lucide-react";

export interface DualEquityChartProps {
  points: DualEquityPoint[];
  height?: number;
  className?: string;
}

export function DualEquityChart({
  points,
  height = 300,
  className = "",
}: DualEquityChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const actualGradId = useId();
  const simGradId = useId();

  if (!points || points.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded p-6 text-xs text-slate-500"
      >
        Run a backtest simulation to generate dual equity curves
      </div>
    );
  }

  // Width & Padding
  const width = 1000;
  const padding = { top: 25, right: 80, bottom: 35, left: 20 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Extract all values for min/max
  const actualValues = points.map((p) => Number(p.actual_equity));
  const simValues = points.map((p) => Number(p.simulated_equity));
  const allValues = [...actualValues, ...simValues];

  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const paddingBuffer = (maxVal - minVal) * 0.1 || 1000;
  const yMin = minVal - paddingBuffer;
  const yMax = maxVal + paddingBuffer;
  const yRange = yMax - yMin || 1;

  // Coordinate functions
  const getX = (idx: number) =>
    padding.left + (idx / (points.length - 1 || 1)) * chartWidth;

  const getY = (val: number) =>
    padding.top + (1 - (val - yMin) / yRange) * chartHeight;

  // Build SVG Paths
  const actualPointsCoord = points.map((p, i) => `${getX(i)},${getY(Number(p.actual_equity))}`);
  const simPointsCoord = points.map((p, i) => `${getX(i)},${getY(Number(p.simulated_equity))}`);

  const actualPath = `M ${actualPointsCoord.join(" L ")}`;
  const simPath = `M ${simPointsCoord.join(" L ")}`;

  // Area under simulated curve
  const simAreaPath = `${simPath} L ${getX(points.length - 1)},${padding.top + chartHeight} L ${getX(0)},${padding.top + chartHeight} Z`;

  // Baseline initial capital
  const initialCapital = Number(points[0]?.actual_equity || 100000);
  const baselineY = getY(initialCapital);

  // Mouse move handler
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const relRatio = (clientX - (padding.left / width) * rect.width) / ((chartWidth / width) * rect.width);
    const clampedRatio = Math.max(0, Math.min(1, relRatio));
    const index = Math.round(clampedRatio * (points.length - 1));
    setHoverIndex(index);
  };

  const activePoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div
      ref={containerRef}
      data-testid="dual-equity-chart"
      className={`card-zerodha-glass p-5 sm:p-6 border border-slate-200/80 dark:border-white/[0.08] rounded-[6px] bg-white dark:bg-[#090e1a] space-y-4 shadow-sm transition-all duration-200 ${className}`}
    >
      {/* Header and Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <span>Dual Equity Curve Visualizer</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 font-semibold">
              Live Replay Overlay
            </span>
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Compare actual historical drawdown against the rule-enforced counterfactual equity path.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-4 text-xs font-mono">
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-0.5 bg-[#2b7fff] rounded-full" />
            <span className="text-slate-600 dark:text-slate-400">Actual Equity</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-1 bg-[#10b981] rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Simulated Rule</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={simGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding.top + ratio * chartHeight;
            const val = yMax - ratio * yRange;
            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + chartWidth}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-100 dark:text-slate-800/80"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left + chartWidth + 8}
                  y={y + 3}
                  className="text-[10px] font-mono fill-slate-400 dark:fill-slate-500 select-none"
                >
                  {formatCurrencyINR(val)}
                </text>
              </g>
            );
          })}

          {/* Baseline Capital Reference Line */}
          <line
            x1={padding.left}
            y1={baselineY}
            x2={padding.left + chartWidth}
            y2={baselineY}
            stroke="#94a3b8"
            strokeDasharray="4 4"
            strokeWidth="1"
            className="opacity-40"
          />

          {/* Area Fill under Simulated Curve */}
          <path d={simAreaPath} fill={`url(#${simGradId})`} />

          {/* Actual Historical Curve (Blue) */}
          <path
            d={actualPath}
            fill="none"
            stroke="#2b7fff"
            strokeWidth="1.8"
            strokeLinejoin="round"
            strokeLinecap="round"
            className="opacity-60"
          />

          {/* Simulated Rule Curve (Emerald Bold Glowing) */}
          <path
            d={simPath}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.8"
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{
              filter: "drop-shadow(0 0 6px rgba(16, 185, 129, 0.55))",
            }}
          />

          {/* Skipped Trade Points on Curve */}
          {points.map((p, i) => {
            if (!p.is_skipped) return null;
            return (
              <circle
                key={i}
                cx={getX(i)}
                cy={getY(Number(p.simulated_equity))}
                r="3.5"
                fill="#f59e0b"
                stroke="#ffffff"
                strokeWidth="1.5"
                className="opacity-90"
              />
            );
          })}

          {/* Hover Crosshair */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={padding.top}
                x2={getX(hoverIndex)}
                y2={padding.top + chartHeight}
                stroke="#64748b"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getY(Number(points[hoverIndex].actual_equity))}
                r="4"
                fill="#2b7fff"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getY(Number(points[hoverIndex].simulated_equity))}
                r="5"
                fill="#10b981"
                stroke="#ffffff"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* Hover Crosshair Tooltip */}
        {activePoint && hoverIndex !== null && (
          <div
            className="absolute top-2 left-4 pointer-events-none p-3.5 rounded-[6px] bg-white/95 dark:bg-[#070b16]/95 border border-slate-200/90 dark:border-white/[0.12] shadow-xl text-xs space-y-1.5 font-mono backdrop-blur-md z-20"
          >
            <div className="text-[11px] text-slate-400 font-sans">
              Point {hoverIndex + 1} of {points.length} • {activePoint.timestamp.slice(0, 16).replace("T", " ")}
            </div>
            <div className="flex items-center justify-between gap-6">
              <span className="text-[#2b7fff]">Actual Equity:</span>
              <strong className="text-slate-900 dark:text-white tabular-nums">
                {formatCurrencyINR(Number(activePoint.actual_equity))}
              </strong>
            </div>
            <div className="flex items-center justify-between gap-6">
              <span className="text-emerald-500 font-bold">Simulated Equity:</span>
              <strong className="text-emerald-500 tabular-nums">
                {formatCurrencyINR(Number(activePoint.simulated_equity))}
              </strong>
            </div>
            {activePoint.is_skipped && (
              <div className="pt-1 text-[11px] text-amber-500 flex items-center space-x-1 font-sans">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Trade skipped by rule (capital preserved)</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
