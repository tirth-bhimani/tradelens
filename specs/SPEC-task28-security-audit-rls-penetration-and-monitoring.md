# Spec: Task 28 - Security Audit, Cross-User RLS Penetration Tests & Monitoring

## Objective

Deliver the comprehensive production security hardening, cross-tenant penetration testing suite, sensitive endpoint rate limiting, and centralized error monitoring architecture for TradeLens.

As a multi-tenant financial analytics platform handling sensitive trading ledgers, execution records, P&L metrics, and proprietary rulebooks, TradeLens must enforce airtight tenant isolation, prevent automated denial-of-service/brute-force exploitation, capture production exceptions in real-time, and fail fast if vital environment variables are misconfigured.

Task 28 fulfills the final milestone of the 28-task development roadmap:
1. **Automated Cross-User RLS Penetration Test Suite**:
   - Penetration tests simulating an adversarial user ("Attacker User B") attempting to read, update, delete, or inject records belonging to "Victim User A" across all database tables (`profiles`, `trades`, `raw_fills`, `imports`, `rules`, `weekly_reports`, `stats_snapshots`, `coach_access`).
   - Asserts 100% rejection (zero rows returned or 403 Forbidden).
   - Simulates token spoofing and privilege escalation attempts (e.g. standard trader attempting coach or admin queries).
2. **Sensitive Endpoint Rate Limiting**:
   - Active rate limiting across high-risk endpoints:
     - Authentication & Login (`/login`, `/api/auth/`): 10 requests / minute per IP to defend against credential stuffing and brute force.
     - Broker Tradebook CSV Upload (`/api/trades/upload`, `/imports`): 5 uploads / minute per user/IP to prevent compute exhaustion and disk flooding.
     - AI Insights Generation (`/api/v1/ai/insights`, `/api/reports/generate`): 10 requests / minute per user/IP to defend against quota exhaustion and expensive model drain.
   - Dual-layer protection: Next.js edge/middleware rate limiter in `apps/web` and FastAPI token bucket rate limiter in `services/analytics`.
3. **Centralized Error Monitoring (Sentry Telemetry)**:
   - Sentry error logging initialized across both Next.js (`apps/web`) and FastAPI (`services/analytics`).
   - Graceful offline fallback: If `SENTRY_DSN` is empty or not configured (e.g. local offline sandbox or dev), logger operates in local console mode with zero crashes and zero unhandled rejections.
   - PII scrubbing before dispatch: Automatically scrubs trading tokens, authorization headers, passwords, and user file paths before payloads leave the host.
4. **Fail-Fast Environment Variable Validation**:
   - Next.js Web: Zod-based / strict typed runtime environment validator (`apps/web/lib/config/env.ts`) verifying required public and secret keys at build/startup time, outputting clear actionable error messages if critical variables are missing.
   - Python FastAPI: Pydantic v2 runtime settings validator (`services/analytics/app/core/config.py`) that audits database URLs, secret tokens, and provider keys during FastAPI lifespan startup.

---

## Assumptions

1. **Multi-Tenant RLS Foundation**: PostgreSQL Row-Level Security policies configured in `supabase/migrations/20261012000002_rls_policies.sql` enforce `auth.uid() = user_id`. Penetration tests evaluate both the database RLS policies and application-level authorization guards.
2. **Rate Limiting Storage**: In production without external Redis, rate limiting operates via an in-memory sliding window / token bucket algorithm with automatic TTL eviction. If Redis URL is configured in the environment, the rate limiter can seamlessly plug into a distributed store.
3. **Offline Telemetry Resilience**: When `SENTRY_DSN` or `NEXT_PUBLIC_SENTRY_DSN` is not provided in local development or sandboxed test runs, Sentry SDK initialization gracefully defaults to a mock transport/logger without attempting outbound network traffic.
4. **Non-Breaking Deployment**: Environment variable validation distinguishes between strict production mode (`NODE_ENV === "production"`) where missing secrets halt execution, and development/testing environments where sensible defaults allow tests and local dev servers to run smoothly.

---

## Tech Stack

- **Web Frontend**: Next.js 14.2.15, TypeScript 5, Tailwind CSS, Lucide icons
- **Rate Limiting**: In-memory sliding window rate limiter (`apps/web/lib/security/rate-limiter.ts` & `services/analytics/app/security/rate_limiter.py`)
- **Error Monitoring**: Sentry Next.js SDK (`@sentry/nextjs` or resilient custom wrapper conforming to Sentry DSN schema), Sentry Python SDK (`sentry_sdk`)
- **Environment Validation**: Zod / Pydantic v2 strict configuration parsers
- **Security Testing**:
  - Python: `pytest` (`services/analytics/tests/test_rls_penetration.py`)
  - Web: `vitest` (`apps/web/tests/security.test.ts`)

---

## Commands

```bash
# Security & Penetration Test Suites
Test Web Security: npm test --prefix apps/web -- tests/security.test.ts
Test Analytics RLS: services\analytics\.venv\Scripts\pytest.exe services/analytics/tests/test_rls_penetration.py

# Full Monorepo Test Suites
Test All Web: npm test --prefix apps/web -- --run
Test All Analytics: services\analytics\.venv\Scripts\pytest.exe services/analytics/tests/

# Production Build Verification
Build Web: npm run build --prefix apps/web
Typecheck Web: npm run typecheck --prefix apps/web
```

---

## Project Structure

```
specs/
  SPEC-task28-security-audit-rls-penetration-and-monitoring.md  # This specification

services/analytics/
  app/
    core/
      config.py                                 # Updated: Sentry DSN, rate limit thresholds & env audit
    monitoring/
      __init__.py
      sentry.py                                 # NEW: Sentry initialization, breadcrumbs & PII scrubber
    security/
      rate_limiter.py                           # NEW: FastAPI token bucket / sliding window rate limiter
  tests/
    test_rls_penetration.py                     # NEW: Pytest multi-tenant penetration attack simulation

apps/web/
  lib/
    config/
      env.ts                                    # NEW: Strict fail-fast runtime environment validator
    monitoring/
      sentry.ts                                 # NEW: Unified Sentry client/server logger with fallback
    security/
      rate-limiter.ts                           # NEW: In-memory sliding window rate limiter
  middleware.ts                                 # Updated: Rate limiting integration for login & upload
  tests/
    security.test.ts                            # NEW: Vitest penetration, rate limit & env validation tests
```

---

## Code Style & Implementation Patterns

### 1. In-Memory Sliding Window Rate Limiter
```typescript
// apps/web/lib/security/rate-limiter.ts
interface RateLimitConfig {
  limit: number;      // Maximum requests allowed in window
  windowMs: number;   // Window duration in milliseconds
}

export class SlidingWindowRateLimiter {
  private hits: Map<string, number[]> = new Map();

  constructor(private config: RateLimitConfig) {}

  check(identifier: string): { allowed: boolean; remaining: number; resetMs: number } {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    const timestamps = (this.hits.get(identifier) || []).filter((t) => t > windowStart);

    if (timestamps.length >= this.config.limit) {
      const oldest = timestamps[0];
      return {
        allowed: false,
        remaining: 0,
        resetMs: oldest + this.config.windowMs - now,
      };
    }

    timestamps.push(now);
    this.hits.set(identifier, timestamps);

    return {
      allowed: true,
      remaining: this.config.limit - timestamps.length,
      resetMs: this.config.windowMs,
    };
  }
}
```

### 2. Multi-Tenant Penetration Attack Simulation (Pytest)
```python
# services/analytics/tests/test_rls_penetration.py
def test_cross_tenant_trade_access_rejection():
    """Asserts that User B receives empty results when querying User A's trades."""
    user_a = "trader-uuid-aaa"
    user_b = "attacker-uuid-bbb"

    store = MockPostgresRLS()
    store.insert_trade(user_id=user_a, symbol="NIFTY", net_pnl=5000.0)

    # User B queries trades with their authenticated session
    results = store.query_trades(requesting_user_id=user_b)
    assert len(results) == 0, "Attacker User B was able to view User A's trade records!"
```

### 3. Fail-Fast Environment Validation
```typescript
// apps/web/lib/config/env.ts
export function validateEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ];

  for (const key of required) {
    if (!process.env[key] || process.env[key]?.trim() === "") {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }

  if (process.env.NODE_ENV === "production" && errors.length > 0) {
    throw new Error(`[CRITICAL] Environment validation failed:\n${errors.join("\n")}`);
  }

  return { valid: errors.length === 0, errors };
}
```

---

## Testing Strategy

### 1. Pytest RLS Penetration Suite (`services/analytics/tests/test_rls_penetration.py`)
- **Direct Cross-Tenant Read**:
  - User B attempts to read User A's raw fills, trades, rulebook configurations, weekly reports, and stats snapshots.
  - Assert 0 rows returned.
- **Cross-Tenant Mutation / Tampering**:
  - User B attempts to delete or update User A's trade or import batch.
  - Assert mutation is rejected with zero rows affected.
- **Coach Access Privilege Escalation**:
  - User C (coach) attempts to read User A's records without an active `coach_access` grant.
  - Assert access is rejected.
  - Verify that when consent is revoked, access is immediately and completely terminated.
- **Token Spoofing**:
  - Query executed with invalid, missing, or mismatched user claims in JWT payload.
  - Assert immediate rejection.

### 2. Vitest Security Suite (`apps/web/tests/security.test.ts`)
- **Rate Limiter Verification**:
  - Trigger 10 login requests within 1 minute; assert 11th request receives `{ allowed: false }` or HTTP 429.
  - Verify window resets properly after `windowMs` expires.
  - Test rate limiting on CSV upload (5 req/min) and AI endpoints (10 req/min).
- **Environment Validation**:
  - Test `validateEnvironment()` with valid and missing keys.
  - Assert production mode throws fatal error on missing secrets.
- **Sentry Logger Resilience**:
  - Test error capture with and without DSN configured.
  - Verify sensitive PII (passwords, tokens) is stripped from error payloads.

---

## Boundaries

- **Always**:
  - Reject cross-tenant database operations with 100% certainty.
  - Return HTTP 429 `Too Many Requests` with a `Retry-After` header when rate limits are exceeded.
  - Scrub passwords, tokens, and authorization headers from error telemetry before logging or transmission.
  - Validate environment variables during startup and provide actionable error messages.
  - Maintain 100% test pass rate across all monorepo test suites.
- **Ask First**:
  - Introducing heavy external dependencies for rate limiting or security scanning.
  - Changing production rate limit thresholds.
- **Never**:
  - Allow an unauthenticated or unauthorized user to view another user's financial trade records.
  - Expose API keys, database credentials, or secret tokens in client-side bundles or public error messages.
  - Silently disable RLS policies or bypass authentication checks.

---

## Success Criteria

1. **Cross-Tenant RLS Penetration Suite**:
   - `pytest services/analytics/tests/test_rls_penetration.py` passes with 100% of attack simulations rejected.
2. **Rate Limiting Active**:
   - Brute-force attacks against `/login` and `/api/auth/` are capped at 10 requests / minute.
   - Heavy tradebook uploads are capped at 5 requests / minute.
   - AI generation requests are capped at 10 requests / minute.
3. **Sentry Monitoring Configured**:
   - Initialized in both Next.js and FastAPI services.
   - Operates gracefully in local/offline environments without network errors.
4. **Environment Validation**:
   - Detects missing critical configuration on startup and provides actionable warnings/errors.
5. **Monorepo Health**:
   - All tests pass: `npm test --prefix apps/web -- --run`.
   - Production build succeeds: `npm run build --prefix apps/web`.

---

## Resolved Architectural Decisions

1. **In-Memory Sliding Window Rate Limiting**: The platform uses a high-performance in-memory sliding window rate limiter with automatic TTL pruning, eliminating mandatory external Redis dependencies while preserving clean pluggability for distributed redis stores.
2. **Resilient Local Sentry Architecture**: When `SENTRY_DSN` is empty or absent (such as in local development, testing, and offline sandboxes), Sentry SDK initialization defaults to a local console logger with PII scrubbing, guaranteeing 0 network errors and 0 test flakiness.
3. **Confirmed Rate Limit Thresholds**:
   - Authentication & Login: 10 requests / minute per IP.
   - Broker CSV Upload: 5 uploads / minute per user/IP.
   - AI Insights & Reports: 10 requests / minute per user/IP.
