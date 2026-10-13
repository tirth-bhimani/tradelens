"""Automated Database Schema and Row-Level Security (RLS) Verification Tests."""

import uuid
from typing import Generator
import psycopg
from psycopg.rows import dict_row
import pytest

DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/tradelens"

EXPECTED_TABLES = [
    "profiles",
    "organizations",
    "organization_memberships",
    "coach_access",
    "imports",
    "raw_fills",
    "trades",
    "charge_rates",
    "stats_snapshots",
    "insights",
    "rules",
    "rule_runs",
    "reports",
    "audit_log",
    "ai_usage",
]


@pytest.fixture
def db_conn() -> Generator[psycopg.Connection, None, None]:
    """Database connection fixture."""
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        yield conn


def test_all_expected_tables_exist(db_conn: psycopg.Connection) -> None:
    """Verify that all 15 core tables are present in the public schema."""
    with db_conn.cursor() as cur:
        cur.execute(
            """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            """
        )
        existing_tables = {row["table_name"] for row in cur.fetchall()}

    for table in EXPECTED_TABLES:
        assert table in existing_tables, f"Table '{table}' missing from public schema"


def test_row_level_security_enabled_on_all_tables(db_conn: psycopg.Connection) -> None:
    """Verify that Row-Level Security (relrowsecurity) is enabled on all tables."""
    with db_conn.cursor() as cur:
        cur.execute(
            """
            SELECT relname AS table_name, relrowsecurity AS rls_enabled
            FROM pg_class
            WHERE relname = ANY(%s) AND relnamespace = 'public'::regnamespace
            """,
            (EXPECTED_TABLES,),
        )
        rls_status = {row["table_name"]: row["rls_enabled"] for row in cur.fetchall()}

    for table in EXPECTED_TABLES:
        assert rls_status.get(table) is True, f"RLS is NOT enabled on table '{table}'"


def test_charge_rates_seed_data_present(db_conn: psycopg.Connection) -> None:
    """Verify that standard Indian regulatory charge rates are populated."""
    with db_conn.cursor() as cur:
        cur.execute("SELECT segment, stt_rate_sell, gst_rate FROM charge_rates")
        rows = cur.fetchall()
        segments = {row["segment"]: row for row in rows}

    assert "EQUITY_DELIVERY" in segments
    assert "EQUITY_INTRADAY" in segments
    assert "FUTURES" in segments
    assert "OPTIONS" in segments

    # Verify standard 18% GST applies across all segments
    for seg, data in segments.items():
        assert float(data["gst_rate"]) == 0.18, f"GST rate for {seg} is not 18%"


def test_raw_fills_duplicate_prevention(db_conn: psycopg.Connection) -> None:
    """Verify unique constraint uq_raw_fills_user_trade prevents double imports."""
    user_id = uuid.uuid4()
    import_id = uuid.uuid4()
    trade_id = f"TRADE_FILL_{uuid.uuid4().hex[:8]}"

    with db_conn.cursor() as cur:
        # Create user profile and import parent records
        cur.execute(
            "INSERT INTO profiles (id, email) VALUES (%s, %s)",
            (user_id, f"dup-test-{user_id}@tradelens.local"),
        )
        cur.execute(
            "INSERT INTO imports (id, user_id, broker, file_name) VALUES (%s, %s, %s, %s)",
            (import_id, user_id, "Zerodha", "tradebook.csv"),
        )

        # First insert succeeds
        cur.execute(
            """
            INSERT INTO raw_fills (
                import_id, user_id, trade_date, fill_time, symbol, trade_type, quantity, price, trade_id
            ) VALUES (%s, %s, CURRENT_DATE, NOW(), 'TCS', 'BUY', 10, 3500.0, %s)
            """,
            (import_id, user_id, trade_id),
        )

        # Attempting identical (user_id, trade_id) must raise unique violation
        with pytest.raises(psycopg.errors.UniqueViolation):
            cur.execute(
                """
                INSERT INTO raw_fills (
                    import_id, user_id, trade_date, fill_time, symbol, trade_type, quantity, price, trade_id
                ) VALUES (%s, %s, CURRENT_DATE, NOW(), 'TCS', 'BUY', 10, 3500.0, %s)
                """,
                (import_id, user_id, trade_id),
            )
    db_conn.rollback()


def test_cross_tenant_rls_isolation(db_conn: psycopg.Connection) -> None:
    """Penetration test: verify Tenant B cannot view, modify or spoof Tenant A's records."""
    tenant_a = uuid.uuid4()
    tenant_b = uuid.uuid4()

    with db_conn.cursor() as cur:
        # Create non-superuser role to enforce RLS
        cur.execute(
            """
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated_trader') THEN
                    CREATE ROLE authenticated_trader NOLOGIN;
                    GRANT USAGE ON SCHEMA public TO authenticated_trader;
                    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated_trader;
                END IF;
            END $$;
            """
        )

        # Seed profiles
        cur.execute(
            "INSERT INTO profiles (id, email, display_name) VALUES (%s, %s, %s)",
            (tenant_a, f"user-a-{tenant_a}@tradelens.local", "Trader A"),
        )
        cur.execute(
            "INSERT INTO profiles (id, email, display_name) VALUES (%s, %s, %s)",
            (tenant_b, f"user-b-{tenant_b}@tradelens.local", "Trader B"),
        )

        # Insert trade belonging to Tenant A (as superuser)
        trade_id = uuid.uuid4()
        cur.execute(
            """
            INSERT INTO trades (
                id, user_id, symbol, segment, instrument_type, entry_time, exit_time,
                trade_duration_seconds, is_intraday, is_short, quantity, entry_price, exit_price,
                gross_pnl, net_pnl
            ) VALUES (
                %s, %s, 'NIFTY24OCT25000CE', 'OPTIONS', 'CE', NOW(), NOW(),
                300, true, false, 50, 120.0, 160.0, 2000.0, 1940.0
            )
            """,
            (trade_id, tenant_a),
        )
    db_conn.commit()

    # Now simulate session as Tenant B under RLS
    with db_conn.cursor() as cur:
        cur.execute("SET ROLE authenticated_trader")
        cur.execute("SELECT set_config('request.jwt.claim.sub', %s, true)", (str(tenant_b),))

        # 1. Tenant B SELECT: MUST return 0 rows for Tenant A's trade
        cur.execute("SELECT * FROM trades WHERE id = %s", (trade_id,))
        rows = cur.fetchall()
        assert len(rows) == 0, "RLS FAILURE: Tenant B was able to view Tenant A's trade!"

        # 2. Tenant B UPDATE: MUST update 0 rows
        cur.execute("UPDATE trades SET gross_pnl = 99999.0 WHERE id = %s", (trade_id,))
        assert cur.rowcount == 0, "RLS FAILURE: Tenant B was able to update Tenant A's trade!"

        # 3. Tenant B DELETE: MUST delete 0 rows
        cur.execute("DELETE FROM trades WHERE id = %s", (trade_id,))
        assert cur.rowcount == 0, "RLS FAILURE: Tenant B was able to delete Tenant A's trade!"

        # 4. Tenant B spoofing Tenant A on INSERT: MUST fail policy WITH CHECK
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            cur.execute(
                """
                INSERT INTO trades (
                    id, user_id, symbol, segment, instrument_type, entry_time, exit_time,
                    trade_duration_seconds, is_intraday, is_short, quantity, entry_price, exit_price,
                    gross_pnl, net_pnl
                ) VALUES (
                    gen_random_uuid(), %s, 'RELIANCE', 'EQUITY_INTRADAY', 'EQ', NOW(), NOW(),
                    60, true, false, 10, 2900.0, 2950.0, 500.0, 480.0
                )
                """,
                (tenant_a,),
            )

    db_conn.rollback()
    with db_conn.cursor() as cur:
        cur.execute("RESET ROLE")
    db_conn.rollback()
