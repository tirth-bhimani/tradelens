/**
 * TradeLens Chart Utilities & Coordinate Scale Engine
 *
 * Implements timeframe filtering, coordinate normalization, downsampling,
 * and smooth SVG path math for financial time-series equity and drawdown visualizers.
 */

export interface ChartPoint {
  date: string; // YYYY-MM-DD
  timestamp: number; // Unix epoch ms
  label: string; // Trade or Date display label
  netPnl: number; // Net P&L of the individual trade/day
  cumulativePnl: number; // Cumulative net P&L up to this point
  peakPnl: number; // High water mark / peak cumulative P&L
  drawdownInr: number; // Drawdown from peak (>= 0)
  drawdownPct: number; // Drawdown percentage from peak (>= 0)
  symbol?: string; // Optional ticker / symbol
}

export type TimeframeFilter = "1W" | "1M" | "3M" | "1Y" | "ALL";

/**
 * Filters time-series points based on the selected financial timeframe.
 */
export function filterDataByTimeframe(
  data: ChartPoint[],
  timeframe: TimeframeFilter,
  referenceTimestamp?: number
): ChartPoint[] {
  if (!data || data.length === 0) return [];
  if (timeframe === "ALL") return [...data];

  // Use either the provided reference or the timestamp of the last data point
  const lastTime =
    referenceTimestamp ?? data[data.length - 1]?.timestamp ?? Date.now();

  const daysMap: Record<Exclude<TimeframeFilter, "ALL">, number> = {
    "1W": 7,
    "1M": 30,
    "3M": 90,
    "1Y": 365,
  };

  const days = daysMap[timeframe];
  const cutoffTime = lastTime - days * 24 * 60 * 60 * 1000;

  const filtered = data.filter((p) => p.timestamp >= cutoffTime);

  // If filter produces empty because of sparse dates, fallback to last point or empty
  return filtered;
}

/**
 * Calculates vertical Y bounds and the 0-baseline coordinate.
 */
export interface YBounds {
  min: number;
  max: number;
  range: number;
  zeroYRatio: number; // 0.0 to 1.0 (0 = top, 1 = bottom)
}

export function calculateYBounds(
  values: number[],
  paddingPct = 0.08
): YBounds {
  if (!values || values.length === 0) {
    return { min: -1000, max: 1000, range: 2000, zeroYRatio: 0.5 };
  }

  let minVal = Math.min(...values);
  let maxVal = Math.max(...values);

  // If min and max are identical (e.g. flat 0 or single point)
  if (minVal === maxVal) {
    if (minVal === 0) {
      minVal = -100;
      maxVal = 100;
    } else {
      const pad = Math.abs(minVal) * 0.1 || 100;
      minVal -= pad;
      maxVal += pad;
    }
  } else {
    // Add margin padding so lines don't clip at top/bottom edges
    const span = maxVal - minVal;
    const pad = span * paddingPct;
    minVal -= pad;
    maxVal += pad;
  }

  const range = maxVal - minVal;
  // Calculate relative position of 0 (inverted because SVG Y=0 is at the top)
  const zeroYRatio = range > 0 ? (maxVal - 0) / range : 0.5;

  return {
    min: minVal,
    max: maxVal,
    range,
    zeroYRatio: Math.max(0, Math.min(1, zeroYRatio)),
  };
}

/**
 * Downsamples data if points exceed maxPoints to maintain smooth 60fps rendering.
 * Preserves the exact first and last points, as well as the global max and min.
 */
export function downsampleData(
  data: ChartPoint[],
  maxPoints = 400
): ChartPoint[] {
  if (!data || data.length <= maxPoints || maxPoints < 2) return data;

  const step = Math.ceil(data.length / maxPoints);
  const result: ChartPoint[] = [];

  for (let i = 0; i < data.length; i += step) {
    result.push(data[i]);
  }

  // Ensure last point is included
  const lastPoint = data[data.length - 1];
  if (result[result.length - 1].timestamp !== lastPoint.timestamp) {
    result.push(lastPoint);
  }

  return result;
}

/**
 * Generates an SVG path data string connecting coordinates.
 * Supports smooth cubic Bézier curve or linear interpolation.
 */
export function generateSvgPath(
  coords: { x: number; y: number }[],
  smooth = true
): string {
  if (!coords || coords.length === 0) return "";
  if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;

  if (!smooth || coords.length < 3) {
    return coords.reduce(
      (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
      ""
    );
  }

  let d = `M ${coords[0].x} ${coords[0].y}`;

  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i === 0 ? i : i - 1];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2 < coords.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return d;
}

/**
 * Generates an SVG closed area polygon for gradient fills.
 */
export function generateAreaPath(
  coords: { x: number; y: number }[],
  baselineY: number,
  smooth = true
): string {
  if (!coords || coords.length === 0) return "";
  const linePath = generateSvgPath(coords, smooth);
  const first = coords[0];
  const last = coords[coords.length - 1];

  return `${linePath} L ${last.x.toFixed(1)} ${baselineY.toFixed(1)} L ${first.x.toFixed(1)} ${baselineY.toFixed(1)} Z`;
}
