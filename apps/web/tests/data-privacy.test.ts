import { describe, it, expect, vi } from "vitest";
import {
  sanitizeCsvField,
  stripSensitiveFields,
  formatCsv,
} from "../lib/privacy/export-sanitizer";
import {
  createZipArchive,
  generateUserExportZip,
} from "../lib/privacy/export-generator";
import { deleteAccountAction } from "../lib/privacy/deletion-actions";

// Mock Supabase Server client for testing deletion actions
vi.mock("@/lib/supabase/server", () => {
  return {
    createClient: () => ({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: "test-user-id", email: "trader@test.com" },
          },
        }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
      storage: {
        from: () => ({
          list: vi.fn().mockResolvedValue({ data: [{ name: "import1.csv" }] }),
          remove: vi.fn().mockResolvedValue({ data: [] }),
        }),
      },
      from: () => ({
        delete: () => ({
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
        }),
      }),
    }),
  };
});

describe("CSV Formula Injection Sanitizer (CWE-1236)", () => {
  it("prepends a single quote to malicious spreadsheet formulas", () => {
    expect(sanitizeCsvField("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
    expect(sanitizeCsvField("@cmd|'/c calc'!A0")).toBe("'@cmd|'/c calc'!A0");
    expect(sanitizeCsvField("+123*calc()")).toBe("'+123*calc()");
    expect(sanitizeCsvField("-cmd|'/c calc'!A0")).toBe("'-cmd|'/c calc'!A0");
    expect(sanitizeCsvField("\tDDE_LINK")).toBe("'\tDDE_LINK");
    expect(sanitizeCsvField("\r=2+5")).toBe('"\'\r=2+5"');
  });

  it("preserves valid numerical figures without prepending quote", () => {
    expect(sanitizeCsvField("-1500.50")).toBe("-1500.50");
    expect(sanitizeCsvField("+250.00")).toBe("+250.00");
    expect(sanitizeCsvField("-50")).toBe("-50");
    expect(sanitizeCsvField("0")).toBe("0");
    expect(sanitizeCsvField(1234.56)).toBe("1234.56");
  });

  it("handles null, undefined, and normal text properly", () => {
    expect(sanitizeCsvField(null)).toBe("");
    expect(sanitizeCsvField(undefined)).toBe("");
    expect(sanitizeCsvField("NIFTY 24500 CE")).toBe("NIFTY 24500 CE");
  });

  it("escapes CSV delimiters and quotes according to RFC 4180", () => {
    expect(sanitizeCsvField('Target "Hit", Booked')).toBe('"Target ""Hit"", Booked"');
    expect(sanitizeCsvField("Line1\nLine2")).toBe('"Line1\nLine2"');
  });
});

describe("PII & Sensitive Field Stripper", () => {
  it("strips authentication credentials and secret keys from record", () => {
    const raw = {
      id: "tr-001",
      symbol: "BANKNIFTY",
      password_hash: "$2b$12$...",
      access_token: "secret_123",
      api_key: "key_xyz",
      session_id: "sess_456",
      gross_pnl: "4500.00",
    };

    const cleaned = stripSensitiveFields(raw);
    expect(cleaned.id).toBe("tr-001");
    expect(cleaned.symbol).toBe("BANKNIFTY");
    expect(cleaned.gross_pnl).toBe("4500.00");
    expect(cleaned.password_hash).toBeUndefined();
    expect(cleaned.access_token).toBeUndefined();
    expect(cleaned.api_key).toBeUndefined();
    expect(cleaned.session_id).toBeUndefined();
  });
});

describe("RFC 4180 CSV Formatter", () => {
  it("formats records into valid CSV string with sanitized cells", () => {
    const records = [
      { symbol: "RELIANCE", gross_pnl: "1500.00", notes: "Breakout" },
      { symbol: "TCS", gross_pnl: "-450.00", notes: "=SUM(1+1)" },
    ];
    const csv = formatCsv(records, ["symbol", "gross_pnl", "notes"]);
    const lines = csv.trim().split("\n");

    expect(lines[0]).toBe("symbol,gross_pnl,notes");
    expect(lines[1]).toBe("RELIANCE,1500.00,Breakout");
    expect(lines[2]).toBe("TCS,-450.00,'=SUM(1+1)");
  });
});

describe("Zero-Dependency PKZIP Generator", () => {
  it("constructs a valid ZIP archive with standard PK binary signatures", () => {
    const files = [
      { name: "test1.txt", content: "Hello world" },
      { name: "test2.csv", content: "symbol,pnl\nNIFTY,500" },
    ];

    const zipBuffer = createZipArchive(files);
    expect(Buffer.isBuffer(zipBuffer)).toBe(true);
    expect(zipBuffer.length).toBeGreaterThan(0);

    // Verify PK Local File Header signature (0x04034b50) at offset 0
    expect(zipBuffer.readUInt32LE(0)).toBe(0x04034b50);
  });

  it("generates a full user data export ZIP with manifest and datasets", () => {
    const zip = generateUserExportZip({
      userId: "u-123",
      userEmail: "trader@example.com",
      rawFills: [{ id: "f-1", symbol: "NIFTY", price: "24500" }],
      trades: [{ id: "t-1", symbol: "NIFTY", net_pnl: "1200.00" }],
      rules: [{ id: "r-1", rule_type: "MAX_LOSS" }],
      weeklyReports: [{ id: "w-1", week_start_date: "2026-10-12" }],
    });

    expect(Buffer.isBuffer(zip)).toBe(true);
    expect(zip.length).toBeGreaterThan(200);
    // Verify PK signature
    expect(zip.readUInt32LE(0)).toBe(0x04034b50);
  });
});

describe("DPDP Act Account Deletion Action", () => {
  it("rejects deletion if confirmation phrase is incorrect", async () => {
    const res = await deleteAccountAction("wrong phrase");
    expect(res.success).toBe(false);
    expect(res.error).toContain("DELETE MY ACCOUNT");
  });

  it("rejects deletion if confirmation phrase is empty", async () => {
    const res = await deleteAccountAction("");
    expect(res.success).toBe(false);
    expect(res.error).toContain("DELETE MY ACCOUNT");
  });

  it("succeeds when confirmation phrase exactly matches 'DELETE MY ACCOUNT'", async () => {
    const res = await deleteAccountAction("DELETE MY ACCOUNT");
    expect(res.success).toBe(true);
    expect(res.error).toBeNull();
  });
});
