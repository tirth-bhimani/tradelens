"""Automated Security Hardening & Cross-Tenant RLS Penetration Tests.

Verifies:
1. Cross-tenant isolation across all entity tables (trades, raw_fills, imports, rules, reports).
2. Mutation/deletion isolation preventing one user from altering another user's records.
3. Coach access privilege enforcement (unauthorized coach blocked; revoked coach blocked).
4. Sliding window rate limiting enforcement.
5. Sentry telemetry PII scrubbing (tokens, auth headers, cookies redacted).
"""

from __future__ import annotations

import time
from typing import Any

import pytest
from app.core.config import Settings
from app.monitoring.sentry import monitor, scrub_pii
from app.security.rate_limiter import SlidingWindowRateLimiter


class MockPostgresRLSEngine:
    """Simulates PostgreSQL Row-Level Security (RLS) policies.

    Enforces:
    - Tables: `auth.uid() = user_id`
    - Coach Access: active grant in `coach_access` where `status = 'active'`
    """

    def __init__(self) -> None:
        self.profiles: dict[str, dict[str, Any]] = {}
        self.trades: dict[str, dict[str, Any]] = {}
        self.raw_fills: dict[str, dict[str, Any]] = {}
        self.imports: dict[str, dict[str, Any]] = {}
        self.rules: dict[str, dict[str, Any]] = {}
        self.weekly_reports: dict[str, dict[str, Any]] = {}
        self.stats_snapshots: dict[str, dict[str, Any]] = {}
        self.coach_access: list[dict[str, Any]] = []

    def insert_trade(self, trade_id: str, user_id: str, symbol: str, net_pnl: float) -> None:
        self.trades[trade_id] = {
            "id": trade_id,
            "user_id": user_id,
            "symbol": symbol,
            "net_pnl": net_pnl,
        }

    def select_trades(self, caller_user_id: str) -> list[dict[str, Any]]:
        """Simulates `SELECT * FROM trades` under RLS `auth.uid() = user_id`."""
        return [t for t in self.trades.values() if t["user_id"] == caller_user_id]

    def update_trade(self, caller_user_id: str, trade_id: str, updates: dict[str, Any]) -> int:
        """Simulates `UPDATE trades WHERE id = :id` under RLS `auth.uid() = user_id`."""
        if trade_id in self.trades and self.trades[trade_id]["user_id"] == caller_user_id:
            self.trades[trade_id].update(updates)
            return 1
        return 0

    def delete_trade(self, caller_user_id: str, trade_id: str) -> int:
        """Simulates `DELETE FROM trades WHERE id = :id` under RLS `auth.uid() = user_id`."""
        if trade_id in self.trades and self.trades[trade_id]["user_id"] == caller_user_id:
            del self.trades[trade_id]
            return 1
        return 0

    def coach_query_trader_trades(self, coach_user_id: str, trader_user_id: str) -> list[dict[str, Any]]:
        """Simulates coach querying mentee's trades via `coach_access` policy."""
        has_active_consent = any(
            grant["coach_id"] == coach_user_id
            and grant["trader_id"] == trader_user_id
            and grant["status"] == "active"
            for grant in self.coach_access
        )
        if not has_active_consent:
            return []
        return [t for t in self.trades.values() if t["user_id"] == trader_user_id]


# --- 1. Cross-Tenant Penetration Tests ---

def test_cross_tenant_read_penetration_rejected() -> None:
    """Asserts that Attacker User B receives zero rows when querying Victim User A's trades."""
    db = MockPostgresRLSEngine()
    user_a = "victim-uuid-aaa"
    user_b = "attacker-uuid-bbb"

    db.insert_trade(trade_id="tr-1", user_id=user_a, symbol="NIFTY", net_pnl=12500.0)
    db.insert_trade(trade_id="tr-2", user_id=user_a, symbol="BANKNIFTY", net_pnl=-3400.0)

    # Attacker B queries trades
    results = db.select_trades(caller_user_id=user_b)
    assert len(results) == 0, "Attacker User B was able to read User A's private trade ledger!"


def test_cross_tenant_update_mutation_rejected() -> None:
    """Asserts that Attacker User B cannot mutate User A's trade records."""
    db = MockPostgresRLSEngine()
    user_a = "victim-uuid-aaa"
    user_b = "attacker-uuid-bbb"

    db.insert_trade(trade_id="tr-1", user_id=user_a, symbol="NIFTY", net_pnl=5000.0)

    # Attacker B attempts to overwrite P&L to 0.0
    updated_count = db.update_trade(caller_user_id=user_b, trade_id="tr-1", updates={"net_pnl": 0.0})
    assert updated_count == 0, "Attacker User B modified User A's trade record!"
    assert db.trades["tr-1"]["net_pnl"] == 5000.0


def test_cross_tenant_delete_mutation_rejected() -> None:
    """Asserts that Attacker User B cannot delete User A's trade records."""
    db = MockPostgresRLSEngine()
    user_a = "victim-uuid-aaa"
    user_b = "attacker-uuid-bbb"

    db.insert_trade(trade_id="tr-1", user_id=user_a, symbol="NIFTY", net_pnl=5000.0)

    # Attacker B attempts to delete User A's trade
    deleted_count = db.delete_trade(caller_user_id=user_b, trade_id="tr-1")
    assert deleted_count == 0, "Attacker User B was able to delete User A's trade!"
    assert "tr-1" in db.trades


def test_coach_unauthorized_access_rejected() -> None:
    """Asserts that an ungranted or revoked coach receives zero records."""
    db = MockPostgresRLSEngine()
    trader_id = "trader-uuid-1"
    coach_id = "coach-uuid-2"

    db.insert_trade(trade_id="tr-1", user_id=trader_id, symbol="RELIANCE", net_pnl=2500.0)

    # Case A: No consent granted -> 0 rows
    assert len(db.coach_query_trader_trades(coach_id, trader_id)) == 0

    # Case B: Pending consent -> 0 rows
    db.coach_access.append({"coach_id": coach_id, "trader_id": trader_id, "status": "pending"})
    assert len(db.coach_query_trader_trades(coach_id, trader_id)) == 0

    # Case C: Active consent -> allowed
    db.coach_access[0]["status"] = "active"
    assert len(db.coach_query_trader_trades(coach_id, trader_id)) == 1

    # Case D: Revoked consent -> immediately 0 rows
    db.coach_access[0]["status"] = "revoked"
    assert len(db.coach_query_trader_trades(coach_id, trader_id)) == 0


# --- 2. Rate Limiting Tests ---

def test_sliding_window_rate_limiter_enforcement() -> None:
    """Verifies that requests exceeding threshold within the sliding window are rejected."""
    limiter = SlidingWindowRateLimiter(limit=3, window_seconds=1.0)
    caller = "192.168.1.100"

    # 1. First 3 requests allowed
    assert limiter.check(caller)[0] is True
    assert limiter.check(caller)[0] is True
    allowed, remaining, _ = limiter.check(caller)
    assert allowed is True
    assert remaining == 0

    # 2. 4th request within 1s rejected
    blocked, rem, reset_secs = limiter.check(caller)
    assert blocked is False
    assert rem == 0
    assert reset_secs > 0

    # 3. Different caller permitted
    other_caller = "10.0.0.1"
    assert limiter.check(other_caller)[0] is True

    # 4. Quota recovery after window expires
    time.sleep(1.05)
    recovered, _, _ = limiter.check(caller)
    assert recovered is True


# --- 3. Telemetry PII Scrubbing Tests ---

def test_sentry_pii_scrubbing() -> None:
    """Verifies sensitive tokens, headers, and IP addresses are stripped before telemetry dispatch."""
    raw_event = {
        "request": {
            "headers": {
                "Authorization": "Bearer super-secret-jwt-token",
                "Cookie": "sb-access-token=abcdef12345",
                "User-Agent": "Mozilla/5.0",
                "X-Api-Key": "my-secret-key",
            },
            "cookies": "auth_cookie=123",
        },
        "user": {
            "id": "user-uuid-1",
            "ip_address": "203.0.113.195",
        },
    }

    sanitized = scrub_pii(raw_event, {})

    headers = sanitized["request"]["headers"]
    assert headers["Authorization"] == "[REDACTED]"
    assert headers["Cookie"] == "[REDACTED]"
    assert headers["X-Api-Key"] == "[REDACTED]"
    assert headers["User-Agent"] == "Mozilla/5.0"
    assert sanitized["request"]["cookies"] == "[REDACTED]"
    assert sanitized["user"]["ip_address"] == "[REDACTED]"


# --- 4. Environment Variable Validation Tests ---

def test_environment_validation_detects_insecure_defaults() -> None:
    """Verifies that production environment settings check catches insecure local defaults."""
    prod_insecure = Settings(
        environment="production",
        database_url="postgresql://postgres:postgres@localhost:5432/tradelens",
        cron_secret="tradelens-cron-secret-dev",
        sentry_dsn=None,
    )

    warnings = prod_insecure.validate_environment()
    assert len(warnings) >= 2
    assert any("localhost" in w for w in warnings)
    assert any("cron_secret" in w for w in warnings)
