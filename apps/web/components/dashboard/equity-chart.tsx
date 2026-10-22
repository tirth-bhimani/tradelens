"use client";

import React, { useState, useRef, useId } from "react";
import {
  type ChartPoint,
  calculateYBounds,
  generateSvgPath,
  generateAreaPath,
} from "@/lib/charts/chart-options";
import {
  formatCurrencyINR,
  formatSignedCurrency,
  formatIndianDenomination,
  formatPercentage,
} from "@/lib/utils/format";

export interface EquityChartProps {
  data: ChartPoint[];
  height?: number;
  showHighWaterMark?: boolean;
  className?: string;
}

export function EquityChart({
  data,
  height = 280,
  showHighWaterMark = true,
  className = "",
}: EquityChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gradientId = useId();

  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex flex-col items-center justify-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded p-6"
      >
        <span>No trading points recorded in this timeframe</span>
      </div>
    );
  }

  // Dimensions & Padding
  const width = 1000;
  const padding = { top: 20, right: 80, bottom: 30, left: 15 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Compute Y-Axis bounds from cumulative P&L and peak P&L
  const allValues = data.flatMap((p) => [p.cumulativePnl, p.peakPnl]);
  const bounds = calculateYBounds(allValues, 0.1);

  // Coordinate mapping functions
  const getX = (index: number) =>
    padding.left + (index / (data.length - 1 || 1)) * chartWidth;

  const getY = (val: number) =>
    padding.top + (1 - (val - bounds.min) / bounds.range) * chartHeight;

  const zeroY = padding.top + bounds.zeroYRatio * chartHeight;

  // Generate line points
  const lineCoords = data.map((p, i) => ({ x: getX(i), y: getY(p.cumulativePnl) }));
  const peakCoords = data.map((p, i) => ({ x: getX(i), y: getY(p.peakPnl) }));

  // Paths
  const linePath = generateSvgPath(lineCoords, true);
  const areaPath = generateAreaPath(lineCoords, Math.min(height - padding.bottom, Math.max(padding.top, zeroY)), true);
  const peakPath = generateSvgPath(peakCoords, false); // Step-like linear for peak high water mark

  // Grid lines (4 intervals)
  const gridSteps = 4;
  const gridLines = Array.from({ length: gridSteps + 1 }, (_, i) => {
    const val = bounds.max - (i / gridSteps) * bounds.range;
    return { val, y: getY(val) };
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
  const isOverallPositive = (data[data.length - 1]?.cumulativePnl ?? 0) >= 0;

  return (
    <div
      ref={containerRef}
      className={`relative select-none ${className}`}
      data-testid="equity-chart"
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
                Trade:{" "}
                <span
                  className={
                    activePoint.netPnl >= 0
                      ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                      : "text-rose-600 dark:text-rose-400 font-semibold"
                  }
                >
                  {formatSignedCurrency(activePoint.netPnl)}
                </span>
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                Cumulative:{" "}
                <span
                  className={
                    activePoint.cumulativePnl >= 0
                      ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                      : "text-rose-600 dark:text-rose-400 font-semibold"
                  }
                >
                  {formatSignedCurrency(activePoint.cumulativePnl)}
                </span>
              </span>
              {activePoint.drawdownInr > 0 && (
                <span className="text-rose-600 dark:text-rose-400">
                  DD: -{formatCurrencyINR(activePoint.drawdownInr)} (-{formatPercentage(activePoint.drawdownPct)})
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between w-full text-slate-500 dark:text-slate-400 text-[11px]">
            <span>Hover or drag along the curve for trade-by-trade audit</span>
            <span className="text-slate-400 dark:text-slate-500">
              High-Water Mark: {formatCurrencyINR(data[data.length - 1]?.peakPnl ?? 0)}
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
            <stop
              offset="0%"
              stopColor={isOverallPositive ? "#10b981" : "#f43f5e"}
              stopOpacity="0.25"
            />
            <stop
              offset="100%"
              stopColor={isOverallPositive ? "#10b981" : "#f43f5e"}
              stopOpacity="0.0"
            />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines and right Y labels */}
        {gridLines.map(({ val, y }, idx) => (
          <g key={idx}>
            <line
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              className="stroke-slate-200/70 dark:stroke-slate-800/60"
              strokeDasharray={val === 0 ? "none" : "3 3"}
              strokeWidth={val === 0 ? 1.5 : 1}
            />
            <text
              x={width - padding.right + 8}
              y={y + 3.5}
              className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono tabular-nums select-none"
            >
              {formatIndianDenomination(val, { precision: 1 })}
            </text>
          </g>
        ))}

        {/* High water mark reference line */}
        {showHighWaterMark && (
          <path
            d={peakPath}
            fill="none"
            className="stroke-slate-400/80 dark:stroke-slate-600/80"
            strokeWidth="1.2"
            strokeDasharray="4 4"
          />
        )}

        {/* Gradient area fill */}
        <path d={areaPath} fill={`url(#${gradientId})`} />

        {/* Main curve line with glowing bloom filter */}
        <path
          d={linePath}
          fill="none"
          stroke={isOverallPositive ? "#10b981" : "#f43f5e"}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            filter: isOverallPositive
              ? "drop-shadow(0 0 5px rgba(16, 185, 129, 0.45))"
              : "drop-shadow(0 0 5px rgba(244, 63, 94, 0.45))",
          }}
        />

        {/* Interactive Crosshair & Dot indicator */}
        {activeCoord && activePoint && (
          <g>
            {/* Vertical crosshair line */}
            <line
              x1={activeCoord.x}
              y1={padding.top}
              x2={activeCoord.x}
              y2={height - padding.bottom}
              className="stroke-slate-400 dark:stroke-slate-500"
              strokeWidth="1"
              strokeDasharray="2 2"
            />

            {/* Point dot halo and center */}
            <circle
              cx={activeCoord.x}
              cy={activeCoord.y}
              r="5"
              fill={activePoint.netPnl >= 0 ? "#10b981" : "#f43f5e"}
              className="opacity-40 animate-ping"
            />
            <circle
              cx={activeCoord.x}
              cy={activeCoord.y}
              r="4"
              fill={activePoint.netPnl >= 0 ? "#10b981" : "#f43f5e"}
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          </g>
        )}
      </svg>
    </div>
  );
}
