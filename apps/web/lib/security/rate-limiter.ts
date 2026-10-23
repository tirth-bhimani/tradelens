/**
 * TradeLens In-Memory Sliding Window Rate Limiter.
 *
 * Enforces per-IP and per-user throttling on sensitive endpoints
 * (Authentication/Login, Tradebook CSV Upload, and AI Insights generation)
 * to prevent automated brute-forcing, resource exhaustion, and quota drainage.
 */

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

export class SlidingWindowRateLimiter {
  private hits: Map<string, number[]> = new Map();
  private limit: number;
  private windowMs: number;

  constructor(config: RateLimitConfig) {
    this.limit = config.limit;
    this.windowMs = config.windowMs;
  }

  /**
   * Evaluates if the given caller identifier is within allowed threshold.
   */
  check(identifier: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Prune expired hits older than windowStart
    const timestamps = (this.hits.get(identifier) || []).filter((t) => t > windowStart);

    if (timestamps.length >= this.limit) {
      const oldest = timestamps[0];
      const resetMs = Math.max(0, oldest + this.windowMs - now);
      this.hits.set(identifier, timestamps);
      return {
        allowed: false,
        remaining: 0,
        resetMs,
      };
    }

    // Record current hit
    timestamps.push(now);
    this.hits.set(identifier, timestamps);

    return {
      allowed: true,
      remaining: this.limit - timestamps.length,
      resetMs: this.windowMs,
    };
  }

  /**
   * Resets rate limit tracker for an identifier or clears entire table.
   */
  reset(identifier?: string): void {
    if (identifier) {
      this.hits.delete(identifier);
    } else {
      this.hits.clear();
    }
  }
}

// Institutional rate limit configurations
export const authRateLimiter = new SlidingWindowRateLimiter({
  limit: 10,
  windowMs: 60 * 1000, // 10 requests / minute
});

export const uploadRateLimiter = new SlidingWindowRateLimiter({
  limit: 5,
  windowMs: 60 * 1000, // 5 uploads / minute
});

export const aiRateLimiter = new SlidingWindowRateLimiter({
  limit: 10,
  windowMs: 60 * 1000, // 10 AI generations / minute
});
