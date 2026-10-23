-- Migration: 20261022000003_weekly_reports.sql
-- Task 26: Automated Weekly Report Engine & PDF/Email Delivery
-- Creates the weekly_reports table and updates profiles with notification preferences.

-- 1. Create weekly_reports table
CREATE TABLE IF NOT EXISTS weekly_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    total_trades INT NOT NULL DEFAULT 0,
    winning_trades INT NOT NULL DEFAULT 0,
    losing_trades INT NOT NULL DEFAULT 0,
    win_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    gross_pnl NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_charges NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    net_pnl NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    best_day_date DATE,
    best_day_pnl NUMERIC(14, 2) DEFAULT 0.00,
    worst_day_date DATE,
    worst_day_pnl NUMERIC(14, 2) DEFAULT 0.00,
    adherence_score NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
    rule_violations_count INT NOT NULL DEFAULT 0,
    top_behavioral_leak TEXT,
    top_leak_loss NUMERIC(14, 2) DEFAULT 0.00,
    focus_item TEXT NOT NULL,
    metrics_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    email_sent_at TIMESTAMPTZ,
    email_delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (email_delivery_status IN ('pending', 'sent', 'failed', 'skipped')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_weekly_report UNIQUE (user_id, week_start_date)
);

CREATE INDEX IF NOT EXISTS idx_weekly_reports_user_week ON weekly_reports(user_id, week_start_date DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_created ON weekly_reports(created_at DESC);

-- 2. Enable Row-Level Security
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "users_read_own_weekly_reports" ON weekly_reports
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_weekly_reports" ON weekly_reports
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_weekly_reports" ON weekly_reports
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "service_role_manage_weekly_reports" ON weekly_reports
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- 4. Add Notification Preferences to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS weekly_email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS email_notifications_email TEXT;
