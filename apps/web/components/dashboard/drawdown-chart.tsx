"use client";

import React, { useState, useRef, useId } from "react";
import {
  type ChartPoint,
  generateSvgPath,
  generateAreaPath,
} from "@/lib/charts/chart-options";
import {
  formatCurrencyINR,
  formatPercentage,
} from "@/lib/utils/format";

export interface DrawdownChartProps {
  data: ChartPoint[];
  height?: number;
  className?: string;
}

export function DrawdownChart({
  data,
  height = 200,
  className = "",
}: DrawdownChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gradientId = useId();

  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex flex-col items-center justify-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded p-6"
      >
        <span>No drawdown data available for this timeframe</span>
      </div>
    );
  }

  // Dimensions & Padding
  const width = 1000;
  const padding = { top: 15, right: 80, bottom: 25, left: 15 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Maximum drawdown in current dataset (>= 0)
  const maxDDInr = Math.max(...data.map((p) => p.drawdownInr), 100);
  const maxDDPct = Math.max(...data.map((p) => p.drawdownPct), 1);

  // Coordinate mapping: 0 drawdown is at padding.top, max drawdown is at height - padding.bottom
  const getX = (index: number) =>
    padding.left + (index / (data.length - 1 || 1)) * chartWidth;

  const getY = (ddInr: number) =>
    padding.top + (ddInr / maxDDInr) * chartHeight;

  // Drawdown line coordinates
  const lineCoords = data.map((p, i) => ({
    x: getX(i),
    y: getY(p.drawdownInr),
  }));

  const linePath = generateSvgPath(lineCoords, true);
  // Area goes from the top baseline (padding.top = 0 drawdown) down to the curve
  const areaPath = generateAreaPath(lineCoords, padding.top, true);

  // Grid steps (0%, 33%, 66%, 100% of max drawdown)
  const gridSteps = 3;
  const gridLines = Array.from({ length: gridSteps + 1 }, (_, i) => {
    const ratio = i / gridSteps;
    const inrVal = ratio * maxDDInr;
    const pctVal = ratio * maxDDPct;
    const y = padding.top + ratio * chartHeight;
    return { inrVal, pctVal, y };
  });

  // Handle pointer interactions
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, (clientX - padding.left * (rect.width / width)) / (chartWidth * (rect.width / width))));
    const index = Math.round(ratio * (data.length - 1));
    setHoverIndex(Math.max(0, Math.min(data.length - 1, index)));
  };

  const handlePointerLeave = () => {
    setHoverIndex(null);
  };

  const activePoint = hoverIndex !== null ? data[hoverIndex] : null;
  const activeCoord = hoverIndex !== null ? lineCoords[hoverIndex] : null;

  return (
    <div
      ref={containerRef}
      className={`relative select-none ${className}`}
      data-testid="drawdown-chart"
    >
      {/* Top status bar tooltip display when hovering */}
      <div className="flex flex-wrap items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-slate-800/80 mb-2 min-h-[28px] tabular-nums">
        {activePoint ? (
          <>
            <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-white">
                {activePoint.date}
              </span>
              {activePoint.symbol && (
                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300">
                  {activePoint.symbol}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-slate-500 dark:text-slate-400">
                Peak Drop:{" "}
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  -{formatCurrencyINR(activePoint.drawdownInr)}
                </span>
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                Percentage:{" "}
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  -{formatPercentage(activePoint.drawdownPct)}
                </span>
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between w-full text-slate-500 dark:text-slate-400 text-[11px]">
            <span>Underwater drawdown (capital degradation from peak)</span>
            <span className="text-rose-600 dark:text-rose-400 font-medium">
              Worst Dip: -{formatCurrencyINR(maxDDInr)} (-{formatPercentage(maxDDPct)})
            </span>
          </div>
        )}
      </div>

      {/* Main Responsive SVG */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full overflow-visible touch-none cursor-crosshair"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.30" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines and right Y labels */}
        {gridLines.map(({ pctVal, y }, idx) => (
          <g key={idx}>
            <line
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              className="stroke-slate-200/70 dark:stroke-slate-800/60"
              strokeDasharray={idx === 0 ? "none" : "3 3"}
              strokeWidth={idx === 0 ? 1.5 : 1}
            />
            <text
              x={width - padding.right + 8}
              y={y + 3.5}
              className="fill-slate-400 dark:fill-slate-500 text-[10px] font-sans tabular-nums select-none"
            >
              {idx === 0 ? "0.0%" : `-${pctVal.toFixed(1)}%`}
            </text>
          </g>
        ))}

        {/* Underwater gradient area */}
        <path d={areaPath} fill={`url(#${gradientId})`} />

        {/* Drawdown curve line */}
        <path
          d={linePath}
          fill="none"
          stroke="#f43f5e"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Interactive Crosshair & Dot indicator */}
        {activeCoord && activePoint && (
          <g>
            <line
              x1={activeCoord.x}
              y1={padding.top}
              x2={activeCoord.x}
              y2={height - padding.bottom}
              className="stroke-slate-400 dark:stroke-slate-500"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <circle
              cx={activeCoord.x}
              cy={activeCoord.y}
              r="4"
              fill="#f43f5e"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          </g>
        )}
      </svg>
    </div>
  );
}
