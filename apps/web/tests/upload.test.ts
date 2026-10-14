import { describe, it, expect } from "vitest";
import {
  sanitizeCsvCell,
  sanitizeCsvContent,
  validateCsvFileMeta,
  MAX_FILE_SIZE_BYTES,
} from "../lib/trades/csv-sanitizer";

describe("CSV Formula Injection Defense Layer (sanitizeCsvCell)", () => {
  it("neutralizes formula execution triggers starting with =", () => {
    expect(sanitizeCsvCell("=1+1")).toBe("'=1+1");
    expect(sanitizeCsvCell("=SUM(A1:B10)")).toBe("'=SUM(A1:B10)");
    expect(sanitizeCsvCell("=cmd|' /C calc'!A0")).toBe("'=cmd|' /C calc'!A0");
  });

  it("neutralizes formula triggers starting with @", () => {
    expect(sanitizeCsvCell("@SUM(A1:A5)")).toBe("'@SUM(A1:A5)");
    expect(sanitizeCsvCell("@cmd")).toBe("'@cmd");
  });

  it("neutralizes formula triggers starting with + or - when non-numeric", () => {
    expect(sanitizeCsvCell("+cmd|' /C calc'")).toBe("'+cmd|' /C calc'");
    expect(sanitizeCsvCell("-2+3*cmd|calc")).toBe("'-2+3*cmd|calc");
    expect(sanitizeCsvCell("-alert(1)")).toBe("'-alert(1)");
  });

  it("preserves legitimate numeric negative and positive numbers", () => {
    expect(sanitizeCsvCell("-150.50")).toBe("-150.50");
    expect(sanitizeCsvCell("+200")).toBe("+200");
    expect(sanitizeCsvCell("-10")).toBe("-10");
    expect(sanitizeCsvCell("24800.75")).toBe("24800.75");
    expect(sanitizeCsvCell("0")).toBe("0");
    expect(sanitizeCsvCell("-0.05")).toBe("-0.05");
  });

  it("preserves standard broker trading symbols and orders", () => {
    expect(sanitizeCsvCell("RELIANCE")).toBe("RELIANCE");
    expect(sanitizeCsvCell("NIFTY24OCT25000CE")).toBe("NIFTY24OCT25000CE");
    expect(sanitizeCsvCell("BUY")).toBe("BUY");
    expect(sanitizeCsvCell("SELL")).toBe("SELL");
    expect(sanitizeCsvCell("2026-10-14")).toBe("2026-10-14");
    expect(sanitizeCsvCell("CNC")).toBe("CNC");
    expect(sanitizeCsvCell("NRML")).toBe("NRML");
  });

  it("neutralizes tab and carriage return injection prefixes", () => {
    expect(sanitizeCsvCell("\t=calc")).toBe("'\t=calc");
    expect(sanitizeCsvCell("\r-calc")).toBe("'\r-calc");
  });
});

describe("Full CSV Content Sanitization (sanitizeCsvContent)", () => {
  it("processes clean tradebook rows without altering data", () => {
    const csv = [
      "trade_date,order_id,symbol,trade_type,quantity,price",
      "2026-10-14,ORD1001,RELIANCE,BUY,50,2950.50",
      "2026-10-14,ORD1002,NIFTY24OCT25000CE,BUY,25,145.20",
      "2026-10-14,ORD1003,NIFTY24OCT25000CE,SELL,25,182.40",
    ].join("\n");

    const result = sanitizeCsvContent(csv);
    expect(result.flaggedCount).toBe(0);
    expect(result.sanitized).toBe(csv);
  });

  it("identifies and neutralizes embedded formula injection payloads", () => {
    const maliciousCsv = [
      "trade_date,order_id,symbol,trade_type,quantity,price",
      "2026-10-14,ORD1001,=cmd|' /C calc'!A0,BUY,50,2950.50",
      "2026-10-14,ORD1002,TCS,@SUM(1+1),25,3850.00",
    ].join("\n");

    const result = sanitizeCsvContent(maliciousCsv);
    expect(result.flaggedCount).toBe(2);
    expect(result.sanitized).toContain("2026-10-14,ORD1001,'=cmd|' /C calc'!A0,BUY,50,2950.50");
    expect(result.sanitized).toContain("2026-10-14,ORD1002,TCS,'@SUM(1+1),25,3850.00");
  });
});

describe("CSV File Metadata Validation (validateCsvFileMeta)", () => {
  it("accepts valid .csv files within size limits", () => {
    const validFile = {
      name: "zerodha_tradebook_2026.csv",
      size: 1024 * 500, // 500 KB
      type: "text/csv",
    };
    expect(validateCsvFileMeta(validFile)).toEqual({ valid: true });
  });

  it("rejects non-CSV file extensions", () => {
    const pdfFile = {
      name: "statement.pdf",
      size: 1024 * 100,
    };
    const res = validateCsvFileMeta(pdfFile);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("Only .csv files are supported");
  });

  it("rejects empty files (0 bytes)", () => {
    const emptyFile = {
      name: "empty.csv",
      size: 0,
    };
    const res = validateCsvFileMeta(emptyFile);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("empty");
  });

  it("rejects files exceeding 25MB limit", () => {
    const largeFile = {
      name: "massive_trades.csv",
      size: MAX_FILE_SIZE_BYTES + 1024,
    };
    const res = validateCsvFileMeta(largeFile);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("exceeds the maximum allowed limit of 25MB");
  });
});
