"""Unit tests for IngestionValidator service and fill deduplication."""

from datetime import date, datetime
from decimal import Decimal
import uuid
from zoneinfo import ZoneInfo
import pytest

from app.ingestion.validator import IngestionValidator
from app.models.fills import RawFillCreate
from app.models.ingestion import IngestionSummary

IST = ZoneInfo("Asia/Kolkata")


def create_sample_fill(trade_id: str, symbol: str = "RELIANCE", trade_type: str = "BUY") -> RawFillCreate:
    """Helper to create valid test fills."""
    return RawFillCreate(
        symbol=symbol,
        trade_date=date(2024, 3, 1),
        fill_time=datetime(2024, 3, 1, 9, 20, 0, tzinfo=IST),
        trade_type=trade_type,
        quantity=Decimal("10"),
        price=Decimal("2500.00"),
        trade_id=trade_id,
        raw_data={"trade_id": trade_id, "symbol": symbol},
    )


class TestIngestionValidator:
    """Test suite for IngestionValidator deduplication and audit aggregation."""

    def test_all_new_fills_imported_successfully(self):
        user_id = uuid.uuid4()
        import_id = uuid.uuid4()
        committed_fills: list[RawFillCreate] = []

        def mock_fetch(uid, tids):
            return set()  # No existing trade IDs

        def mock_commit(iid, uid, fills):
            committed_fills.extend(fills)

        validator = IngestionValidator(
            existing_trade_ids_fetcher=mock_fetch,
            fill_committer=mock_commit,
        )

        fills = [
            create_sample_fill("TRD001", "RELIANCE"),
            create_sample_fill("TRD002", "TCS"),
            create_sample_fill("TRD003", "INFY"),
        ]

        summary: IngestionSummary = validator.process(
            user_id=user_id,
            import_id=import_id,
            broker="GENERAL",
            file_name="tradebook.csv",
            fills=fills,
        )

        assert summary.status == "completed"
        assert summary.total_rows == 3
        assert summary.imported_rows == 3
        assert summary.skipped_rows == 0
        assert len(summary.error_report) == 0
        assert len(committed_fills) == 3

    def test_identical_reimport_all_duplicates_marked_completed(self):
        user_id = uuid.uuid4()
        import_id = uuid.uuid4()
        committed_fills: list[RawFillCreate] = []

        fills = [
            create_sample_fill("TRD001"),
            create_sample_fill("TRD002"),
        ]

        # Simulate that TRD001 and TRD002 already exist in the user's database
        def mock_fetch(uid, tids):
            return {"TRD001", "TRD002"}

        def mock_commit(iid, uid, f):
            committed_fills.extend(f)

        validator = IngestionValidator(
            existing_trade_ids_fetcher=mock_fetch,
            fill_committer=mock_commit,
        )

        summary = validator.process(
            user_id=user_id,
            import_id=import_id,
            broker="ZERODHA",
            file_name="reimport.csv",
            fills=fills,
        )

        assert summary.status == "completed"  # Benign duplicate import
        assert summary.total_rows == 2
        assert summary.imported_rows == 0
        assert summary.skipped_rows == 2
        assert len(summary.error_report) == 2
        assert all(issue.issue_type == "DUPLICATE_FILL" for issue in summary.error_report)
        assert len(committed_fills) == 0  # No double insert

    def test_partial_overlap_deduplication(self):
        user_id = uuid.uuid4()
        import_id = uuid.uuid4()
        committed_fills: list[RawFillCreate] = []

        fills = [
            create_sample_fill("TRD001", "HDFCBANK"),
            create_sample_fill("TRD002", "ICICIBANK"),
            create_sample_fill("TRD003", "SBIN"),
        ]

        # TRD001 exists; TRD002 and TRD003 are new
        def mock_fetch(uid, tids):
            return {"TRD001"}

        def mock_commit(iid, uid, f):
            committed_fills.extend(f)

        validator = IngestionValidator(
            existing_trade_ids_fetcher=mock_fetch,
            fill_committer=mock_commit,
        )

        summary = validator.process(
            user_id=user_id,
            import_id=import_id,
            broker="UPSTOX",
            file_name="partial.csv",
            fills=fills,
        )

        assert summary.status == "completed"
        assert summary.total_rows == 3
        assert summary.imported_rows == 2
        assert summary.skipped_rows == 1
        assert len(committed_fills) == 2
        assert committed_fills[0].trade_id == "TRD002"
        assert committed_fills[1].trade_id == "TRD003"
        assert summary.error_report[0].trade_id == "TRD001"
        assert summary.error_report[0].issue_type == "DUPLICATE_FILL"

    def test_in_batch_duplicate_collision_prevention(self):
        user_id = uuid.uuid4()
        import_id = uuid.uuid4()
        committed_fills: list[RawFillCreate] = []

        # Single CSV containing the same trade ID repeated twice
        fills = [
            create_sample_fill("TRD_SAME", "INFY"),
            create_sample_fill("TRD_SAME", "INFY"),
        ]

        def mock_fetch(uid, tids):
            return set()  # Neither is in DB initially

        def mock_commit(iid, uid, f):
            committed_fills.extend(f)

        validator = IngestionValidator(
            existing_trade_ids_fetcher=mock_fetch,
            fill_committer=mock_commit,
        )

        summary = validator.process(
            user_id=user_id,
            import_id=import_id,
            broker="GROWW",
            file_name="duplicate_within_file.csv",
            fills=fills,
        )

        assert summary.status == "completed"
        assert summary.total_rows == 2
        assert summary.imported_rows == 1  # Only first occurrence imported
        assert summary.skipped_rows == 1
        assert len(committed_fills) == 1
        assert summary.error_report[0].issue_type == "DUPLICATE_FILL"
        assert "multiple times" in summary.error_report[0].message

    def test_corrupt_rows_isolated_with_valid_fills(self):
        user_id = uuid.uuid4()
        import_id = uuid.uuid4()
        committed_fills: list[RawFillCreate] = []

        fills = [create_sample_fill("TRD100", "TCS")]
        parse_errors = [
            {"row_index": 2, "error": "Invalid numeric quantity: 'abc'", "raw_row": {"col": "val"}},
            {"row_index": 3, "error": "Corrupt row date format", "raw_row": {}},
        ]

        validator = IngestionValidator(
            existing_trade_ids_fetcher=lambda uid, tids: set(),
            fill_committer=lambda iid, uid, f: committed_fills.extend(f),
        )

        summary = validator.process(
            user_id=user_id,
            import_id=import_id,
            broker="GENERAL",
            file_name="mixed.csv",
            fills=fills,
            parse_errors=parse_errors,
        )

        assert summary.status == "completed"
        assert summary.total_rows == 3
        assert summary.imported_rows == 1
        assert summary.skipped_rows == 2
        assert len(summary.error_report) == 2
        assert summary.error_report[0].row_index == 2
        assert summary.error_report[1].issue_type == "CORRUPT_DATA"

    def test_all_corrupt_rows_marked_failed(self):
        user_id = uuid.uuid4()
        import_id = uuid.uuid4()

        parse_errors = [
            {"row_index": 1, "error": "Unparseable header format"},
            {"row_index": 2, "error": "Corrupt data"},
        ]

        validator = IngestionValidator()
        summary = validator.process(
            user_id=user_id,
            import_id=import_id,
            broker="UNKNOWN",
            file_name="bad.csv",
            fills=[],
            parse_errors=parse_errors,
        )

        assert summary.status == "failed"
        assert summary.total_rows == 2
        assert summary.imported_rows == 0
        assert summary.skipped_rows == 2
