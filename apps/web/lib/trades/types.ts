export type IssueType = "DUPLICATE_FILL" | "INVALID_FORMAT" | "CORRUPT_DATA" | "SCHEMA_MISMATCH";

export interface RowIssue {
  row_index?: number | null;
  issue_type: IssueType;
  message: string;
  trade_id?: string | null;
  raw_snippet?: Record<string, unknown> | string | null;
}

export interface IngestionSummary {
  import_id: string;
  user_id: string;
  broker: string;
  file_name: string;
  status: "completed" | "failed";
  total_rows: number;
  imported_rows: number;
  skipped_rows: number;
  error_report: RowIssue[];
}

export interface ImportRecord {
  id: string;
  user_id: string;
  broker: string;
  file_name: string;
  status: "uploaded" | "processing" | "completed" | "failed";
  total_rows: number;
  imported_rows: number;
  skipped_rows: number;
  error_report: RowIssue[] | Array<{ warning?: string; error?: string; row?: number }>;
  created_at: string;
}
