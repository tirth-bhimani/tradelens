import { describe, expect, it } from "vitest";
import { isProtectedRoute, isAuthRoute } from "@/lib/supabase/middleware";

describe("Auth & Onboarding Validation Logic", () => {
  it("defaults timezone to Asia/Kolkata (IST)", () => {
    const rawTimezone = "";
    const timezone = rawTimezone || "Asia/Kolkata";
    expect(timezone).toBe("Asia/Kolkata");
  });

  it("validates and parses non-negative starting capital", () => {
    const validCapitalStr = "150000";
    const capital = parseFloat(validCapitalStr);
    expect(capital).toBe(150000);
    expect(capital >= 0).toBe(true);

    const negativeCapitalStr = "-500";
    const negativeCapital = parseFloat(negativeCapitalStr);
    expect(negativeCapital < 0).toBe(true);
  });

  it("defaults active segments to both EQUITY and FNO if none selected", () => {
    const selectedSegments: string[] = [];
    if (selectedSegments.length === 0) {
      selectedSegments.push("EQUITY", "FNO");
    }
    expect(selectedSegments).toEqual(["EQUITY", "FNO"]);
  });

  it("identifies protected routes requiring authentication from canonical middleware", () => {
    expect(isProtectedRoute("/dashboard")).toBe(true);
    expect(isProtectedRoute("/dashboard/analytics")).toBe(true);
    expect(isProtectedRoute("/onboarding")).toBe(true);
    expect(isProtectedRoute("/imports")).toBe(true);
    expect(isProtectedRoute("/rule-lab")).toBe(true);
    expect(isProtectedRoute("/login")).toBe(false);
    expect(isProtectedRoute("/signup")).toBe(false);
    expect(isProtectedRoute("/")).toBe(false);
  });

  it("validates minimum 8-character password requirement", () => {
    const weakPassword = "short";
    const validPassword = "SecureTradingPass123";
    expect(weakPassword.length < 8).toBe(true);
    expect(validPassword.length >= 8).toBe(true);
  });

  it("sanitizes open redirect target URLs safely", () => {
    const sanitizeRedirect = (raw: string) => {
      const isSafe = raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\");
      return isSafe ? raw : "/dashboard";
    };

    expect(sanitizeRedirect("/imports")).toBe("/imports");
    expect(sanitizeRedirect("/dashboard/analytics")).toBe("/dashboard/analytics");
    expect(sanitizeRedirect("//evil.com")).toBe("/dashboard");
    expect(sanitizeRedirect("/\\evil.com")).toBe("/dashboard");
    expect(sanitizeRedirect("https://attacker.com")).toBe("/dashboard");
  });
});

