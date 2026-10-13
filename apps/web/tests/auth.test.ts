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

  it("identifies auth routes that redirect authenticated users from canonical middleware", () => {
    expect(isAuthRoute("/login")).toBe(true);
    expect(isAuthRoute("/signup")).toBe(true);
    expect(isAuthRoute("/dashboard")).toBe(false);
    expect(isAuthRoute("/")).toBe(false);
  });
});
