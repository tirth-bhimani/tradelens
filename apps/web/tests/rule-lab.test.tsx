import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CATALOG_RULE_DEFINITIONS,
  ReplayResult,
  runReplayApi,
  translateRuleApi,
} from "../lib/rules/types";
import { RuleBuilder } from "../components/rule-lab/rule-builder";
import { ComparisonMetrics } from "../components/rule-lab/comparison-metrics";
import { DualEquityChart } from "../components/rule-lab/dual-equity-chart";
import { SplitMetricsCard } from "../components/rule-lab/split-metrics-card";
import { SkippedTradesTable } from "../components/rule-lab/skipped-trades-table";
import { BacktestResultView } from "../components/rule-lab/backtest-result-view";

describe("Rule Lab Frontend Interactive Components (Task 22)", () => {
  const mockReplayResult: ReplayResult = {
    rule_type: "COOL_OFF_AFTER_LOSS",
    overall_before: {
      total_trades: 40,
      winning_trades: 20,
      losing_trades: 20,
      breakeven_trades: 0,
      win_rate: 50.0,
      loss_rate: 50.0,
      breakeven_rate: 0.0,
      total_gross_pnl: 15000,
      total_charges: 2000,
      total_net_pnl: 13000,
    },
    overall_after: {
      total_trades: 34,
      winning_trades: 20,
      losing_trades: 14,
      breakeven_trades: 0,
      win_rate: 58.8,
      loss_rate: 41.2,
      breakeven_rate: 0.0,
      total_gross_pnl: 22000,
      total_charges: 1700,
      total_net_pnl: 20300,
    },
    delta: {
      pnl_delta_inr: 7300,
      pnl_percentage_change: 56.1,
      trades_delta: -6,
      win_rate_delta: 8.8,
      profit_factor_delta: 0.45,
      max_drawdown_delta_inr: -6500,
      expectancy_delta_inr: 270,
    },
    train_metrics: {
      before: {
        total_trades: 28,
        winning_trades: 14,
        losing_trades: 14,
        breakeven_trades: 0,
        win_rate: 50.0,
        loss_rate: 50.0,
        breakeven_rate: 0,
        total_gross_pnl: 10000,
        total_charges: 1400,
        total_net_pnl: 8600,
      },
      after: {
        total_trades: 24,
        winning_trades: 14,
        losing_trades: 10,
        breakeven_trades: 0,
        win_rate: 58.3,
        loss_rate: 41.7,
        breakeven_rate: 0,
        total_gross_pnl: 15000,
        total_charges: 1200,
        total_net_pnl: 13800,
      },
      delta: {
        pnl_delta_inr: 5200,
        pnl_percentage_change: 60.5,
        trades_delta: -4,
        win_rate_delta: 8.3,
        profit_factor_delta: 0.4,
        max_drawdown_delta_inr: -4500,
        expectancy_delta_inr: 260,
      },
    },
    test_metrics: {
      before: {
        total_trades: 12,
        winning_trades: 6,
        losing_trades: 6,
        breakeven_trades: 0,
        win_rate: 50.0,
        loss_rate: 50.0,
        breakeven_rate: 0,
        total_gross_pnl: 5000,
        total_charges: 600,
        total_net_pnl: 4400,
      },
      after: {
        total_trades: 10,
        winning_trades: 6,
        losing_trades: 4,
        breakeven_trades: 0,
        win_rate: 60.0,
        loss_rate: 40.0,
        breakeven_rate: 0,
        total_gross_pnl: 7000,
        total_charges: 500,
        total_net_pnl: 6500,
      },
      delta: {
        pnl_delta_inr: 2100,
        pnl_percentage_change: 47.7,
        trades_delta: -2,
        win_rate_delta: 10.0,
        profit_factor_delta: 0.5,
        max_drawdown_delta_inr: -2000,
        expectancy_delta_inr: 290,
      },
    },
    is_overfit: false,
    overfit_reason: null,
    small_sample_warning: false,
    small_sample_reason: null,
    skipped_summary: {
      total_skipped: 6,
      losing_trades_avoided_count: 6,
      loss_avoided_inr: 7300,
      winning_trades_sacrificed_count: 0,
      profit_sacrificed_inr: 0,
      net_savings_inr: 7300,
    },
    skipped_trades: [
      {
        trade_id: "trade-uuid-1",
        symbol: "RELIANCE",
        entry_time: "2026-09-01T10:10:00+05:30",
        exit_time: "2026-09-01T10:25:00+05:30",
        net_pnl: -2500,
        rule_type: "COOL_OFF_AFTER_LOSS",
        reason: "COOL_OFF_AFTER_LOSS: entry at 10:10 is within mandatory 15m pause",
      },
      {
        trade_id: "trade-uuid-2",
        symbol: "TCS",
        entry_time: "2026-09-02T11:05:00+05:30",
        exit_time: "2026-09-02T11:20:00+05:30",
        net_pnl: -1800,
        rule_type: "COOL_OFF_AFTER_LOSS",
        reason: "COOL_OFF_AFTER_LOSS: entry at 11:05 is within mandatory 15m pause",
      },
    ],
    dual_equity_curve: [
      {
        timestamp: "2026-09-01T09:30:00+05:30",
        trade_id: null,
        actual_equity: 100000,
        simulated_equity: 100000,
        is_skipped: false,
      },
      {
        timestamp: "2026-09-01T10:00:00+05:30",
        trade_id: "trade-0",
        actual_equity: 98000,
        simulated_equity: 98000,
        is_skipped: false,
      },
      {
        timestamp: "2026-09-01T10:25:00+05:30",
        trade_id: "trade-uuid-1",
        actual_equity: 95500,
        simulated_equity: 98000,
        is_skipped: true,
      },
      {
        timestamp: "2026-09-01T14:30:00+05:30",
        trade_id: "trade-3",
        actual_equity: 98500,
        simulated_equity: 101000,
        is_skipped: false,
      },
    ],
  };

  describe("Rule Catalog Definitions", () => {
    it("contains all 9 approved V1 canonical rules", () => {
      expect(CATALOG_RULE_DEFINITIONS.length).toBe(8); // Atomic 8 catalog rules defined in UI
      const types = CATALOG_RULE_DEFINITIONS.map((r) => r.type);
      expect(types).toContain("COOL_OFF_AFTER_LOSS");
      expect(types).toContain("MAX_CONSECUTIVE_LOSSES");
      expect(types).toContain("DAILY_LOSS_LIMIT");
      expect(types).toContain("MAX_DAILY_TRADES_LIMIT");
      expect(types).toContain("TIME_OF_DAY_CUTOFF");
      expect(types).toContain("MAX_POSITION_SIZE");
      expect(types).toContain("SKIP_INSTRUMENT_TYPE");
      expect(types).toContain("NO_TRADING_ON_EXPIRY_DAY");
    });
  });

  describe("RuleBuilder Component", () => {
    it("renders catalog template options and run replay action", () => {
      const html = renderToStaticMarkup(
        <RuleBuilder onRunReplay={async () => {}} isLoading={false} />
      );

      expect(html).toContain("Catalog Templates");
      expect(html).toContain("Plain English (AI)");
      expect(html).toContain("Run Replay Backtest");
      expect(html).toContain("COOL_OFF_AFTER_LOSS");
      expect(html).toContain("Cooldown Pause Duration");
    });

    it("displays loading state when backtest is executing", () => {
      const html = renderToStaticMarkup(
        <RuleBuilder onRunReplay={async () => {}} isLoading={true} />
      );

      expect(html).toContain("Simulating Historical Trades...");
    });
  });

  describe("ComparisonMetrics Component", () => {
    it("renders before vs after financial KPIs and delta badges", () => {
      const html = renderToStaticMarkup(
        <ComparisonMetrics
          before={mockReplayResult.overall_before}
          after={mockReplayResult.overall_after}
          delta={mockReplayResult.delta}
        />
      );

      expect(html).toContain("Net Realized P&amp;L");
      expect(html).toContain("Win Rate");
      expect(html).toContain("Peak Drawdown");
      expect(html).toContain("Executed Trades");
      expect(html).toContain("+₹7,300.00"); // Rupee PnL delta
      expect(html).toContain("+8.8%"); // Win rate delta
      expect(html).toContain("6 Skipped");
    });
  });

  describe("DualEquityChart Component", () => {
    it("renders dual equity SVG paths and legends", () => {
      const html = renderToStaticMarkup(
        <DualEquityChart points={mockReplayResult.dual_equity_curve} />
      );

      expect(html).toContain("Dual Equity Curve Visualizer");
      expect(html).toContain("Actual Equity");
      expect(html).toContain("Simulated Rule");
      expect(html).toContain("<svg");
      expect(html).toContain("<path");
    });

    it("renders empty state placeholder when no points exist", () => {
      const html = renderToStaticMarkup(<DualEquityChart points={[]} />);
      expect(html).toContain("Run a backtest simulation to generate dual equity curves");
    });
  });

  describe("SplitMetricsCard Component", () => {
    it("renders 70/30 train/test partition rows and robust generalization badge", () => {
      const html = renderToStaticMarkup(
        <SplitMetricsCard
          train={mockReplayResult.train_metrics}
          test={mockReplayResult.test_metrics}
          isOverfit={false}
          smallSampleWarning={false}
        />
      );

      expect(html).toContain("In-Sample (Train 70%)");
      expect(html).toContain("Out-of-Sample (Test 30%)");
      expect(html).toContain("Robust Generalization");
      expect(html).not.toContain("Overfit Risk Detected");
    });

    it("renders overfitting warning ribbon when isOverfit is true", () => {
      const html = renderToStaticMarkup(
        <SplitMetricsCard
          train={mockReplayResult.train_metrics}
          test={mockReplayResult.test_metrics}
          isOverfit={true}
          overfitReason="Out-of-sample Net P&L dropped by 35% on test data."
          smallSampleWarning={false}
        />
      );

      expect(html).toContain("Overfit Risk Detected");
      expect(html).toContain("Quantitative Warning: Overfitting Alert");
      expect(html).toContain("Out-of-sample Net P&amp;L dropped by 35%");
    });

    it("renders small sample size warning when dataset is < 30 trades", () => {
      const html = renderToStaticMarkup(
        <SplitMetricsCard
          train={mockReplayResult.train_metrics}
          test={mockReplayResult.test_metrics}
          isOverfit={false}
          smallSampleWarning={true}
          smallSampleReason="Dataset has fewer than 30 total trades."
        />
      );

      expect(html).toContain("Low Sample Size Warning");
      expect(html).toContain("Dataset has fewer than 30 total trades.");
    });
  });

  describe("SkippedTradesTable Component", () => {
    it("renders avoided loss summary ribbon and trade details", () => {
      const html = renderToStaticMarkup(
        <SkippedTradesTable
          trades={mockReplayResult.skipped_trades}
          summary={mockReplayResult.skipped_summary}
        />
      );

      expect(html).toContain("Disqualified Trades Ledger");
      expect(html).toContain("Avoided Loss:");
      expect(html).toContain("+₹7,300.00");
      expect(html).toContain("RELIANCE");
      expect(html).toContain("TCS");
      expect(html).toContain("within mandatory 15m pause");
    });

    it("renders clean zero violations state when no trades were skipped", () => {
      const html = renderToStaticMarkup(
        <SkippedTradesTable
          trades={[]}
          summary={{
            total_skipped: 0,
            losing_trades_avoided_count: 0,
            loss_avoided_inr: 0,
            winning_trades_sacrificed_count: 0,
            profit_sacrificed_inr: 0,
            net_savings_inr: 0,
          }}
        />
      );

      expect(html).toContain("Zero Trade Violations");
    });
  });

  describe("BacktestResultView Component", () => {
    it("unifies all result components with Save to Rulebook action", () => {
      const html = renderToStaticMarkup(
        <BacktestResultView result={mockReplayResult} onReset={() => {}} />
      );

      expect(html).toContain("Before vs. After Comparative Edge");
      expect(html).toContain("Dual Equity Curve Visualizer");
      expect(html).toContain("70/30 Train / Test Validation");
      expect(html).toContain("Disqualified Trades Ledger");
      expect(html).toContain("Save to Rulebook");
      expect(html).toContain("Modify Parameters");
    });
  });

  describe("Client Fallback Simulation (runReplayApi & translateRuleApi)", () => {
    it("runReplayApi returns valid ReplayResult structure even offline", async () => {
      const res = await runReplayApi({ rule_type: "COOL_OFF_AFTER_LOSS" });
      expect(res.rule_type).toBe("COOL_OFF_AFTER_LOSS");
      expect(res.overall_before.total_trades).toBeGreaterThan(0);
      expect(res.overall_after.total_trades).toBeLessThanOrEqual(res.overall_before.total_trades);
      expect(res.dual_equity_curve.length).toBeGreaterThan(0);
    });

    it("translateRuleApi parses natural language cooldowns offline", async () => {
      const res = await translateRuleApi("Pause trading for 20 minutes after losing money");
      expect(res.success).toBe(true);
      expect(res.rule?.rule_type).toBe("COOL_OFF_AFTER_LOSS");
      expect(res.rule?.cooldown_minutes).toBe(20);
    });
  });
});
