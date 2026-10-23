"""Unit and integration tests for Weekly Report Engine & Email Delivery (Task 26)."""

from datetime import datetime, timezone
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.reports.email_sender import render_weekly_report_html, send_weekly_report_email
from app.reports.weekly import (
    DailyReportBreakdown,
    WeeklyReportEngine,
    WeeklyReportSummary,
    generate_weekly_focus_item,
)
from app.rules.adherence import SavedRuleDefinition


def test_empty_week_computation():
    """Weekly calculation handles empty trade history cleanly without division errors."""
    summary = WeeklyReportEngine.compute_weekly_summary(
        user_id="user-123",
        week_start_date="2026-10-12",
        week_end_date="2026-10-18",
        trades=[],
        rules=[],
    )
    assert summary.total_trades == 0
    assert summary.winning_trades == 0
    assert summary.win_rate == 0.0
    assert summary.gross_pnl == Decimal("0.00")
    assert summary.total_charges == Decimal("0.00")
    assert summary.net_pnl == Decimal("0.00")
    assert summary.best_day_date is None
    assert summary.worst_day_date is None
    assert summary.adherence_score == 100.00
    assert len(summary.daily_breakdown) == 0
    assert "prepare rulebook watchlists" in summary.focus_item.lower()


def test_weekly_summary_metrics_and_best_worst_day():
    """Correctly aggregates gross/net P&L, charges, win rate, and identifies best/worst day."""
    trades = [
        # Monday Oct 12: 2 winning trades (+₹4,000 net)
        {
            "id": "t1",
            "symbol": "RELIANCE",
            "entry_time": "2026-10-12T09:30:00Z",
            "exit_time": "2026-10-12T10:00:00Z",
            "gross_pnl": "2600.00",
            "charges": "100.00",
            "net_pnl": "2500.00",
            "quantity": "50",
        },
        {
            "id": "t2",
            "symbol": "INFY",
            "entry_time": "2026-10-12T11:00:00Z",
            "exit_time": "2026-10-12T11:30:00Z",
            "gross_pnl": "1600.00",
            "charges": "100.00",
            "net_pnl": "1500.00",
            "quantity": "50",
        },
        # Wednesday Oct 14: 1 losing trade (-₹3,000 net)
        {
            "id": "t3",
            "symbol": "TCS",
            "entry_time": "2026-10-14T10:00:00Z",
            "exit_time": "2026-10-14T10:45:00Z",
            "gross_pnl": "-2800.00",
            "charges": "200.00",
            "net_pnl": "-3000.00",
            "quantity": "25",
        },
        # Friday Oct 16: 1 small winning trade (+₹500 net)
        {
            "id": "t4",
            "symbol": "HDFCBANK",
            "entry_time": "2026-10-16T14:00:00Z",
            "exit_time": "2026-10-16T14:30:00Z",
            "gross_pnl": "550.00",
            "charges": "50.00",
            "net_pnl": "500.00",
            "quantity": "10",
        },
    ]

    summary = WeeklyReportEngine.compute_weekly_summary(
        user_id="user-456",
        week_start_date="2026-10-12",
        week_end_date="2026-10-18",
        trades=trades,
    )

    assert summary.total_trades == 4
    assert summary.winning_trades == 3
    assert summary.losing_trades == 1
    assert summary.win_rate == 75.0
    # Gross = 2600 + 1600 - 2800 + 550 = 1950.00
    assert summary.gross_pnl == Decimal("1950.00")
    # Charges = 100 + 100 + 200 + 50 = 450.00
    assert summary.total_charges == Decimal("450.00")
    # Net = 1950 - 450 = 1500.00
    assert summary.net_pnl == Decimal("1500.00")

    # Best day is Monday Oct 12 (+₹4,000.00)
    assert summary.best_day_date == "2026-10-12"
    assert summary.best_day_pnl == Decimal("4000.00")

    # Worst day is Wednesday Oct 14 (-₹3,000.00)
    assert summary.worst_day_date == "2026-10-14"
    assert summary.worst_day_pnl == Decimal("-3000.00")

    assert len(summary.daily_breakdown) == 3


def test_rule_adherence_and_focus_item_priorities():
    """Focus recommendation changes dynamically based on adherence and tilt."""
    # 1. Low adherence triggers cool-off focus item
    focus1 = generate_weekly_focus_item(
        adherence_score=60.0,
        rule_violations=4,
        top_leak=None,
        charges_ratio=0.10,
        net_pnl=Decimal("-1000.00"),
        total_trades=10,
    )
    assert "mandatory 15-minute cool-off" in focus1

    # 2. Revenge trading leak triggers max trades cap focus item
    focus2 = generate_weekly_focus_item(
        adherence_score=85.0,
        rule_violations=1,
        top_leak="Re-entry Tilt / Revenge Trading",
        charges_ratio=0.10,
        net_pnl=Decimal("-2500.00"),
        total_trades=15,
    )
    assert "maximum of 3 trades per day" in focus2

    # 3. Size creep triggers static sizing focus item
    focus3 = generate_weekly_focus_item(
        adherence_score=90.0,
        rule_violations=0,
        top_leak="Position Size Creep",
        charges_ratio=0.10,
        net_pnl=Decimal("-1200.00"),
        total_trades=8,
    )
    assert "lock in static lot sizing" in focus3.lower()

    # 4. High charges drag triggers churn focus item
    focus4 = generate_weekly_focus_item(
        adherence_score=95.0,
        rule_violations=0,
        top_leak=None,
        charges_ratio=0.35,  # 35% charges
        net_pnl=Decimal("1500.00"),
        total_trades=20,
    )
    assert "charges consumed over 25%" in focus4.lower()

    # 5. Profitable, disciplined week
    focus5 = generate_weekly_focus_item(
        adherence_score=95.0,
        rule_violations=0,
        top_leak=None,
        charges_ratio=0.10,
        net_pnl=Decimal("8500.00"),
        total_trades=12,
    )
    assert "excellent discipline" in focus5.lower()


def test_responsive_html_email_generation():
    """Renders valid HTML email containing key weekly metrics and styling."""
    summary = WeeklyReportSummary(
        user_id="user-999",
        week_start_date="2026-10-12",
        week_end_date="2026-10-18",
        total_trades=5,
        winning_trades=4,
        losing_trades=1,
        win_rate=80.0,
        gross_pnl=Decimal("12000.00"),
        total_charges=Decimal("800.00"),
        net_pnl=Decimal("11200.00"),
        best_day_date="2026-10-13",
        best_day_pnl=Decimal("6500.00"),
        worst_day_date="2026-10-15",
        worst_day_pnl=Decimal("-1200.00"),
        adherence_score=92.5,
        rule_violations_count=1,
        top_behavioral_leak="Re-entry Tilt / Revenge Trading",
        top_leak_loss=Decimal("1200.00"),
        focus_item="Cap trading to a strict maximum of 3 trades per day.",
    )

    html = render_weekly_report_html(summary, user_name="Alex Trader")

    assert "<!DOCTYPE html>" in html
    assert "TradeLens" in html
    assert "Hello Alex Trader" in html
    assert "+₹11,200.00" in html
    assert "80.0%" in html
    assert "92.5%" in html
    assert "Re-entry Tilt / Revenge Trading" in html
    assert "Cap trading to a strict maximum of 3 trades per day." in html
    assert "/settings/notifications" in html


def test_email_dispatch_simulation():
    """When RESEND_API_KEY is not configured, dispatch returns simulated status without error."""
    summary = WeeklyReportSummary(
        user_id="user-777",
        week_start_date="2026-10-12",
        week_end_date="2026-10-18",
        net_pnl=Decimal("5000.00"),
    )

    res = send_weekly_report_email(
        to_email="trader@example.com",
        summary=summary,
        user_name="Trader",
    )

    assert res["status"] == "simulated"
    assert res["to"] == "trader@example.com"
    assert "sim_" in res["id"]


from app.routers.reports import (
    BatchCronRequest,
    ComputeWeeklyReportRequest,
    SendWeeklyReportRequest,
    compute_weekly_report,
    dispatch_weekly_report,
    preview_weekly_report_html,
    run_batch_weekly_cron,
)
from fastapi import HTTPException


def test_reports_api_endpoints():
    """FastAPI reports endpoints calculate, preview, and guard cron batch."""
    # 1. Compute
    compute_req = ComputeWeeklyReportRequest(
        user_id="test-user-api",
        week_start_date="2026-10-12",
        week_end_date="2026-10-18",
        trades=[
            {
                "symbol": "TCS",
                "gross_pnl": "1000.00",
                "charges": "50.00",
                "net_pnl": "950.00",
                "entry_time": "2026-10-13T10:00:00Z",
                "exit_time": "2026-10-13T10:30:00Z",
            }
        ],
        rules=[],
    )
    summary_resp = compute_weekly_report(compute_req)
    assert summary_resp.net_pnl == Decimal("950.00")
    assert summary_resp.total_trades == 1
    assert summary_resp.win_rate == 100.0

    # 2. Preview HTML
    preview_req = SendWeeklyReportRequest(
        to_email="preview@example.com",
        summary=summary_resp,
    )
    preview_resp = preview_weekly_report_html(preview_req)
    assert "<!DOCTYPE html>" in preview_resp["html"]
    assert "+₹950.00" in preview_resp["html"]

    # 3. Cron auth gating
    with pytest.raises(HTTPException) as exc_info:
        run_batch_weekly_cron(
            request=BatchCronRequest(secret="wrong-secret"),
            authorization=None,
        )
    assert exc_info.value.status_code == 401

    cron_ok = run_batch_weekly_cron(
        request=BatchCronRequest(),
        authorization="Bearer tradelens-cron-secret-dev",
    )
    assert cron_ok["status"] == "success"
    assert "cron completed" in cron_ok["message"].lower()

