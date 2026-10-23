"""Tests for Task 27: Privacy, Data Export & Cascading Deletion.

Verifies:
1. Formula injection (CWE-1236) neutralization in exported CSV cells.
2. PII / sensitive key stripping from exports.
3. ZIP archive construction and manifest validity.
4. Cascading import deletion and complete account erasure logic.
"""

from __future__ import annotations

import io
import json
import zipfile

import pytest
from app.security.export_cleaner import ExportCleaner


def test_sanitize_cell_formula_injection() -> None:
    """Verifies executable formula prefixes are neutralized with a single quote."""
    assert ExportCleaner.sanitize_cell("=SUM(A1:A10)") == "'=SUM(A1:A10)"
    assert ExportCleaner.sanitize_cell("@cmd|'/c calc'!A0") == "'@cmd|'/c calc'!A0"
    assert ExportCleaner.sanitize_cell("+123*exec()") == "'+123*exec()"
    assert ExportCleaner.sanitize_cell("\tHYPERLINK(\"http://evil.com\")") == "'\tHYPERLINK(\"http://evil.com\")"
    assert ExportCleaner.sanitize_cell("\r=2+5") == "'\r=2+5"


def test_sanitize_cell_preserves_valid_numerics() -> None:
    """Verifies legitimate negative P&L figures and numerical floats are untouched."""
    assert ExportCleaner.sanitize_cell("-1500.50") == "-1500.50"
    assert ExportCleaner.sanitize_cell("+250.00") == "+250.00"
    assert ExportCleaner.sanitize_cell("0.00") == "0.00"
    assert ExportCleaner.sanitize_cell(None) == ""
    assert ExportCleaner.sanitize_cell("NIFTY 24500 CE") == "NIFTY 24500 CE"


def test_clean_record_pii_exclusion() -> None:
    """Verifies sensitive security credentials and session tokens are stripped."""
    dirty_record = {
        "id": "trade-001",
        "symbol": "RELIANCE",
        "net_pnl": "-450.00",
        "password_hash": "$2b$12$e8Yx...",
        "access_token": "bearer-secret-token",
        "notes": "=HYPERLINK(\"http://phish.com\")",
    }
    cleaned = ExportCleaner.clean_record(dirty_record)

    assert "id" in cleaned
    assert "symbol" in cleaned
    assert "net_pnl" in cleaned
    assert "password_hash" not in cleaned
    assert "access_token" not in cleaned
    assert cleaned["net_pnl"] == "-450.00"
    assert cleaned["notes"] == "'=HYPERLINK(\"http://phish.com\")"


def test_to_csv_string() -> None:
    """Verifies CSV generation outputs valid headers and sanitized lines."""
    records = [
        {"symbol": "TCS", "gross_pnl": "1200.00", "notes": "Good breakout"},
        {"symbol": "INFY", "gross_pnl": "-350.25", "notes": "@alert"},
    ]
    csv_str = ExportCleaner.to_csv_string(records, ["symbol", "gross_pnl", "notes"])

    lines = csv_str.strip().split("\n")
    assert lines[0] == "symbol,gross_pnl,notes"
    assert lines[1] == "TCS,1200.00,Good breakout"
    assert lines[2] == "INFY,-350.25,'@alert"


def test_build_export_archive() -> None:
    """Verifies complete ZIP packaging with manifest and all required CSV tables."""
    raw_fills = [
        {
            "id": "fill-1",
            "import_id": "imp-100",
            "trade_date": "2026-10-20",
            "fill_time": "2026-10-20T09:30:00Z",
            "symbol": "BANKNIFTY",
            "trade_type": "BUY",
            "quantity": "15",
            "price": "51200.00",
            "order_id": "ord-1",
            "trade_id": "trd-1",
        }
    ]
    trades = [
        {
            "id": "tr-1",
            "symbol": "BANKNIFTY",
            "segment": "OPTIONS",
            "instrument_type": "CE",
            "entry_time": "2026-10-20T09:30:00Z",
            "exit_time": "2026-10-20T10:15:00Z",
            "trade_duration_seconds": 2700,
            "is_intraday": True,
            "is_short": False,
            "quantity": "15",
            "entry_price": "51200.00",
            "exit_price": "51450.00",
            "gross_pnl": "3750.00",
            "charges": "85.20",
            "net_pnl": "3664.80",
            "tags": ["BREAKOUT"],
            "notes": "Target achieved",
        }
    ]
    rules = [
        {
            "id": "rule-1",
            "rule_type": "MAX_DAILY_LOSS",
            "rule_payload": {"max_loss": 5000},
            "natural_language_text": "Do not lose more than Rs 5000 in a day",
            "is_active": True,
            "created_at": "2026-10-01T00:00:00Z",
        }
    ]
    weekly_reports = [
        {
            "id": "rep-1",
            "week_start_date": "2026-10-12",
            "week_end_date": "2026-10-16",
            "total_trades": 12,
            "winning_trades": 8,
            "losing_trades": 4,
            "win_rate": 66.67,
            "gross_pnl": "14500.00",
            "total_charges": "820.00",
            "net_pnl": "13680.00",
            "adherence_score": 92.5,
            "rule_violations_count": 1,
            "top_behavioral_leak": "OVERTRADING",
            "focus_item": "Cap entries to max 5 per day",
        }
    ]

    zip_bytes = ExportCleaner.build_export_archive(
        user_id="user-xyz-123",
        user_email="trader@example.com",
        raw_fills=raw_fills,
        trades=trades,
        rules=rules,
        weekly_reports=weekly_reports,
    )

    assert isinstance(zip_bytes, bytes)
    assert len(zip_bytes) > 0

    # Read back and inspect archive contents
    with zipfile.ZipFile(io.BytesIO(zip_bytes), mode="r") as zf:
        namelist = zf.namelist()
        assert "manifest.json" in namelist
        assert "raw_fills.csv" in namelist
        assert "trades.csv" in namelist
        assert "rules.csv" in namelist
        assert "weekly_reports.csv" in namelist

        manifest = json.loads(zf.read("manifest.json").decode("utf-8"))
        assert manifest["user_id"] == "user-xyz-123"
        assert manifest["user_email"] == "trader@example.com"
        assert manifest["datasets"]["raw_fills"]["count"] == 1
        assert manifest["datasets"]["trades"]["count"] == 1
        assert manifest["datasets"]["rules"]["count"] == 1
        assert manifest["datasets"]["weekly_reports"]["count"] == 1

        trades_content = zf.read("trades.csv").decode("utf-8")
        assert "BANKNIFTY" in trades_content
        assert "3664.80" in trades_content


class MockDatabase:
    """Mock store simulating multi-tenant relational tables and cascade triggers."""

    def __init__(self) -> None:
        self.profiles: dict[str, dict] = {}
        self.imports: dict[str, dict] = {}
        self.raw_fills: dict[str, dict] = {}
        self.trades: dict[str, dict] = {}
        self.stats_snapshots: dict[str, dict] = {}
        self.rules: dict[str, dict] = {}
        self.weekly_reports: dict[str, dict] = {}

    def delete_import_cascade(self, user_id: str, import_id: str) -> None:
        """Simulates atomic cascading deletion of a single import batch."""
        if import_id in self.imports and self.imports[import_id]["user_id"] == user_id:
            del self.imports[import_id]

        # 1. Cascade trades created by this import
        trades_to_delete = [
            t_id for t_id, t in self.trades.items()
            if t.get("user_id") == user_id and t.get("import_id") == import_id
        ]
        for t_id in trades_to_delete:
            del self.trades[t_id]

        # 2. Cascade raw fills
        fills_to_delete = [
            f_id for f_id, f in self.raw_fills.items()
            if f.get("user_id") == user_id and f.get("import_id") == import_id
        ]
        for f_id in fills_to_delete:
            del self.raw_fills[f_id]

        # 3. Invalidate computed stats snapshots for this user
        snapshots_to_delete = [
            s_id for s_id, s in self.stats_snapshots.items()
            if s.get("user_id") == user_id
        ]
        for s_id in snapshots_to_delete:
            del self.stats_snapshots[s_id]

    def delete_account_cascade(self, user_id: str) -> None:
        """Simulates atomic complete account scrub under DPDP Act 2023 Sec 12(3)."""
        if user_id in self.profiles:
            del self.profiles[user_id]

        for table in (
            self.imports,
            self.raw_fills,
            self.trades,
            self.stats_snapshots,
            self.rules,
            self.weekly_reports,
        ):
            keys_to_delete = [k for k, v in table.items() if v.get("user_id") == user_id]
            for k in keys_to_delete:
                del table[k]


def test_mock_cascade_import_deletion() -> None:
    """Verifies deleting an import clears raw fills, paired trades, and stats snapshots."""
    db = MockDatabase()
    user_id = "user-1"
    imp_1 = "import-1"
    imp_2 = "import-2"

    # Setup 2 imports for same user
    db.imports[imp_1] = {"id": imp_1, "user_id": user_id, "file_name": "zerodha_1.csv"}
    db.imports[imp_2] = {"id": imp_2, "user_id": user_id, "file_name": "zerodha_2.csv"}

    db.raw_fills["fill-1"] = {"id": "fill-1", "user_id": user_id, "import_id": imp_1}
    db.raw_fills["fill-2"] = {"id": "fill-2", "user_id": user_id, "import_id": imp_2}

    db.trades["trade-1"] = {"id": "trade-1", "user_id": user_id, "import_id": imp_1}
    db.trades["trade-2"] = {"id": "trade-2", "user_id": user_id, "import_id": imp_2}

    db.stats_snapshots["snap-1"] = {"id": "snap-1", "user_id": user_id}

    # Delete import-1
    db.delete_import_cascade(user_id=user_id, import_id=imp_1)

    # Assert import-1 and its children are gone
    assert imp_1 not in db.imports
    assert "fill-1" not in db.raw_fills
    assert "trade-1" not in db.trades
    assert "snap-1" not in db.stats_snapshots

    # Assert import-2 and its children remain intact
    assert imp_2 in db.imports
    assert "fill-2" in db.raw_fills
    assert "trade-2" in db.trades


def test_mock_cascade_account_deletion() -> None:
    """Verifies complete account deletion scrubs all tables leaving zero residue."""
    db = MockDatabase()
    target_user = "victim-user"
    other_user = "other-user"

    db.profiles[target_user] = {"id": target_user, "email": "victim@example.com"}
    db.profiles[other_user] = {"id": other_user, "email": "other@example.com"}

    db.trades["t-1"] = {"id": "t-1", "user_id": target_user}
    db.trades["t-2"] = {"id": "t-2", "user_id": other_user}

    db.rules["r-1"] = {"id": "r-1", "user_id": target_user}
    db.rules["r-2"] = {"id": "r-2", "user_id": other_user}

    db.weekly_reports["w-1"] = {"id": "w-1", "user_id": target_user}

    # Hard scrub target_user
    db.delete_account_cascade(target_user)

    assert target_user not in db.profiles
    assert "t-1" not in db.trades
    assert "r-1" not in db.rules
    assert "w-1" not in db.weekly_reports

    # Assert other user is untouched
    assert other_user in db.profiles
    assert "t-2" in db.trades
    assert "r-2" in db.rules
