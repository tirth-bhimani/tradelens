/**
 * TradeLens CSV Formula Injection (CWE-1236) Defense Layer
 *
 * Scans and sanitizes CSV cells to neutralize Dynamic Data Exchange (DDE)
 * and formula execution threats when opened in spreadsheet applications.
 */

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
export const ALLOWED_EXTENSIONS = [".csv"];
export const ALLOWED_MIME_TYPES = [
  "text/csv",
  "text/plain",
  "application/vnd.ms-excel",
  "application/csv",
  "text/x-csv",
];

const DANGEROUS_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];
// Matches clean signed or unsigned integers and floating-point numbers
const NUMERIC_PATTERN = /^[-+]?\d+(\.\d+)?$/;

/**
 * Validates file metadata before processing.
 */
export function validateCsvFileMeta(file: { name: string; size: number; type?: string }): {
  valid: boolean;
  error?: string;
} {
  if (!file || !file.name) {
    return { valid: false, error: "No file was provided." };
  }

  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `Invalid file extension "${extension}". Only .csv files are supported.`,
    };
  }

  if (file.size <= 0) {
    return { valid: false, error: "The provided CSV file is empty (0 bytes)." };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeInMb}MB) exceeds the maximum allowed limit of 25MB.`,
    };
  }

  return { valid: true };
}

/**
 * Sanitizes an individual CSV cell.
 * If the cell begins with an executable trigger (=, +, -, @, \t, \r)
 * and is not a strictly numeric value (such as a negative P&L price -120.50),
 * a single quote (') is prepended to neutralize execution.
 */
export function sanitizeCsvCell(cell: string): string {
  if (typeof cell !== "string" || !cell) {
    return cell;
  }

  // Handle cells that may already be wrapped in quotes
  const isQuoted = cell.length >= 2 && cell.startsWith('"') && cell.endsWith('"');
  const inner = isQuoted ? cell.slice(1, -1) : cell;

  // Tab or carriage return at cell start is a direct DDE/formula trigger
  if (inner.startsWith("\t") || inner.startsWith("\r")) {
    const neutralized = `'${inner}`;
    return isQuoted ? `"${neutralized.replace(/"/g, '""')}"` : neutralized;
  }

  const trimmed = inner.trim();

  if (DANGEROUS_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
    // Legitimate numeric negative or positive prices (e.g. -200.50, +50) should remain unchanged
    if (NUMERIC_PATTERN.test(trimmed)) {
      return cell;
    }
    // Neutralize formula execution by prepending a single quote
    const neutralized = `'${inner}`;
    return isQuoted ? `"${neutralized.replace(/"/g, '""')}"` : neutralized;
  }

  return cell;
}

/**
 * Parses and sanitizes a complete CSV string, respecting escaped quotes.
 * Returns the sanitized string and a count of how many cells were flagged.
 */
export function sanitizeCsvContent(rawCsv: string): {
  sanitized: string;
  flaggedCount: number;
} {
  if (!rawCsv) {
    return { sanitized: "", flaggedCount: 0 };
  }

  let flaggedCount = 0;
  const lines = rawCsv.split(/\r?\n/);

  const sanitizedLines = lines.map((line) => {
    if (!line.trim()) {
      return line;
    }

    // Parse CSV line preserving quoted cells that may contain commas
    const cells = splitCsvLine(line);
    const sanitizedCells = cells.map((cell) => {
      const sanitized = sanitizeCsvCell(cell);
      if (sanitized !== cell) {
        flaggedCount++;
      }
      return sanitized;
    });

    return sanitizedCells.join(",");
  });

  return {
    sanitized: sanitizedLines.join("\n"),
    flaggedCount,
  };
}

/**
 * Splits a CSV line into cells while respecting quotes.
 */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '""';
        i++; // Skip escaped quote
      } else {
        inQuotes = !inQuotes;
        current += char;
      }
    } else if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells;
}
