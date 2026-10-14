import { describe, it, expect } from "vitest";
import {
  calculateRemainingIdleTime,
  isIdleExpired,
  shouldShowIdleWarning,
  formatCountdownTime,
  DEFAULT_IDLE_TIMEOUT_MINUTES,
  DEFAULT_WARNING_SECONDS,
} from "../lib/auth/idle-timer";

describe("Inactivity & Idle Session Timeout Calculations", () => {
  const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes = 900,000 ms
  const WARNING_MS = 60 * 1000;      // 60 seconds = 60,000 ms

  it("calculates remaining idle time correctly", () => {
    const now = 1700000000000;
    // 5 minutes elapsed
    const lastActivity = now - 5 * 60 * 1000;
    const remaining = calculateRemainingIdleTime(lastActivity, TIMEOUT_MS, now);
    expect(remaining).toBe(10 * 60 * 1000); // 10 minutes left
  });

  it("clamps remaining idle time to 0 when expired", () => {
    const now = 1700000000000;
    // 20 minutes elapsed (past 15m limit)
    const lastActivity = now - 20 * 60 * 1000;
    const remaining = calculateRemainingIdleTime(lastActivity, TIMEOUT_MS, now);
    expect(remaining).toBe(0);
  });

  it("handles empty or zero last activity safely", () => {
    expect(calculateRemainingIdleTime(0, TIMEOUT_MS)).toBe(TIMEOUT_MS);
  });

  it("determines if session is expired", () => {
    const now = 1700000000000;
    // 14 minutes: not expired
    expect(isIdleExpired(now - 14 * 60 * 1000, TIMEOUT_MS, now)).toBe(false);
    // 15 minutes exact: expired
    expect(isIdleExpired(now - 15 * 60 * 1000, TIMEOUT_MS, now)).toBe(true);
    // 16 minutes: expired
    expect(isIdleExpired(now - 16 * 60 * 1000, TIMEOUT_MS, now)).toBe(true);
  });

  it("triggers warning only within warning window", () => {
    const now = 1700000000000;
    // 10 minutes elapsed (5 min remaining > 60s warning): false
    expect(
      shouldShowIdleWarning(now - 10 * 60 * 1000, TIMEOUT_MS, WARNING_MS, now)
    ).toBe(false);

    // 14 minutes and 30 seconds elapsed (30s remaining <= 60s warning): true
    expect(
      shouldShowIdleWarning(
        now - (14 * 60 + 30) * 1000,
        TIMEOUT_MS,
        WARNING_MS,
        now
      )
    ).toBe(true);

    // Completely expired (0s remaining): false (auto-logout triggers)
    expect(
      shouldShowIdleWarning(now - 16 * 60 * 1000, TIMEOUT_MS, WARNING_MS, now)
    ).toBe(false);
  });

  it("formats countdown display cleanly", () => {
    expect(formatCountdownTime(45)).toBe("45s");
    expect(formatCountdownTime(5)).toBe("5s");
    expect(formatCountdownTime(0)).toBe("0s");
    expect(formatCountdownTime(60)).toBe("1:00");
    expect(formatCountdownTime(65)).toBe("1:05");
    expect(formatCountdownTime(125)).toBe("2:05");
  });

  it("provides standard FinTech default durations", () => {
    expect(DEFAULT_IDLE_TIMEOUT_MINUTES).toBe(15);
    expect(DEFAULT_WARNING_SECONDS).toBe(60);
  });
});
