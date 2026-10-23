/**
 * TradeLens Privacy & Formula Injection (CWE-1236) Defense Layer.
 *
 * Neutralizes spreadsheet formula execution prefixes (=, +, -, @, \t, \r)
 * while preserving valid numeric negative and positive values (e.g., negative P&L figures).
 * Strips sensitive authentication credentials and internal secret tokens.
 */

const DANGEROUS_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];
const NUMERIC_REGEX = /^[-+]?\d+(\.\d+)?$/;

const SENSITIVE_KEY_PATTERNS = [
  "password",
  "password_hash",
  "token",
  "secret",
  "api_key",
  "session_id",
  "access_token",
  "refresh_token",
  "encrypted_key",
  "cookie",
];

/**
 * Sanitizes a single cell value against formula injection attacks.
 */
export function sanitizeCsvField(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  // Handle arrays or objects by stringifying
  let str: string;
  if (typeof value === "object") {
    str = JSON.stringify(value);
  } else {
    str = String(value);
  }

  if (str === "") {
    return "";
  }

  // Tab or CR at start is an immediate DDE/formula trigger in spreadsheet engines
  if (str.startsWith("\t") || str.startsWith("\r")) {
    str = `'${str}`;
  } else {
    const trimmed = str.trim();
    if (DANGEROUS_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
      // Preserve purely numeric values (e.g. -1250.50 P&L or +100 qty)
      if (!NUMERIC_REGEX.test(trimmed)) {
        str = `'${str}`;
      }
    }
  }

  // Quote escaping for RFC 4180 CSV compliance
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Strips sensitive authentication tokens, password hashes, and session secrets from an object.
 */
export function stripSensitiveFields<T extends Record<string, unknown>>(record: T): Partial<T> {
  const cleaned: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(record)) {
    const keyLower = key.toLowerCase();
    if (SENSITIVE_KEY_PATTERNS.some((pattern) => keyLower.includes(pattern))) {
      continue;
    }
    cleaned[key] = val;
  }

  return cleaned as Partial<T>;
}

/**
 * Formats an array of records into a valid RFC 4180 CSV string with sanitized cells.
 */
export function formatCsv<T extends Record<string, unknown>>(
  records: T[],
  fieldnames: string[]
): string {
  const header = fieldnames.map((f) => sanitizeCsvField(f)).join(",");
  const rows = records.map((rec) => {
    const cleaned = stripSensitiveFields(rec);
    return fieldnames
      .map((field) => sanitizeCsvField(cleaned[field]))
      .join(",");
  });

  return [header, ...rows].join("\n");
}
