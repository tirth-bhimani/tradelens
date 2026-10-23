import { describe, it, expect, beforeEach } from "vitest";
import {
  getWeeklyReportsAction,
  getWeeklyReportByIdAction,
  generateWeeklyReportAction,
  getNotificationPreferencesAction,
  updateNotificationPreferencesAction,
  _resetMemoryReportsStore,
} from "../lib/reports/report-actions";
import { DEFAULT_WEEKLY_REPORTS } from "../lib/reports/report-defaults";

describe("Weekly Report Engine & Server Actions (Task 26)", () => {
  beforeEach(() => {
    _resetMemoryReportsStore();
  });

  it("retrieves historical weekly reports sorted chronologically", async () => {
    const result = await getWeeklyReportsAction();
    expect(result.error).toBeFalsy();
    expect(result.reports.length).toBeGreaterThanOrEqual(2);
    expect(result.latest).toBeDefined();
    expect(result.latest?.id).toBe("rep-2026-w42");
    expect(result.latest?.net_pnl).toBe(24850.0);
  });

  it("maintains financial consistency across gross P&L, charges, and net P&L", async () => {
    const result = await getWeeklyReportsAction();
    for (const report of result.reports) {
      const calculatedNet = report.gross_pnl - report.total_charges;
      expect(Math.abs(report.net_pnl - calculatedNet)).toBeLessThan(0.01);
      expect(report.win_rate).toBeGreaterThanOrEqual(0);
      expect(report.win_rate).toBeLessThanOrEqual(100);
      expect(report.adherence_score).toBeGreaterThanOrEqual(0);
      expect(report.adherence_score).toBeLessThanOrEqual(100);
    }
  });

  it("retrieves a specific weekly report by ID", async () => {
    const { report: rep42 } = await getWeeklyReportByIdAction("rep-2026-w42");
    expect(rep42).not.toBeNull();
    expect(rep42?.week_start_date).toBe("2026-10-12");
    expect(rep42?.total_trades).toBe(18);
    expect(rep42?.focus_item).toContain("discipline");

    const { report: nonExistent, error } = await getWeeklyReportByIdAction("rep-invalid-999");
    expect(nonExistent).toBeNull();
    expect(error).toBe("Report not found");
  });

  it("generates an on-demand weekly report and updates memory store", async () => {
    const genResult = await generateWeeklyReportAction("2026-10-19");
    expect(genResult.success).toBe(true);
    expect(genResult.report).toBeDefined();
    expect(genResult.report?.week_start_date).toBe("2026-10-19");
    expect(genResult.report?.net_pnl).toBe(15800.0);

    // Verify it is now present in the reports list as latest
    const listResult = await getWeeklyReportsAction();
    expect(listResult.reports[0].id).toBe(genResult.report?.id);
  });

  it("retrieves and updates notification preferences", async () => {
    const { preferences: initial } = await getNotificationPreferencesAction();
    expect(initial.weekly_email_enabled).toBe(true);

    const updateRes = await updateNotificationPreferencesAction({
      weekly_email_enabled: false,
      email_notifications_email: "custom-trader@domain.com",
    });

    expect(updateRes.success).toBe(true);
    expect(updateRes.preferences?.weekly_email_enabled).toBe(false);
    expect(updateRes.preferences?.email_notifications_email).toBe("custom-trader@domain.com");

    // Fetch again to verify persistence
    const { preferences: fetched } = await getNotificationPreferencesAction();
    expect(fetched.weekly_email_enabled).toBe(false);
    expect(fetched.email_notifications_email).toBe("custom-trader@domain.com");
  });
});

describe("Weekly Report Cron API Route (/api/reports/cron)", () => {
  it("rejects unauthorized requests without valid bearer token", async () => {
    const { POST } = await import("../app/api/reports/cron/route");
    const req = new Request("http://localhost:3000/api/reports/cron", {
      method: "POST",
      headers: {},
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Unauthorized");
  });

  it("accepts authorized requests with valid CRON_SECRET bearer token", async () => {
    const { POST } = await import("../app/api/reports/cron/route");
    const req = new Request("http://localhost:3000/api/reports/cron", {
      method: "POST",
      headers: {
        authorization: "Bearer tradelens-cron-secret-dev",
      },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("success");
    expect(body.message).toContain("executed successfully");
  });
});
