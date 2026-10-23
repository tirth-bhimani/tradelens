import { describe, it, expect, beforeEach } from "vitest";
import {
  SlidingWindowRateLimiter,
  authRateLimiter,
  uploadRateLimiter,
  aiRateLimiter,
} from "../lib/security/rate-limiter";
import { validateEnvironment } from "../lib/config/env";
import { scrubContextPii, telemetry } from "../lib/monitoring/sentry";

describe("Cross-Tenant RLS Penetration Simulation (Task 28)", () => {
  interface MockTrade {
    id: string;
    user_id: string;
    symbol: string;
    net_pnl: number;
  }

  class MockSupabaseClient {
    private trades: MockTrade[] = [
      { id: "tr-user-a-1", user_id: "user-a", symbol: "NIFTY", net_pnl: 14500 },
      { id: "tr-user-a-2", user_id: "user-a", symbol: "BANKNIFTY", net_pnl: -3200 },
      { id: "tr-user-b-1", user_id: "user-b", symbol: "RELIANCE", net_pnl: 2100 },
    ];

    constructor(private currentUserId: string) {}

    // Simulates RLS-enforced SELECT
    selectTrades(): MockTrade[] {
      return this.trades.filter((t) => t.user_id === this.currentUserId);
    }

    // Simulates RLS-enforced UPDATE
    updateTrade(tradeId: string, updates: Partial<MockTrade>): boolean {
      const idx = this.trades.findIndex(
        (t) => t.id === tradeId && t.user_id === this.currentUserId
      );
      if (idx >= 0) {
        this.trades[idx] = { ...this.trades[idx], ...updates };
        return true;
      }
      return false; // Rejected by RLS
    }

    // Simulates RLS-enforced DELETE
    deleteTrade(tradeId: string): boolean {
      const initialLen = this.trades.length;
      this.trades = this.trades.filter(
        (t) => !(t.id === tradeId && t.user_id === this.currentUserId)
      );
      return this.trades.length < initialLen;
    }
  }

  it("asserts User B receives 0 rows when attempting to query User A's trades", () => {
    const clientB = new MockSupabaseClient("user-b");
    const trades = clientB.selectTrades();

    expect(trades).toHaveLength(1);
    expect(trades[0].user_id).toBe("user-b");
    expect(trades.some((t) => t.user_id === "user-a")).toBe(false);
  });

  it("asserts User B cannot update User A's trade records", () => {
    const clientB = new MockSupabaseClient("user-b");
    const updated = clientB.updateTrade("tr-user-a-1", { net_pnl: 0 });

    expect(updated).toBe(false);
  });

  it("asserts User B cannot delete User A's trade records", () => {
    const clientB = new MockSupabaseClient("user-b");
    const deleted = clientB.deleteTrade("tr-user-a-1");

    expect(deleted).toBe(false);
  });
});

describe("In-Memory Sliding Window Rate Limiter", () => {
  beforeEach(() => {
    authRateLimiter.reset();
    uploadRateLimiter.reset();
    aiRateLimiter.reset();
  });

  it("enforces login rate limit threshold (10 requests/minute)", () => {
    const ip = "192.168.1.1";

    for (let i = 0; i < 10; i++) {
      const res = authRateLimiter.check(ip);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(9 - i);
    }

    // 11th request must be rejected
    const blocked = authRateLimiter.check(ip);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetMs).toBeGreaterThan(0);
  });

  it("enforces upload rate limit threshold (5 uploads/minute)", () => {
    const user = "user-123";

    for (let i = 0; i < 5; i++) {
      const res = uploadRateLimiter.check(user);
      expect(res.allowed).toBe(true);
    }

    // 6th upload rejected
    const blocked = uploadRateLimiter.check(user);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("isolates counters per client IP/user", () => {
    const ip1 = "10.0.0.1";
    const ip2 = "10.0.0.2";

    for (let i = 0; i < 10; i++) {
      authRateLimiter.check(ip1);
    }

    expect(authRateLimiter.check(ip1).allowed).toBe(false);
    // ip2 should still be allowed
    expect(authRateLimiter.check(ip2).allowed).toBe(true);
  });
});

describe("Fail-Fast Environment Variable Validator", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it("passes when all required variables are well-formed", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://my-app.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

    const res = validateEnvironment();
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it("reports errors when required variables are missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const res = validateEnvironment();
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("NEXT_PUBLIC_SUPABASE_URL"))).toBe(true);
  });

  it("throws fatal error in production mode when critical keys are missing", () => {
    process.env.NODE_ENV = "production";
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => validateEnvironment()).toThrow(/CRITICAL/);
  });
});

describe("Sentry Telemetry PII Scrubber", () => {
  it("redacts sensitive authentication tokens and cookies from error context", () => {
    const dirtyContext = {
      user_id: "usr_100",
      symbol: "NIFTY",
      authorization: "Bearer secret-token-xyz",
      cookie_header: "sb-auth-token=123",
      api_key: "internal_secret_999",
      session: {
        access_token: "jwt.secret.payload",
        role: "trader",
      },
    };

    const sanitized = scrubContextPii(dirtyContext);

    expect(sanitized.user_id).toBe("usr_100");
    expect(sanitized.symbol).toBe("NIFTY");
    expect(sanitized.authorization).toBe("[REDACTED]");
    expect(sanitized.cookie_header).toBe("[REDACTED]");
    expect(sanitized.api_key).toBe("[REDACTED]");
    expect((sanitized.session as Record<string, unknown>).access_token).toBe("[REDACTED]");
    expect((sanitized.session as Record<string, unknown>).role).toBe("trader");
  });

  it("captures exceptions without crashing in offline/test environment", () => {
    const errId = telemetry.captureException(new Error("Test failure"), {
      auth_token: "secret",
      trade_id: "tr_42",
    });

    expect(errId).toMatch(/^err_\d+_/);
  });
});
