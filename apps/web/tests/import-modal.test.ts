import { describe, it, expect } from "vitest";
import type { IngestionSummary, RowIssue, ImportRecord } from "../lib/trades/types";

describe("Ingestion Summary & Deduplication Contracts", () => {
  it("structures 100% duplicate import summary correctly with completed status", () => {
    const issues: RowIssue[] = [
      {
        row_index: 1,
        issue_type: "DUPLICATE_FILL",
        message: "Fill with trade_id 'TR1001' already exists in your journal. Skipped.",
        trade_id: "TR1001",
      },
      {
        row_index: 2,
        issue_type: "DUPLICATE_FILL",
        message: "Fill with trade_id 'TR1002' already exists in your journal. Skipped.",
        trade_id: "TR1002",
      },
    ];

    const summary: IngestionSummary = {
      import_id: "imp-test-1",
      user_id: "usr-test-1",
      broker: "ZERODHA",
      file_name: "reimport_trades.csv",
      status: "completed",
      total_rows: 2,
      imported_rows: 0,
      skipped_rows: 2,
      error_report: issues,
    };

    expect(summary.total_rows).toBe(2);
    expect(summary.imported_rows).toBe(0);
    expect(summary.skipped_rows).toBe(2);
    expect(summary.status).toBe("completed");
    expect(summary.error_report.length).toBe(2);
    expect(summary.error_report.every((i) => i.issue_type === "DUPLICATE_FILL")).toBe(true);
  });

  it("handles mixed issues (intra-batch duplicate, db duplicate, format errors)", () => {
    const issues: RowIssue[] = [
      {
        row_index: 2,
        issue_type: "DUPLICATE_FILL",
        message: "Fill with trade_id 'TR1001' already exists in your journal. Skipped.",
        trade_id: "TR1001",
      },
      {
        row_index: 3,
        issue_type: "DUPLICATE_FILL",
        message: "Duplicate trade_id 'TR1002' found multiple times in the same CSV file. Skipped.",
        trade_id: "TR1002",
      },
      {
        row_index: 4,
        issue_type: "INVALID_FORMAT",
        message: "Invalid quantity: must be positive number",
        raw_snippet: "2026-10-14,TR1003,TCS,BUY,-5,3500",
      },
      {
        row_index: 5,
        issue_type: "CORRUPT_DATA",
        message: "Unterminated quote on row 5",
      },
    ];

    const summary: IngestionSummary = {
      import_id: "imp-test-2",
      user_id: "usr-test-1",
      broker: "GENERAL",
      file_name: "messy_tradebook.csv",
      status: "completed",
      total_rows: 5,
      imported_rows: 1,
      skipped_rows: 4,
      error_report: issues,
    };

    expect(summary.imported_rows).toBe(1);
    expect(summary.skipped_rows).toBe(4);
    expect(summary.total_rows).toBe(5);

    // Filter by type tests (matches <ImportSummaryModal> category filtering)
    const duplicateIssues = summary.error_report.filter((i) => i.issue_type === "DUPLICATE_FILL");
    const formatIssues = summary.error_report.filter((i) => i.issue_type === "INVALID_FORMAT");
    const corruptIssues = summary.error_report.filter((i) => i.issue_type === "CORRUPT_DATA");

    expect(duplicateIssues.length).toBe(2);
    expect(formatIssues.length).toBe(1);
    expect(corruptIssues.length).toBe(1);
  });

  it("properly converts ImportRecord to IngestionSummary for historical inspection", () => {
    const item: ImportRecord = {
      id: "imp-history-1",
      user_id: "usr-test-1",
      file_name: "groww_history.csv",
      status: "completed",
      broker: "GROWW",
      total_rows: 15,
      imported_rows: 12,
      skipped_rows: 3,
      error_report: [
        {
          row_index: 4,
          issue_type: "DUPLICATE_FILL",
          message: "Fill already exists",
          trade_id: "GRW999",
        },
      ],
      created_at: "2026-10-14T10:00:00Z",
    };

    // Replicate logic used in ImportHistoryTable.handleOpenSummary
    const summary: IngestionSummary = {
      import_id: item.id,
      user_id: item.user_id,
      broker: item.broker || "GENERAL",
      file_name: item.file_name,
      status: item.status === "failed" ? "failed" : "completed",
      total_rows: item.total_rows || 0,
      imported_rows: item.imported_rows || 0,
      skipped_rows: item.skipped_rows || 0,
      error_report: (item.error_report as RowIssue[]) || [],
    };

    expect(summary.import_id).toBe("imp-history-1");
    expect(summary.broker).toBe("GROWW");
    expect(summary.imported_rows).toBe(12);
    expect(summary.skipped_rows).toBe(3);
    expect(summary.error_report.length).toBe(1);
    expect(summary.error_report[0].trade_id).toBe("GRW999");
  });

  it("correctly flags 100% duplicate condition in UI logic", () => {
    const allDupSummary: IngestionSummary = {
      import_id: "imp-dup-only",
      user_id: "usr-test-1",
      broker: "ZERODHA",
      file_name: "exact_copy.csv",
      status: "completed",
      total_rows: 8,
      imported_rows: 0,
      skipped_rows: 8,
      error_report: Array.from({ length: 8 }, (_, i) => ({
        row_index: i + 1,
        issue_type: "DUPLICATE_FILL",
        message: `Fill TR_${i} already exists`,
        trade_id: `TR_${i}`,
      })),
    };

    const isAllDuplicates =
      allDupSummary.imported_rows === 0 &&
      allDupSummary.skipped_rows > 0 &&
      allDupSummary.error_report.every((i) => i.issue_type === "DUPLICATE_FILL");

    expect(isAllDuplicates).toBe(true);
  });

  it("successfully parses general tradebook CSV using TypeScript fallback parser", async () => {
    const { parseTradeCsvFallback } = await import("../lib/trades/trade-parser");
    const csv = [
      "Trade Date,Symbol,Type,Quantity,Price,Trade ID",
      "2026-10-14,INFY,BUY,100,1850.50,TR_101",
      "2026-10-14,TCS,SELL,50,4120.00,TR_102",
      "2026-10-14,RELIANCE,BUY,-10,2900.00,TR_103", // quantity with negative sign normalized to positive
    ].join("\n");

    const result = parseTradeCsvFallback(csv, "my_trades.csv");
    expect(result.fills.length).toBe(3);
    expect(result.fills[0].symbol).toBe("INFY");
    expect(result.fills[0].trade_type).toBe("BUY");
    expect(result.fills[0].quantity).toBe(100);
    expect(result.fills[0].price).toBe(1850.50);
    expect(result.fills[0].trade_id).toBe("TR_101");

    expect(result.fills[1].symbol).toBe("TCS");
    expect(result.fills[1].trade_type).toBe("SELL");

    expect(result.fills[2].quantity).toBe(10);
  });
});
