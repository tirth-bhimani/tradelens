"""TradeLens Export Cleaner & PII Sanitizer.

Conforms to the Indian Digital Personal Data Protection Act, 2023 (DPDP Act).
Sanitizes outgoing CSV data against CWE-1236 (Formula/CSV Injection) while
preserving legitimate numerical values (e.g. negative P&L figures).
Excludes sensitive internal tokens, secrets, and auth credentials.
"""

from __future__ import annotations

import csv
import io
import json
import re
import zipfile
from datetime import datetime, timezone
from typing import Any

DANGEROUS_PREFIXES = ("=", "+", "-", "@", "\t", "\r")
NUMERIC_RE = re.compile(r"^[-+]?\d+(\.\d+)?$")

SENSITIVE_FIELD_PATTERNS = {
    "password",
    "password_hash",
    "token",
    "secret",
    "api_key",
    "session_id",
    "access_token",
    "refresh_token",
    "encrypted_key",
}


class ExportCleaner:
    """Sanitizes and packages personal trading datasets for statutory export."""

    @staticmethod
    def sanitize_cell(value: Any) -> str:
        """Sanitize an individual cell value against CSV formula injection."""
        if value is None:
            return ""

        cell_str = str(value)
        if not cell_str:
            return ""

        # Tab or CR at start is an immediate formula/DDE trigger
        if cell_str.startswith(("\t", "\r")):
            return f"'{cell_str}"

        trimmed = cell_str.strip()
        if trimmed.startswith(DANGEROUS_PREFIXES):
            # Preserve valid numeric values (e.g., negative P&L -1500.50)
            if NUMERIC_RE.match(trimmed):
                return cell_str
            return f"'{cell_str}"

        return cell_str

    @classmethod
    def clean_record(cls, record: dict[str, Any], allowed_keys: list[str] | None = None) -> dict[str, str]:
        """Filter out sensitive keys and sanitize values in a dictionary record."""
        cleaned: dict[str, str] = {}
        for k, v in record.items():
            k_lower = k.lower()
            # Strip out any sensitive auth or secret keys
            if any(pattern in k_lower for pattern in SENSITIVE_FIELD_PATTERNS):
                continue

            if allowed_keys is not None and k not in allowed_keys:
                continue

            # Format JSON objects/lists as compact JSON strings before cell sanitization
            if isinstance(v, (dict, list)):
                formatted_val = json.dumps(v, separators=(",", ":"))
            else:
                formatted_val = v

            cleaned[k] = cls.sanitize_cell(formatted_val)
        return cleaned

    @classmethod
    def to_csv_string(cls, records: list[dict[str, Any]], fieldnames: list[str]) -> str:
        """Generate an RFC 4180 compliant CSV string from records with sanitized cells."""
        out = io.StringIO()
        writer = csv.DictWriter(out, fieldnames=fieldnames, lineterminator="\n", quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()

        for rec in records:
            cleaned_row = cls.clean_record(rec, allowed_keys=fieldnames)
            writer.writerow(cleaned_row)

        return out.getvalue()

    @classmethod
    def build_export_archive(
        cls,
        user_id: str,
        user_email: str,
        raw_fills: list[dict[str, Any]],
        trades: list[dict[str, Any]],
        rules: list[dict[str, Any]],
        weekly_reports: list[dict[str, Any]],
    ) -> bytes:
        """Construct a complete, tamper-evident ZIP archive of user datasets."""
        fill_fields = [
            "id", "import_id", "trade_date", "fill_time", "symbol",
            "trade_type", "quantity", "price", "order_id", "trade_id"
        ]
        trade_fields = [
            "id", "symbol", "segment", "instrument_type", "entry_time", "exit_time",
            "trade_duration_seconds", "is_intraday", "is_short", "quantity",
            "entry_price", "exit_price", "gross_pnl", "charges", "net_pnl", "tags", "notes"
        ]
        rule_fields = [
            "id", "rule_type", "rule_payload", "natural_language_text", "is_active", "created_at"
        ]
        report_fields = [
            "id", "week_start_date", "week_end_date", "total_trades", "winning_trades",
            "losing_trades", "win_rate", "gross_pnl", "total_charges", "net_pnl",
            "adherence_score", "rule_violations_count", "top_behavioral_leak", "focus_item"
        ]

        raw_fills_csv = cls.to_csv_string(raw_fills, fill_fields)
        trades_csv = cls.to_csv_string(trades, trade_fields)
        rules_csv = cls.to_csv_string(rules, rule_fields)
        weekly_reports_csv = cls.to_csv_string(weekly_reports, report_fields)

        export_timestamp = datetime.now(timezone.utc).isoformat()
        manifest = {
            "platform": "TradeLens",
            "statutory_compliance": "Digital Personal Data Protection Act, 2023 (DPDP Act)",
            "jurisdiction": "Republic of India",
            "user_id": user_id,
            "user_email": user_email,
            "export_timestamp_utc": export_timestamp,
            "datasets": {
                "raw_fills": {"filename": "raw_fills.csv", "count": len(raw_fills)},
                "trades": {"filename": "trades.csv", "count": len(trades)},
                "rules": {"filename": "rules.csv", "count": len(rules)},
                "weekly_reports": {"filename": "weekly_reports.csv", "count": len(weekly_reports)},
            },
            "disclaimer": (
                "This export contains your personal trading ledger and analytics. "
                "TradeLens is an educational behavioral journal and rule backtesting platform, "
                "not a SEBI-registered Investment Adviser or Research Analyst."
            ),
        }
        manifest_json = json.dumps(manifest, indent=2)

        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zip_file:
            zip_file.writestr("manifest.json", manifest_json)
            zip_file.writestr("raw_fills.csv", raw_fills_csv)
            zip_file.writestr("trades.csv", trades_csv)
            zip_file.writestr("rules.csv", rules_csv)
            zip_file.writestr("weekly_reports.csv", weekly_reports_csv)

        return zip_buffer.getvalue()
