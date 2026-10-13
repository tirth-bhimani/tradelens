-- TradeLens Initial Database Schema Migration
-- Migration: 20261012000001_initial_schema.sql

-- 1. Helper Functions and Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Compatibility layer for local standard PostgreSQL testing
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$ LANGUAGE sql STABLE;

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    display_name TEXT,
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    starting_capital NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    trading_segments TEXT[] NOT NULL DEFAULT ARRAY['EQUITY', 'FNO'],
    role TEXT NOT NULL DEFAULT 'trader' CHECK (role IN ('trader', 'coach', 'client_admin', 'platform_admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Organizations and Memberships
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'coach', 'member')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_org_member UNIQUE (organization_id, user_id)
);

-- 4. Coach Access Permissions
CREATE TABLE IF NOT EXISTS coach_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    CONSTRAINT uq_coach_trader UNIQUE (trader_id, coach_id)
);

-- 5. Imports Table
CREATE TABLE IF NOT EXISTS imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    broker TEXT NOT NULL,
    file_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('uploaded', 'processing', 'completed', 'failed')),
    total_rows INT NOT NULL DEFAULT 0,
    imported_rows INT NOT NULL DEFAULT 0,
    skipped_rows INT NOT NULL DEFAULT 0,
    error_report JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Raw Fills Table (Full Traceability & Duplicate Protection)
CREATE TABLE IF NOT EXISTS raw_fills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_id UUID NOT NULL REFERENCES imports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    trade_date DATE NOT NULL,
    fill_time TIMESTAMPTZ NOT NULL,
    symbol TEXT NOT NULL,
    trade_type TEXT NOT NULL CHECK (trade_type IN ('BUY', 'SELL')),
    quantity NUMERIC(12, 2) NOT NULL,
    price NUMERIC(12, 4) NOT NULL,
    order_id TEXT,
    trade_id TEXT NOT NULL,
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_raw_fills_user_trade UNIQUE (user_id, trade_id)
);

-- 7. Trades Table (Paired Round-Trip Trades)
CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    import_id UUID REFERENCES imports(id) ON DELETE SET NULL,
    symbol TEXT NOT NULL,
    segment TEXT NOT NULL CHECK (segment IN ('EQUITY_DELIVERY', 'EQUITY_INTRADAY', 'FUTURES', 'OPTIONS')),
    instrument_type TEXT NOT NULL CHECK (instrument_type IN ('EQ', 'FUT', 'CE', 'PE')),
    entry_time TIMESTAMPTZ NOT NULL,
    exit_time TIMESTAMPTZ NOT NULL,
    trade_duration_seconds INT NOT NULL,
    is_intraday BOOLEAN NOT NULL,
    is_short BOOLEAN NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL,
    entry_price NUMERIC(12, 4) NOT NULL,
    exit_price NUMERIC(12, 4) NOT NULL,
    gross_pnl NUMERIC(14, 2) NOT NULL,
    charges NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_pnl NUMERIC(14, 2) NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}'::text[],
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Charge Rates Table (Editable Statutory Lookup Table)
CREATE TABLE IF NOT EXISTS charge_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    segment TEXT NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    stt_rate_buy NUMERIC(8, 6) NOT NULL DEFAULT 0.000000,
    stt_rate_sell NUMERIC(8, 6) NOT NULL DEFAULT 0.000000,
    brokerage_per_order NUMERIC(8, 2) NOT NULL DEFAULT 20.00,
    exchange_turnover_rate NUMERIC(8, 6) NOT NULL,
    sebi_turnover_rate NUMERIC(10, 8) NOT NULL,
    gst_rate NUMERIC(6, 4) NOT NULL DEFAULT 0.1800,
    stamp_duty_rate_buy NUMERIC(8, 6) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Stats Snapshots Table (Cached Performance Aggregates)
CREATE TABLE IF NOT EXISTS stats_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date_range_start DATE NOT NULL,
    date_range_end DATE NOT NULL,
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    behavior_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    hash TEXT NOT NULL,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Insights Table (AI Explanations & Proposed Rules)
CREATE TABLE IF NOT EXISTS insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    top_leaks JSONB NOT NULL DEFAULT '[]'::jsonb,
    suggested_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
    confidence_notes TEXT,
    model_used TEXT NOT NULL,
    stats_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Rules Table (Personal Rulebook)
CREATE TABLE IF NOT EXISTS rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL,
    rule_payload JSONB NOT NULL,
    natural_language_text TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Rule Runs Table (Replay Backtest Simulations)
CREATE TABLE IF NOT EXISTS rule_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES rules(id) ON DELETE CASCADE,
    date_range_start DATE NOT NULL,
    date_range_end DATE NOT NULL,
    before_metrics JSONB NOT NULL,
    after_metrics JSONB NOT NULL,
    skipped_trade_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
    is_overfit_flag BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Reports Table (Weekly Performance Summaries)
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    content JSONB NOT NULL,
    delivered_email BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Audit Log Table
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    ip_address TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. AI Usage Table (Token and Cost Quotas)
CREATE TABLE IF NOT EXISTS ai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    calls_count INT NOT NULL DEFAULT 1,
    prompt_tokens INT NOT NULL,
    completion_tokens INT NOT NULL,
    cost_usd NUMERIC(8, 4) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Fast Query Planning and Multi-Tenant RLS
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_imports_user_created ON imports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_fills_user_date ON raw_fills(user_id, trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_raw_fills_import ON raw_fills(import_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_entry ON trades(user_id, entry_time DESC);
CREATE INDEX IF NOT EXISTS idx_trades_user_symbol ON trades(user_id, symbol);
CREATE INDEX IF NOT EXISTS idx_trades_user_segment ON trades(user_id, segment);
CREATE INDEX IF NOT EXISTS idx_stats_user ON stats_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_user ON insights(user_id);
CREATE INDEX IF NOT EXISTS idx_rules_user_active ON rules(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_rule_runs_user ON rule_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage(user_id);
