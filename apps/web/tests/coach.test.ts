import { describe, it, expect } from "vitest";
import {
  getCoachRosterAction,
  getCohortStatsAction,
  getTraderDrillDownAction,
  addCoachNoteAction,
  assignCoachRuleAction,
} from "@/lib/coach/coach-actions";

describe("Task 25: Coach Cohort Dashboard & Intervention Engine", () => {
  describe("1. Cohort Aggregate Statistics", () => {
    it("computes accurate cohort metrics across active students", async () => {
      const { stats, error } = await getCohortStatsAction();

      expect(error).toBeNull();
      expect(stats).toBeDefined();
      expect(stats.total_students).toBeGreaterThanOrEqual(3);
      expect(stats.active_students).toBeGreaterThanOrEqual(2);
      expect(stats.cohort_win_rate).toBeGreaterThan(0);
      expect(typeof stats.cohort_net_pnl).toBe("number");
      expect(stats.cohort_adherence_avg).toBeGreaterThanOrEqual(0);
      expect(typeof stats.top_behavioral_leak).toBe("string");
      expect(stats.top_behavioral_leak.length).toBeGreaterThan(0);
    });

    it("evaluates traffic-light risk distribution correctly", async () => {
      const { stats } = await getCohortStatsAction();

      expect(stats.risk_distribution).toBeDefined();
      expect(stats.risk_distribution.green).toBeGreaterThanOrEqual(1);
      expect(stats.risk_distribution.yellow).toBeGreaterThanOrEqual(1);
      expect(stats.risk_distribution.red).toBeGreaterThanOrEqual(1);
      expect(stats.risk_distribution.revoked).toBeGreaterThanOrEqual(1);
    });
  });

  describe("2. Read-Only Mentee Analytics Drill-Down", () => {
    it("returns deep read-only analytics for an active mentee", async () => {
      const { data, error } = await getTraderDrillDownAction("trader-101");

      expect(error).toBeFalsy();
      expect(data).toBeDefined();
      expect(data?.trader_name).toBe("Aakash Sharma");
      expect(data?.status).toBe("active");
      expect(data?.metrics.win_rate).toBe(61.9);
      expect(data?.metrics.net_pnl).toBe(34500);
      expect(data?.equity_curve.length).toBeGreaterThan(0);
      expect(data?.recent_trades.length).toBeGreaterThan(0);
    });

    it("returns tilt cascade autopsy history for a high-risk mentee", async () => {
      const { data, error } = await getTraderDrillDownAction("trader-102");

      expect(error).toBeFalsy();
      expect(data).toBeDefined();
      expect(data?.trader_name).toBe("Rohan Kulkarni");
      expect(data?.metrics.max_drawdown_pct).toBeGreaterThan(15);
      expect(data?.tilt_cascades.length).toBeGreaterThan(0);
      expect(data?.tilt_cascades[0].severity).toBe("severe");
      expect(data?.tilt_cascades[0].loss_spiral_inr).toBeGreaterThan(5000);
    });

    it("strictly blocks analytics drill-down if trader consent is revoked", async () => {
      const { data, error } = await getTraderDrillDownAction("trader-104");

      expect(data).toBeUndefined();
      expect(error).toContain("revoked");
    });
  });

  describe("3. Private Coaching Notes", () => {
    it("records a private feedback note with tags", async () => {
      const res = await addCoachNoteAction({
        traderId: "trader-102",
        note: "Discussed sizing adjustments on BankNifty weekly expiry. Agreed to hard stop at 2 lots.",
        tags: ["sizing", "discipline"],
        isPrivate: true,
      });

      expect(res.success).toBe(true);
      expect(res.note).toBeDefined();
      expect(res.note?.trader_id).toBe("trader-102");
      expect(res.note?.is_private_to_coach).toBe(true);
      expect(res.note?.tags).toContain("sizing");

      // Verify the note appears in the trader's drilldown
      const drillDown = await getTraderDrillDownAction("trader-102");
      const found = drillDown.data?.notes.some((n) => n.id === res.note?.id);
      expect(found).toBe(true);
    });

    it("rejects empty coaching notes with validation error", async () => {
      const res = await addCoachNoteAction({
        traderId: "trader-101",
        note: "   ",
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe("Note content cannot be empty.");
    });
  });

  describe("4. Direct Rulebook Rule Assignment", () => {
    it("assigns a risk guardrail rule to student rulebook", async () => {
      const res = await assignCoachRuleAction({
        traderId: "trader-102",
        ruleName: "Max Daily Loss Limit: ₹8,000",
        ruleType: "max_daily_loss",
        rulePayload: { max_loss_inr: 8000 },
        naturalLanguageText: "Halt all executions when daily loss hits ₹8,000.",
        actionMode: "restrict",
      });

      expect(res.success).toBe(true);
      expect(res.ruleId).toBeDefined();

      // Verify the assigned rule appears in the student's rule list
      const drillDown = await getTraderDrillDownAction("trader-102");
      const assigned = drillDown.data?.rules.some(
        (r) => r.name === "Max Daily Loss Limit: ₹8,000"
      );
      expect(assigned).toBe(true);
    });

    it("rejects rule assignment if rule name or type is missing", async () => {
      const res = await assignCoachRuleAction({
        traderId: "trader-101",
        ruleName: "",
        ruleType: "",
        rulePayload: {},
        naturalLanguageText: "",
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe("Rule name and type are required.");
    });
  });
});
