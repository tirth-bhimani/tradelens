import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MetricCard } from "../components/dashboard/metric-card";
import {
  SummaryMetricsGrid,
  type SummaryMetricsData,
} from "../components/dashboard/summary-metrics-grid";
import { MetricCardSkeleton } from "../components/dashboard/metrics-skeleton";

describe("MetricCard Component", () => {
  it("renders label, value, and subValue accurately", () => {
    const html = renderToStaticMarkup(
      <MetricCard
        label="Realized Net P&L"
        value="+₹48,520.50"
        subValue="Fees: ₹1,479.50 debited"
        tooltip="Net: +₹48,520.50"
      />
    );

    expect(html).toContain("Realized Net P&amp;L");
    expect(html).toContain("+₹48,520.50");
    expect(html).toContain("Fees: ₹1,479.50 debited");
    expect(html).toContain('title="Net: +₹48,520.50"');
  });

  it("applies positive trend color styling when trend is positive", () => {
    const html = renderToStaticMarkup(
      <MetricCard
        label="Net P&L"
        value="+₹15,000.00"
        trend="positive"
      />
    );

    expect(html).toContain("text-emerald-600");
  });

  it("applies negative trend color styling when trend is negative", () => {
    const html = renderToStaticMarkup(
      <MetricCard
        label="Net P&L"
        value="-₹5,000.00"
        trend="negative"
      />
    );

    expect(html).toContain("text-rose-600");
  });

  it("renders MetricCardSkeleton with animate-pulse when isLoading is true", () => {
    const html = renderToStaticMarkup(
      <MetricCard
        label="Net P&L"
        value="+₹15,000.00"
        isLoading={true}
      />
    );

    expect(html).toContain("data-testid=\"metric-card-skeleton\"");
    expect(html).toContain("animate-pulse");
    expect(html).not.toContain("+₹15,000.00");
  });
});

describe("SummaryMetricsGrid Component", () => {
  const mockMetrics: SummaryMetricsData = {
    totalTrades: 30,
    winningTrades: 20,
    losingTrades: 10,
    winRate: 66.67,
    totalNetPnl: 150000,
    totalCharges: 2500,
    profitFactor: 3.2,
    isInfiniteProfitFactor: false,
    expectancyInr: 5000,
    maxDrawdownInr: 15000,
    maxDrawdownPct: 5.5,
    maxConsecutiveWins: 7,
    maxConsecutiveLosses: 3,
  };

  it("renders all 6 core trading KPI cards", () => {
    const html = renderToStaticMarkup(
      <SummaryMetricsGrid metrics={mockMetrics} />
    );

    expect(html).toContain("Realized Net P&amp;L");
    expect(html).toContain("Win Rate");
    expect(html).toContain("Profit Factor");
    expect(html).toContain("Trade Expectancy");
    expect(html).toContain("Max Drawdown");
    expect(html).toContain("Max Streaks");

    // Values formatted
    expect(html).toContain("+₹1,50,000.00");
    expect(html).toContain("66.7%");
    expect(html).toContain("3.20");
    expect(html).toContain("+₹5,000.00");
    expect(html).toContain("-₹15,000.00");
    expect(html).toContain("7W / 3L");
  });

  it("calculates and displays Return on Capital (RoC) when startingCapital > 0", () => {
    const html = renderToStaticMarkup(
      <SummaryMetricsGrid metrics={mockMetrics} startingCapital={1000000} />
    );

    // 150,000 / 1,000,000 = 15.00% RoC
    expect(html).toContain("+15.00% RoC");
  });

  it("displays '∞ (Clean)' when isInfiniteProfitFactor is true", () => {
    const zeroLossMetrics: SummaryMetricsData = {
      ...mockMetrics,
      losingTrades: 0,
      profitFactor: null,
      isInfiniteProfitFactor: true,
    };

    const html = renderToStaticMarkup(
      <SummaryMetricsGrid metrics={zeroLossMetrics} />
    );

    expect(html).toContain("∞ (Clean)");
    expect(html).toContain("Zero losses recorded");
  });

  it("renders grid skeleton when isLoading is true", () => {
    const html = renderToStaticMarkup(
      <SummaryMetricsGrid isLoading={true} />
    );

    expect(html).toContain("data-testid=\"metric-card-skeleton\"");
  });
});
