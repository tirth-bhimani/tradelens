"""Ingestion Validation and Deduplication Service."""

from __future__ import annotations

from typing import Any, Callable, Literal, Optional
from uuid import UUID

from app.models.fills import RawFillCreate
from app.models.ingestion import IngestionSummary, IssueType, RowIssue


class IngestionValidator:
    """Validates and deduplicates trade fills before database commitment.

    Supports dependency injection for database lookups and fill persistence
    to enable fast, isolated in-memory unit testing.
    """

    def __init__(
        self,
        existing_trade_ids_fetcher: Optional[Callable[[UUID, list[str]], set[str]]] = None,
        fill_committer: Optional[Callable[[UUID, UUID, list[RawFillCreate]], None]] = None,
    ) -> None:
        self._fetch_existing = existing_trade_ids_fetcher
        self._commit_fills = fill_committer

    def process(
        self,
        user_id: UUID,
        import_id: UUID,
        broker: str,
        file_name: str,
        fills: list[RawFillCreate],
        parse_errors: Optional[list[dict[str, Any]]] = None,
    ) -> IngestionSummary:
        """Filter out duplicate trade IDs and collect row-by-row audit issues."""
        parse_errors = parse_errors or []

        existing_ids: set[str] = set()
        if self._fetch_existing:
            all_trade_ids = [f.trade_id for f in fills if f.trade_id]
            if all_trade_ids:
                existing_ids = set(self._fetch_existing(user_id, all_trade_ids))

        unique_fills: list[RawFillCreate] = []
        issues: list[RowIssue] = []

        # 1. Map parsing errors into standardized RowIssues
        for err in parse_errors:
            err_msg = str(err.get("error", "Failed to parse trade row"))
            issue_type: IssueType = (
                "CORRUPT_DATA"
                if "corrupt" in err_msg.lower() or "invalid" in err_msg.lower()
                else "INVALID_FORMAT"
            )
            issues.append(
                RowIssue(
                    row_index=err.get("row_index"),
                    issue_type=issue_type,
                    message=err_msg,
                    raw_snippet=err.get("raw_row"),
                )
            )

        # 2. Deduplicate fills against existing trade IDs and within-batch duplicates
        seen_in_batch: set[str] = set()
        for idx, fill in enumerate(fills, start=1):
            if fill.trade_id in existing_ids:
                issues.append(
                    RowIssue(
                        row_index=idx,
                        issue_type="DUPLICATE_FILL",
                        message=f"Fill with trade_id '{fill.trade_id}' already exists in your journal. Skipped.",
                        trade_id=fill.trade_id,
                    )
                )
            elif fill.trade_id in seen_in_batch:
                issues.append(
                    RowIssue(
                        row_index=idx,
                        issue_type="DUPLICATE_FILL",
                        message=f"Duplicate trade_id '{fill.trade_id}' found multiple times in the same CSV file. Skipped.",
                        trade_id=fill.trade_id,
                    )
                )
            else:
                seen_in_batch.add(fill.trade_id)
                unique_fills.append(fill)

        # 3. Commit unique fills if committer provided
        if self._commit_fills and unique_fills:
            self._commit_fills(import_id, user_id, unique_fills)

        total_rows = len(fills) + len(parse_errors)
        imported_rows = len(unique_fills)
        skipped_rows = total_rows - imported_rows

        # Status: 'completed' if file processed cleanly (even if 0 new fills due to 100% duplicates).
        # Status: 'failed' only when 0 fills were imported and total_rows == len(parse_errors) (unparseable).
        status: Literal["completed", "failed"]
        if imported_rows > 0:
            status = "completed"
        elif total_rows > 0 and len(fills) > 0 and len(parse_errors) == 0:
            status = "completed"  # 100% duplicate file processed without parse errors
        else:
            status = "failed"

        return IngestionSummary(
            import_id=import_id,
            user_id=user_id,
            broker=broker,
            file_name=file_name,
            status=status,
            total_rows=total_rows,
            imported_rows=imported_rows,
            skipped_rows=skipped_rows,
            error_report=issues,
        )
