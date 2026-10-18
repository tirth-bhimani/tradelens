import { describe, expect, it } from "vitest";
import {
  filterTrades,
  sortTrades,
  type RoundTripTradeView,
  type PsychologicalTag,
} from "../lib/trades/trade-filters";
import {
  computeHourlyBreakdown,
  computeWeekdayBreakdown,
  computeCalendarMonth,
} from "../lib/trades/breakdown-math";

describe("Trade Filtering & Sorting Engine", () => {
  const sampleTrades: RoundTripTradeView[] = [
    {
      id: "T1",
      symbol: "RELIANCE",
      segment: "EQUITY",
      entryTime: "2024-03-01T09:30:00Z",
      exitTime: "2024-03-01T10:15:00Z",
      quantity: 50,
      entryPrice: 2900,
      exitPrice: 2950,
      grossPnl: 2500,
      charges: 120,
      netPnl: 2380,
      returnPct: 1.72,
      tags: ["Planned Setup", "Rule Followed"],
      notes: "Followed 15-min opening range breakout",
    },
    {
      id: "T2",
      symbol: "TCS",
      segment: "EQUITY",
      entryTime: "2024-03-01T13:45:00Z",
      exitTime: "2024-03-01T14:30:00Z",
      quantity: 20,
      entryPrice: 3800,
      exitPrice: 3750,
      grossPnl: -1000,
      charges: 95,
      netPnl: -1095,
      returnPct: -1.32,
      tags: ["FOMO", "Revenge Trade"],
      notes: "Chased late afternoon move",
    },
    {
      id: "T3",
      symbol: "NIFTY24MAR22000CE",
      segment: "FNO",
      entryTime: "2024-03-04T10:30:00Z",
      exitTime: "2024-03-04T11:15:00Z",
      quantity: 150,
      entryPrice: 120,
      exitPrice: 165,
      grossPnl: 6750,
      charges: 240,
      netPnl: 6510,
      returnPct: 37.5,
      tags: ["Good Risk/Reward"],
    },
  ];

  it("filters trades by case-insensitive symbol keyword search", () => {
    const results = filterTrades(sampleTrades, { searchQuery: "rel" });
    expect(results.length).toBe(1);
    expect(results[0].symbol).toBe("RELIANCE");
  });

  it("filters trades by outcome (WINNERS vs LOSERS)", () => {
    const winners = filterTrades(sampleTrades, { outcome: "WINNERS" });
    expect(winners.length).toBe(2);
    expect(winners.every((w) => w.netPnl > 0)).toBe(true);

    const losers = filterTrades(sampleTrades, { outcome: "LOSERS" });
    expect(losers.length).toBe(1);
    expect(losers[0].symbol).toBe("TCS");
  });

  it("filters trades by psychological tag", () => {
    const fomoTrades = filterTrades(sampleTrades, { selectedTag: "FOMO" });
    expect(fomoTrades.length).toBe(1);
    expect(fomoTrades[0].symbol).toBe("TCS");

    const plannedTrades = filterTrades(sampleTrades, { selectedTag: "Planned Setup" });
    expect(plannedTrades.length).toBe(1);
    expect(plannedTrades[0].symbol).toBe("RELIANCE");
  });

  it("filters trades by date", () => {
    const marchFirst = filterTrades(sampleTrades, { date: "2024-03-01" });
    expect(marchFirst.length).toBe(2);

    const marchFourth = filterTrades(sampleTrades, { date: "2024-03-04" });
    expect(marchFourth.length).toBe(1);
  });

  it("sorts trades accurately by net P&L descending and ascending", () => {
    const desc = sortTrades(sampleTrades, "netPnl", "desc");
    expect(desc[0].netPnl).toBe(6510);
    expect(desc[desc.length - 1].netPnl).toBe(-1095);

    const asc = sortTrades(sampleTrades, "netPnl", "asc");
    expect(asc[0].netPnl).toBe(-1095);
    expect(asc[asc.length - 1].netPnl).toBe(6510);
  });
});

describe("Hourly & Weekday Breakdown Math", () => {
  const sampleTrades: RoundTripTradeView[] = [
    {
      id: "T1",
      symbol: "RELIANCE",
      segment: "EQUITY",
      entryTime: "2024-03-01T09:30:00",
      exitTime: "2024-03-01T10:00:00",
      quantity: 10,
      entryPrice: 100,
      exitPrice: 110,
      grossPnl: 100,
      charges: 10,
      netPnl: 90,
      returnPct: 10,
      tags: [],
    },
    {
      id: "T2",
      symbol: "TCS",
      segment: "EQUITY",
      entryTime: "2024-03-01T14:00:00",
      exitTime: "2024-03-01T14:30:00",
      quantity: 10,
      entryPrice: 100,
      exitPrice: 90,
      grossPnl: -100,
      charges: 10,
      netPnl: -110,
      returnPct: -10,
      tags: [],
    },
  ];

  it("bins trades into correct NSE/BSE market session hourly buckets", () => {
    const buckets = computeHourlyBreakdown(sampleTrades);
    expect(buckets.length).toBe(5);

    // Open Rush (09:15 - 10:00) should contain T1
    expect(buckets[0].tradesCount).toBe(1);
    expect(buckets[0].netPnl).toBe(90);

    // Afternoon Momentum (13:30 - 14:45) should contain T2
    expect(buckets[3].tradesCount).toBe(1);
    expect(buckets[3].netPnl).toBe(-110);
  });

  it("computes weekday distribution correctly", () => {
    // 2024-03-01 is a Friday
    const weekdays = computeWeekdayBreakdown(sampleTrades);
    const friday = weekdays.find((w) => w.dayName === "Friday");
    expect(friday).toBeDefined();
    expect(friday?.tradesCount).toBe(2);
    expect(friday?.netPnl).toBe(-20); // 90 - 110
  });
});

describe("Calendar Heatmap Math", () => {
  const sampleTrades: RoundTripTradeView[] = [
    {
      id: "T1",
      symbol: "RELIANCE",
      segment: "EQUITY",
      entryTime: "2024-03-15T09:30:00",
      exitTime: "2024-03-15T15:00:00",
      quantity: 50,
      entryPrice: 100,
      exitPrice: 150,
      grossPnl: 2500,
      charges: 100,
      netPnl: 2400,
      returnPct: 50,
      tags: [],
    },
  ];

  it("generates full grid of days with padding for March 2024", () => {
    const days = computeCalendarMonth(sampleTrades, 2024, 3);
    // Grid must be multiple of 7
    expect(days.length % 7).toBe(0);

    // March 15 should have trading day = true, positive intensity tier
    const march15 = days.find((d) => d.date === "2024-03-15");
    expect(march15).toBeDefined();
    expect(march15?.isTradingDay).toBe(true);
    expect(march15?.netPnl).toBe(2400);
    expect(march15?.intensityTier).toBeGreaterThan(0);

    // Non-trading day in March (e.g. March 10)
    const march10 = days.find((d) => d.date === "2024-03-10");
    expect(march10).toBeDefined();
    expect(march10?.isTradingDay).toBe(false);
    expect(march10?.intensityTier).toBe(0);
  });
});
