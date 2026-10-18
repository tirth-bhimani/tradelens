import { describe, expect, it } from "vitest";
import {
  filterDataByTimeframe,
  calculateYBounds,
  downsampleData,
  generateSvgPath,
  generateAreaPath,
  type ChartPoint,
} from "../lib/charts/chart-options";

describe("filterDataByTimeframe", () => {
  const baseTime = 1700000000000; // Reference epoch
  const dayMs = 24 * 60 * 60 * 1000;

  const mockData: ChartPoint[] = [
    {
      date: "2023-11-01",
      timestamp: baseTime - 40 * dayMs,
      label: "Trade 1",
      netPnl: 1000,
      cumulativePnl: 1000,
      peakPnl: 1000,
      drawdownInr: 0,
      drawdownPct: 0,
    },
    {
      date: "2023-11-20",
      timestamp: baseTime - 20 * dayMs,
      label: "Trade 2",
      netPnl: -500,
      cumulativePnl: 500,
      peakPnl: 1000,
      drawdownInr: 500,
      drawdownPct: 50,
    },
    {
      date: "2023-12-05",
      timestamp: baseTime - 5 * dayMs,
      label: "Trade 3",
      netPnl: 2000,
      cumulativePnl: 2500,
      peakPnl: 2500,
      drawdownInr: 0,
      drawdownPct: 0,
    },
    {
      date: "2023-12-10",
      timestamp: baseTime,
      label: "Trade 4",
      netPnl: 1500,
      cumulativePnl: 4000,
      peakPnl: 4000,
      drawdownInr: 0,
      drawdownPct: 0,
    },
  ];

  it("returns all points when timeframe is 'ALL'", () => {
    const result = filterDataByTimeframe(mockData, "ALL", baseTime);
    expect(result.length).toBe(4);
  });

  it("filters points within the last 7 days for '1W'", () => {
    const result = filterDataByTimeframe(mockData, "1W", baseTime);
    // Should include Trade 3 (-5 days) and Trade 4 (0 days)
    expect(result.length).toBe(2);
    expect(result[0].label).toBe("Trade 3");
    expect(result[1].label).toBe("Trade 4");
  });

  it("filters points within the last 30 days for '1M'", () => {
    const result = filterDataByTimeframe(mockData, "1M", baseTime);
    // Should include Trade 2 (-20 days), Trade 3 (-5 days), and Trade 4
    expect(result.length).toBe(3);
  });

  it("handles empty dataset without errors", () => {
    expect(filterDataByTimeframe([], "1W")).toEqual([]);
  });
});

describe("calculateYBounds", () => {
  it("computes accurate min, max, range and zero ratio for mixed positive/negative values", () => {
    const values = [-1000, 3000];
    const bounds = calculateYBounds(values, 0); // 0 padding for exact test

    expect(bounds.min).toBe(-1000);
    expect(bounds.max).toBe(3000);
    expect(bounds.range).toBe(4000);
    // 0 is at (3000 - 0) / 4000 = 0.75 from top
    expect(bounds.zeroYRatio).toBe(0.75);
  });

  it("handles flat values without dividing by zero", () => {
    const flat = [0, 0, 0];
    const bounds = calculateYBounds(flat);
    expect(bounds.range).toBeGreaterThan(0);
    expect(isNaN(bounds.zeroYRatio)).toBe(false);
  });

  it("handles all-positive values gracefully", () => {
    const positive = [1000, 2500, 5000];
    const bounds = calculateYBounds(positive, 0.1);
    expect(bounds.max).toBeGreaterThan(5000);
    expect(bounds.min).toBeLessThan(1000);
  });

  it("handles empty array gracefully", () => {
    const bounds = calculateYBounds([]);
    expect(bounds.range).toBeGreaterThan(0);
  });
});

describe("downsampleData", () => {
  it("preserves points if count is <= maxPoints", () => {
    const data: ChartPoint[] = Array.from({ length: 50 }, (_, i) => ({
      date: `2023-01-${i + 1}`,
      timestamp: i * 1000,
      label: `T${i}`,
      netPnl: i * 10,
      cumulativePnl: i * 100,
      peakPnl: i * 100,
      drawdownInr: 0,
      drawdownPct: 0,
    }));

    const result = downsampleData(data, 100);
    expect(result.length).toBe(50);
  });

  it("downsamples and retains first and last points if count > maxPoints", () => {
    const data: ChartPoint[] = Array.from({ length: 1000 }, (_, i) => ({
      date: `2023-01-${i + 1}`,
      timestamp: i * 1000,
      label: `T${i}`,
      netPnl: i * 10,
      cumulativePnl: i * 100,
      peakPnl: i * 100,
      drawdownInr: 0,
      drawdownPct: 0,
    }));

    const result = downsampleData(data, 100);
    expect(result.length).toBeLessThanOrEqual(105);
    expect(result[0].timestamp).toBe(data[0].timestamp);
    expect(result[result.length - 1].timestamp).toBe(data[data.length - 1].timestamp);
  });
});

describe("generateSvgPath & generateAreaPath", () => {
  const coords = [
    { x: 0, y: 100 },
    { x: 50, y: 60 },
    { x: 100, y: 20 },
  ];

  it("generates valid SVG line path string", () => {
    const linearPath = generateSvgPath(coords, false);
    expect(linearPath).toBe("M 0 100 L 50 60 L 100 20");

    const smoothPath = generateSvgPath(coords, true);
    expect(smoothPath).toContain("M 0 100 C");
  });

  it("generates valid SVG closed area polygon string with baseline", () => {
    const area = generateAreaPath(coords, 150, false);
    expect(area).toContain("M 0 100");
    expect(area).toContain("L 100.0 150.0 L 0.0 150.0 Z");
  });

  it("handles empty coordinates safely", () => {
    expect(generateSvgPath([])).toBe("");
    expect(generateAreaPath([], 0)).toBe("");
  });
});
