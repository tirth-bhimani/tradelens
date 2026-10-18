import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ChartContainer,
  DEFAULT_CHART_DATA,
} from "../components/dashboard/chart-container";
import { EquityChart } from "../components/dashboard/equity-chart";
import { DrawdownChart } from "../components/dashboard/drawdown-chart";
import { ChartSkeleton } from "../components/dashboard/chart-skeleton";

describe("Chart Components", () => {
  it("renders EquityChart with SVG line and area paths", () => {
    const html = renderToStaticMarkup(
      <EquityChart data={DEFAULT_CHART_DATA} height={280} />
    );

    expect(html).toContain("data-testid=\"equity-chart\"");
    expect(html).toContain("<svg");
    expect(html).toContain("<path");
    // Should contain high water mark reference
    expect(html).toContain("High-Water Mark:");
  });

  it("renders DrawdownChart with underwater drop curve", () => {
    const html = renderToStaticMarkup(
      <DrawdownChart data={DEFAULT_CHART_DATA} height={200} />
    );

    expect(html).toContain("data-testid=\"drawdown-chart\"");
    expect(html).toContain("<svg");
    expect(html).toContain("Underwater drawdown");
  });

  it("renders ChartContainer with controls, summary figures and tabs", () => {
    const html = renderToStaticMarkup(
      <ChartContainer data={DEFAULT_CHART_DATA} />
    );

    expect(html).toContain("Performance Trajectory");
    expect(html).toContain("Equity Curve");
    expect(html).toContain("Drawdown");
    expect(html).toContain("Net Period P&amp;L:");
    expect(html).toContain("All-Time Peak:");
    expect(html).toContain("Period Max DD:");
  });

  it("renders ChartSkeleton when isLoading is true", () => {
    const html = renderToStaticMarkup(
      <ChartContainer isLoading={true} />
    );

    expect(html).toContain("data-testid=\"chart-skeleton\"");
    expect(html).toContain("animate-pulse");
  });

  it("renders empty state callout when data is empty", () => {
    const html = renderToStaticMarkup(
      <ChartContainer data={[]} />
    );

    expect(html).toContain("No Equity Data Yet");
    expect(html).toContain("Upload your broker tradebook to plot cumulative Net P&amp;L curves");
    expect(html).toContain("Import Trades");
  });
});
