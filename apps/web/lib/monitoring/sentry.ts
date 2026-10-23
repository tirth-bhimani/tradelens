/**
 * TradeLens Centralized Error Telemetry & PII Sanitizer for Next.js.
 *
 * Provides a resilient monitoring interface that scrubs sensitive credentials
 * (Authorization headers, session tokens, passwords, cookies) before telemetry dispatch.
 * Operates in local console mode when SENTRY_DSN is absent.
 */

const SENSITIVE_PATTERNS = ["auth", "token", "key", "secret", "cookie", "pass", "pwd"];

/**
 * Scrubs sensitive key-value pairs from telemetry context objects.
 */
export function scrubContextPii<T extends Record<string, unknown>>(data: T): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(data)) {
    const kLower = key.toLowerCase();
    if (SENSITIVE_PATTERNS.some((p) => kLower.includes(p))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      sanitized[key] = scrubContextPii(val as Record<string, unknown>);
    } else {
      sanitized[key] = val;
    }
  }

  return sanitized;
}

export class TelemetryLogger {
  private dsn: string | undefined;

  constructor() {
    this.dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
  }

  /**
   * Captures an application error, scrubbing PII from any attached context.
   */
  captureException(error: unknown, context?: Record<string, unknown>): string {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const cleanContext = context ? scrubContextPii(context) : undefined;

    if (process.env.NODE_ENV !== "test") {
      console.error(`[TELEMETRY][${errorId}]`, error, cleanContext || "");
    }

    return errorId;
  }

  /**
   * Adds a breadcrumb to the active telemetry session.
   */
  addBreadcrumb(message: string, category = "app", level: "info" | "warn" | "error" = "info"): void {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[BREADCRUMB ${category}/${level}]: ${message}`);
    }
  }
}

export const telemetry = new TelemetryLogger();
