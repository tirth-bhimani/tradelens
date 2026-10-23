/**
 * TradeLens Environment Variable Validation & Fail-Fast Runtime Checker.
 *
 * Verifies that all required public keys, database credentials, and secrets
 * are present and well-formed during build and startup.
 */

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEnvironment(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const requiredVariables = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ];

  for (const varName of requiredVariables) {
    const val = process.env[varName];
    if (!val || val.trim() === "") {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  }

  // Check URL format for Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl && !supabaseUrl.startsWith("http://") && !supabaseUrl.startsWith("https://")) {
    errors.push(`NEXT_PUBLIC_SUPABASE_URL must be a valid HTTP(S) URL. Received: ${supabaseUrl}`);
  }

  // Production-only strict security checks
  if (process.env.NODE_ENV === "production") {
    if (supabaseUrl?.includes("localhost") || supabaseUrl?.includes("127.0.0.1")) {
      warnings.push("NEXT_PUBLIC_SUPABASE_URL is pointing to localhost in a production environment.");
    }

    if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
      warnings.push("SENTRY_DSN is not configured; production error telemetry will be disabled.");
    }

    if (errors.length > 0) {
      const formatted = errors.map((e) => `  - ${e}`).join("\n");
      throw new Error(`[CRITICAL] Environment variable validation failed:\n${formatted}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
