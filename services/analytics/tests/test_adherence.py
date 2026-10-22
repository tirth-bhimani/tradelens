"""Unit tests for TradeLens Rule Adherence Evaluation Engine (Task 23)."""

from datetime import datetime, timezone
import pytest
from app.rules.adherence import (
    SavedRuleDefinition,
    evaluate_rulebook_adherence,
)


def test_empty_trades_or_rules():
    """Empty inputs return 100% adherence score without errors."""
    res1 = evaluate_rulebook_adherence([], [])
    assert res1.discipline_score_pct == 100.0
    assert res1.total_trades_evaluated == 0

    res2 = evaluate_rulebook_adherence(
        [{"id": "t1", "entry_time": "2026-09-01T10:00:00Z", "net_pnl": 500}],
        [],
    )
    assert res2.discipline_score_pct == 100.0
    assert res2.total_trades_evaluated == 1


def test_cooldown_after_loss_violation():
    """Detects re-entry within cooldown window after a loss."""
    rules = [
        SavedRuleDefinition(
            id="rule-cd-1",
            rule_type="COOL_OFF_AFTER_LOSS",
            rule_payload={"cooldown_minutes": 15, "trigger_loss_inr": 1000},
            is_active=True,
        )
    ]

    trades = [
        # Loss trade of -₹2,500 exiting at 10:15
        {
            "id": "trade-01",
            "symbol": "NIFTY",
            "entry_time": "2026-09-01T10:00:00+05:30",
            "exit_time": "2026-09-01T10:15:00+05:30",
            "net_pnl": -2500.0,
            "quantity": 50,
        },
        # Re-entry at 10:20 (only 5m later, < 15m cooldown)
        {
            "id": "trade-02",
            "symbol": "NIFTY",
            "entry_time": "2026-09-01T10:20:00+05:30",
            "exit_time": "2026-09-01T10:35:00+05:30",
            "net_pnl": -1800.0,
            "quantity": 50,
        },
        # Safe trade entering at 10:55 (> 15m after 10:35 loss)
        {
            "id": "trade-03",
            "symbol": "NIFTY",
            "entry_time": "2026-09-01T10:55:00+05:30",
            "exit_time": "2026-09-01T11:15:00+05:30",
            "net_pnl": 2200.0,
            "quantity": 50,
        },
    ]

    report = evaluate_rulebook_adherence(trades, rules)

    assert report.total_trades_evaluated == 3
    assert report.total_violating_trades == 1
    assert report.total_adhering_trades == 2
    assert report.discipline_score_pct == 66.7
    assert report.total_avoidable_losses_incurred == 1800.0
    assert len(report.violations) == 1
    assert report.violations[0].trade_id == "trade-02"
    assert report.violations[0].violation_code == "COOLDOWN_VIOLATION"


def test_max_daily_trades_violation():
    """Detects overtrading beyond session cap."""
    rules = [
        SavedRuleDefinition(
            id="rule-cap-1",
            rule_type="MAX_TRADES_PER_DAY",
            rule_payload={"max_trades": 2},
            is_active=True,
        )
    ]

    trades = [
        {"id": "t1", "symbol": "RELIANCE", "entry_time": "2026-09-01T09:30:00+05:30", "net_pnl": 500},
        {"id": "t2", "symbol": "TCS", "entry_time": "2026-09-01T10:30:00+05:30", "net_pnl": 400},
        # Trade 3 breaches cap of 2
        {"id": "t3", "symbol": "INFY", "entry_time": "2026-09-01T11:30:00+05:30", "net_pnl": -1200},
    ]

    report = evaluate_rulebook_adherence(trades, rules)

    assert report.total_trades_evaluated == 3
    assert report.total_violating_trades == 1
    assert report.violations[0].trade_id == "t3"
    assert report.violations[0].violation_code == "OVERTRADING_CAP_EXCEEDED"
    assert report.total_avoidable_losses_incurred == 1200.0


def test_daily_loss_cutoff_violation():
    """Detects trades taken after hitting daily max loss."""
    rules = [
        SavedRuleDefinition(
            id="rule-cutoff-1",
            rule_type="DAILY_LOSS_CUTOFF",
            rule_payload={"max_loss": 5000},
            is_active=True,
        )
    ]

    trades = [
        # Loss of -₹5,500 hits cutoff of ₹5,000
        {"id": "t1", "symbol": "NIFTY", "entry_time": "2026-09-01T09:30:00+05:30", "net_pnl": -5500},
        # Trade taken after daily loss reached
        {"id": "t2", "symbol": "BANKNIFTY", "entry_time": "2026-09-01T11:00:00+05:30", "net_pnl": -3000},
    ]

    report = evaluate_rulebook_adherence(trades, rules)

    assert report.total_violating_trades == 1
    assert report.violations[0].trade_id == "t2"
    assert report.violations[0].violation_code == "DAILY_LOSS_CUTOFF_BREACHED"


def test_paused_rules_are_ignored():
    """Paused rules (is_active=False) do not generate violations."""
    rules = [
        SavedRuleDefinition(
            id="rule-inactive-1",
            rule_type="MAX_TRADES_PER_DAY",
            rule_payload={"max_trades": 1},
            is_active=False,  # Paused
        )
    ]

    trades = [
        {"id": "t1", "symbol": "NIFTY", "entry_time": "2026-09-01T09:30:00+05:30", "net_pnl": 500},
        {"id": "t2", "symbol": "NIFTY", "entry_time": "2026-09-01T10:30:00+05:30", "net_pnl": -500},
    ]

    report = evaluate_rulebook_adherence(trades, rules)

    assert report.total_violating_trades == 0
    assert report.discipline_score_pct == 100.0


def test_adherence_api_endpoint():
    """FastAPI endpoint handler evaluates adherence request synchronously and responds correctly."""
    from app.routers.rules import AdherenceEvaluationRequest, evaluate_adherence_endpoint

    req = AdherenceEvaluationRequest(
        trades=[
            {"id": "t1", "symbol": "RELIANCE", "entry_time": "2026-09-01T09:30:00+05:30", "net_pnl": 500},
            {"id": "t2", "symbol": "TCS", "entry_time": "2026-09-01T10:30:00+05:30", "net_pnl": -500},
        ],
        rules=[
            SavedRuleDefinition(
                id="rule-1",
                rule_type="MAX_TRADES_PER_DAY",
                rule_payload={"max_trades": 1},
                is_active=True,
            )
        ],
    )

    data = evaluate_adherence_endpoint(req)
    assert data.total_trades_evaluated == 2
    assert data.total_violating_trades == 1
    assert data.discipline_score_pct == 50.0

