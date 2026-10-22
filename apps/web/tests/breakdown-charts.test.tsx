import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CalendarHeatmap } from "../components/dashboard/calendar-heatmap";
import { TimeBreakdownChart } from "../components/dashboard/time-breakdown-chart";
import { TradeTable } from "../components/trades/trade-table";
import { DEFAULT_TRADE_LOG } from "../lib/trades/trade-defaults";
import { TradeTagPill } from "../components/trades/trade-tag-pill";

describe("Calendar Heatmap Component", () => {
  it("renders monthly calendar header, days of week, and legend", () => {
    const html = renderToStaticMarkup(
      <CalendarHeatmap trades={DEFAULT_TRADE_LOG} />
    );

    expect(html).toContain("data-testid=\"calendar-heatmap\"");
    expect(html).toContain("Monthly P&amp;L Heatmap");
    expect(html).toContain("Month P&amp;L:");
    expect(html).toContain("Day Win Rate:");
    expect(html).toContain("Sun");
    expect(html).toContain("Mon");
    expect(html).toContain("Max Loss");
    expect(html).toContain("Max Profit");
  });
});

describe("Time Breakdown Chart Component", () => {
  it("renders Execution Timing Diagnostics with session tabs and bars", () => {
    const html = renderToStaticMarkup(
      <TimeBreakdownChart trades={DEFAULT_TRADE_LOG} />
    );

    expect(html).toContain("data-testid=\"time-breakdown-chart\"");
    expect(html).toContain("Execution Timing Diagnostics");
    expect(html).toContain("Hour of Day (IST)");
    expect(html).toContain("Day of Week");
    expect(html).toContain("09:15 - 10:00");
    expect(html).toContain("Open Rush");
  });
});

describe("Trade Tag Pill Component", () => {
  it("renders disciplined tag with emerald styling", () => {
    const html = renderToStaticMarkup(
      <TradeTagPill tag="Rule Followed" />
    );

    expect(html).toContain("data-testid=\"trade-tag-pill\"");
    expect(html).toContain("Rule Followed");
    expect(html).toContain("text-emerald-700");
  });

  it("renders behavioral leak tag with rose styling", () => {
    const html = renderToStaticMarkup(
      <TradeTagPill tag="FOMO" />
    );

    expect(html).toContain("data-testid=\"trade-tag-pill\"");
    expect(html).toContain("FOMO");
    expect(html).toContain("text-rose-700");
  });
});

describe("Trade Table Component", () => {
  it("renders trade journal table with search bar, outcome filters and rows", () => {
    const html = renderToStaticMarkup(
      <TradeTable trades={DEFAULT_TRADE_LOG} />
    );

    expect(html).toContain("data-testid=\"trade-table-container\"");
    expect(html).toContain("Round-Trip Trade Journal");
    expect(html).toContain("Search symbol, notes...");
    expect(html).toContain("All Segments");
    expect(html).toContain("RELIANCE");
    expect(html).toContain("TCS");
    expect(html).toContain("INFY");
    expect(html).toContain("Rows per page:");
  });
});
