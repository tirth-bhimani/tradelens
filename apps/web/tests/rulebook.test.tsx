import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RuleCard } from "../components/rules/rule-card";
import { RulebookList } from "../components/rules/rulebook-list";
import { AdherenceScorecard } from "../components/rules/adherence-scorecard";
import { AdherenceBadge } from "../components/rules/adherence-badge";
import { evaluateClientAdherence } from "../lib/rules/adherence-evaluator";
import type { SavedRule, AdherenceReport, TradeViolation } from "../lib/rules/adherence-types";

describe("Rulebook & Import Adherence Tracker (Task 23)", () => {
  const mockRules: SavedRule[] = [
    {
      id: "rule-1",
      rule_type: "COOL_OFF_AFTER_LOSS",
      rule_payload: { cooldown_minutes: 20, trigger_loss_inr: 2000 },
      natural_language_text: "Mandatory 20-minute pause after any loss > ₹2,000.",
      is_active: true,
    },
    {
      id: "rule-2",
      rule_type: "MAX_TRADES_PER_DAY",
      rule_payload: { max_trades: 4 },
      natural_language_text: "Cap daily execution at 4 trades.",
      is_active: false,
    },
  ];

  describe("RuleCard Component", () => {
    it("renders rule type, parameters, and active/paused state", () => {
      const activeHtml = renderToStaticMarkup(
        <RuleCard rule={mockRules[0]} onToggleActive={async () => {}} onDeleteRule={async () => {}} />
      );
      expect(activeHtml).toContain("COOL_OFF_AFTER_LOSS");
      expect(activeHtml).toContain("ACTIVE");
      expect(activeHtml).toContain("cooldown_minutes");
      expect(activeHtml).toContain("20");

      const pausedHtml = renderToStaticMarkup(
        <RuleCard rule={mockRules[1]} onToggleActive={async () => {}} onDeleteRule={async () => {}} />
      );
      expect(pausedHtml).toContain("MAX_TRADES_PER_DAY");
      expect(pausedHtml).toContain("PAUSED");
    });
  });

  describe("RulebookList Component", () => {
    it("renders filter tabs and rules stack", () => {
      const html = renderToStaticMarkup(<RulebookList initialRules={mockRules} />);
      expect(html).toContain("All Rules (2)");
      expect(html).toContain("Active (1)");
      expect(html).toContain("Paused (1)");
      expect(html).toContain("COOL_OFF_AFTER_LOSS");
    });

    it("renders empty state when rules list is empty", () => {
      const html = renderToStaticMarkup(<RulebookList initialRules={[]} />);
      expect(html).toContain("No rules in your Rulebook");
      expect(html).toContain("Backtest a Rule in Rule Lab");
    });
  });

  describe("AdherenceScorecard Component", () => {
    it("renders discipline score, avoidable loss metrics, and rule breakdown", () => {
      const mockReport: AdherenceReport = {
        total_trades_evaluated: 10,
        total_adhering_trades: 8,
        total_violating_trades: 2,
        discipline_score_pct: 80.0,
        total_avoidable_losses_incurred: 4500.0,
        violations: [],
        rules_breakdown: [
          {
            rule_id: "rule-1",
            rule_type: "COOL_OFF_AFTER_LOSS",
            is_active: true,
            total_evaluations: 10,
            violations_count: 2,
            adherence_pct: 80.0,
            avoidable_loss_incurred: 4500.0,
          },
        ],
        evaluated_at: new Date().toISOString(),
      };

      const html = renderToStaticMarkup(<AdherenceScorecard report={mockReport} />);
      expect(html).toContain("80.0%");
      expect(html).toContain("Rule Violations Detected");
      expect(html).toContain("2 Trades");
      expect(html).toContain("Avoidable Losses Incurred");
      expect(html).toContain("₹4,500");
      expect(html).toContain("COOL_OFF_AFTER_LOSS");
    });
  });

  describe("AdherenceBadge Component", () => {
    it("renders compliant badge when no violation exists", () => {
      const html = renderToStaticMarkup(<AdherenceBadge violation={null} />);
      expect(html).toContain("Rule Compliant");
    });

    it("renders violation badge when violation exists", () => {
      const violation: TradeViolation = {
        trade_id: "t1",
        symbol: "NIFTY",
        entry_time: "2026-09-01T10:00:00Z",
        rule_id: "rule-1",
        rule_type: "COOL_OFF_AFTER_LOSS",
        violation_code: "COOLDOWN_VIOLATION",
        penalty_pnl: -2000,
        explanation: "Re-entered too fast after loss.",
      };
      const html = renderToStaticMarkup(<AdherenceBadge violation={violation} />);
      expect(html).toContain("COOLDOWN VIOLATION");
    });
  });

  describe("evaluateClientAdherence Evaluator", () => {
    it("correctly identifies violations and computes score", () => {
      const trades = [
        { id: "t1", symbol: "NIFTY", entry_time: "2026-09-01T09:30:00+05:30", exit_time: "2026-09-01T09:45:00+05:30", net_pnl: -3000 },
        { id: "t2", symbol: "NIFTY", entry_time: "2026-09-01T09:50:00+05:30", exit_time: "2026-09-01T10:15:00+05:30", net_pnl: -1500 }, // Breach cooldown (5m < 20m)
        { id: "t3", symbol: "NIFTY", entry_time: "2026-09-01T11:00:00+05:30", exit_time: "2026-09-01T11:30:00+05:30", net_pnl: 2000 },
      ];

      const report = evaluateClientAdherence(trades, mockRules);
      expect(report.total_trades_evaluated).toBe(3);
      expect(report.total_violating_trades).toBe(1);
      expect(report.discipline_score_pct).toBe(66.7);
      expect(report.total_avoidable_losses_incurred).toBe(1500);
      expect(report.violations[0].trade_id).toBe("t2");
    });
  });
});
