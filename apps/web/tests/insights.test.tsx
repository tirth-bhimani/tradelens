import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildRuleLabDeepLink,
  DEFAULT_INSIGHT_REPORT,
  type FrontendLeakDiagnosis,
  type FrontendSuggestedRule,
} from "../lib/insights/types";
import { SampleSizeWarning } from "../components/insights/sample-size-warning";
import { InsightCard } from "../components/insights/insight-card";
import { TopLeaksBanner } from "../components/insights/top-leaks-banner";
import { InsightsSection } from "../components/insights/insights-section";

describe("AI Behavioral Insights Pipeline & Frontend Components", () => {
  const sampleLeak: FrontendLeakDiagnosis = {
    leak_type: "RE_ENTRY_TILT",
    severity: "HIGH",
    title: "Impulsive Re-entry Tilt",
    diagnosis: "Re-entering immediately after losses caused avoidable drawdown.",
    evidence: "5 hurried re-entries leading to ₹8,500.00 in losses.",
    trade_count: 5,
    pnl_impact_inr: -8500.0,
  };

  const sampleRule: FrontendSuggestedRule = {
    rule_id: "COOL_OFF_AFTER_LOSS",
    rule_name: "15-Minute Mandatory Cooldown",
    rationale: "Impose emotional circuit breaker after any loss.",
    recommended_parameters: {
      cooldown_minutes: 15,
      max_consecutive_losses: 1,
    },
  };

  describe("buildRuleLabDeepLink helper", () => {
    it("generates correct query parameters with prefillRule and parameters", () => {
      const url = buildRuleLabDeepLink("COOL_OFF_AFTER_LOSS", {
        cooldown_minutes: 15,
        max_consecutive_losses: 1,
      });

      expect(url).toContain("/rule-lab?");
      expect(url).toContain("prefillRule=COOL_OFF_AFTER_LOSS");
      expect(url).toContain("cooldown_minutes=15");
      expect(url).toContain("max_consecutive_losses=1");
    });

    it("handles empty parameters gracefully", () => {
      const url = buildRuleLabDeepLink("OVERTRADING");
      expect(url).toBe("/rule-lab?prefillRule=OVERTRADING");
    });
  });

  describe("SampleSizeWarning Component", () => {
    it("renders warning badge when tradeCount is below threshold (<30)", () => {
      const html = renderToStaticMarkup(
        <SampleSizeWarning tradeCount={12} threshold={30} />
      );

      expect(html).toContain("Small Sample (12 trades)");
      expect(html).toContain("Confidence requires ≥30 trades");
    });

    it("renders null when tradeCount meets or exceeds threshold (>=30)", () => {
      const html = renderToStaticMarkup(
        <SampleSizeWarning tradeCount={45} threshold={30} />
      );

      expect(html).toBe("");
    });
  });

  describe("InsightCard Component", () => {
    it("renders leak title, priority tag, evidence, and financial impact", () => {
      const html = renderToStaticMarkup(
        <InsightCard leak={sampleLeak} rule={sampleRule} totalTradesAnalyzed={24} />
      );

      expect(html).toContain("Impulsive Re-entry Tilt");
      expect(html).toContain("Priority: HIGH");
      expect(html).toContain("₹8,500.00");
      expect(html).toContain("5 hurried re-entries");
      expect(html).toContain("5 Trades Involved");
      expect(html).toContain("Recommended Guardrail: 15-Minute Mandatory Cooldown");
    });

    it("renders small sample warning when trades count is under 30", () => {
      const html = renderToStaticMarkup(
        <InsightCard leak={sampleLeak} rule={sampleRule} totalTradesAnalyzed={5} />
      );

      expect(html).toContain("Small Sample (5 trades)");
    });

    it("contains one-click deep link to Rule Lab with prefillRule parameter", () => {
      const html = renderToStaticMarkup(
        <InsightCard leak={sampleLeak} rule={sampleRule} />
      );

      expect(html).toContain('href="/rule-lab?prefillRule=COOL_OFF_AFTER_LOSS');
      expect(html).toContain("Test This Rule in Rule Lab");
    });
  });

  describe("TopLeaksBanner Component", () => {
    it("renders discipline score, letter grade, and grounding verification badge", () => {
      const html = renderToStaticMarkup(
        <TopLeaksBanner report={DEFAULT_INSIGHT_REPORT} />
      );

      expect(html).toContain("Grade C");
      expect(html).toContain("(68/100)");
      expect(html).toContain("Grounding Verified");
      expect(html).toContain("FREE_DETERMINISTIC");
      expect(html).toContain("Primary Capital Drag");
      expect(html).toContain("Impulsive Re-entry Tilt Following Losses");
    });
  });

  describe("InsightsSection Component", () => {
    it("renders banner, top 3 leak cards, and mandatory educational disclaimer", () => {
      const html = renderToStaticMarkup(
        <InsightsSection report={DEFAULT_INSIGHT_REPORT} totalTradesAnalyzed={24} />
      );

      expect(html).toContain('data-testid="insights-section"');
      expect(html).toContain("Impulsive Re-entry Tilt Following Losses");
      expect(html).toContain("Excessive Intraday Trade Frequency");
      expect(html).toContain("Asymmetric Loser Duration Squeeze");
      expect(html).toContain("DISCLAIMER: This diagnostic audit is strictly educational");
    });
  });

  describe("Dynamic Insights Action & Dashboard Metrics Engine", () => {
    it("dynamically computes dashboard metrics from trades", async () => {
      const { computeDashboardMetrics, computeEquityChartPoints, computeBehavioralLeaks } = await import(
        "../lib/trades/dashboard-metrics"
      );
      const { DEFAULT_TRADE_LOG } = await import("../lib/trades/trade-defaults");

      const metrics = computeDashboardMetrics(DEFAULT_TRADE_LOG, 100000);
      expect(metrics.totalTrades).toBe(DEFAULT_TRADE_LOG.length);
      expect(metrics.winRate).toBeGreaterThan(0);
      expect(metrics.expectancyInr).toBeDefined();

      const chartPoints = computeEquityChartPoints(DEFAULT_TRADE_LOG);
      expect(chartPoints.length).toBe(DEFAULT_TRADE_LOG.length);
      expect(chartPoints[0].cumulativePnl).toBeDefined();

      const leaks = computeBehavioralLeaks(DEFAULT_TRADE_LOG);
      expect(leaks.disciplineScore).toBeGreaterThanOrEqual(0);
      expect(leaks.disciplineScore).toBeLessThanOrEqual(100);
      expect(leaks.topLeak.title).toBeDefined();
    });

    it("generates structured AI insights report via getAiInsightsAction", async () => {
      const { getAiInsightsAction } = await import("../lib/insights/actions");
      const res = await getAiInsightsAction();
      expect(res.report).toBeDefined();
      expect(res.report.overall_summary).toBeDefined();
      expect(res.report.discipline_score).toBeGreaterThan(0);
      expect(res.totalTradesAnalyzed).toBeGreaterThanOrEqual(0);
    });
  });
});
