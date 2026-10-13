-- TradeLens Row-Level Security (RLS) Policies Migration
-- Migration: 20261012000002_rls_policies.sql

-- 1. Enable Row-Level Security on All Core Tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_fills ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE charge_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- 2. Profiles Policies
CREATE POLICY "tenant_select_profiles" ON profiles
    FOR SELECT
    USING (
        auth.uid() = id
        OR EXISTS (
            SELECT 1 FROM coach_access
            WHERE coach_access.coach_id = auth.uid()
              AND coach_access.trader_id = profiles.id
              AND coach_access.status = 'active'
        )
    );

CREATE POLICY "tenant_insert_profiles" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "tenant_update_profiles" ON profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 3. Coach Access Policies
CREATE POLICY "tenant_select_coach_access" ON coach_access
    FOR SELECT
    USING (auth.uid() = trader_id OR auth.uid() = coach_id);

CREATE POLICY "tenant_insert_coach_access" ON coach_access
    FOR INSERT
    WITH CHECK (auth.uid() = coach_id OR auth.uid() = trader_id);

CREATE POLICY "tenant_update_coach_access" ON coach_access
    FOR UPDATE
    USING (auth.uid() = trader_id OR auth.uid() = coach_id)
    WITH CHECK (auth.uid() = trader_id OR auth.uid() = coach_id);

CREATE POLICY "tenant_delete_coach_access" ON coach_access
    FOR DELETE
    USING (auth.uid() = trader_id);

-- 4. Imports Policies
CREATE POLICY "tenant_select_imports" ON imports
    FOR SELECT
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM coach_access
            WHERE coach_access.coach_id = auth.uid()
              AND coach_access.trader_id = imports.user_id
              AND coach_access.status = 'active'
        )
    );

CREATE POLICY "tenant_insert_imports" ON imports
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tenant_update_imports" ON imports
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tenant_delete_imports" ON imports
    FOR DELETE
    USING (auth.uid() = user_id);

-- 5. Raw Fills Policies
CREATE POLICY "tenant_select_raw_fills" ON raw_fills
    FOR SELECT
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM coach_access
            WHERE coach_access.coach_id = auth.uid()
              AND coach_access.trader_id = raw_fills.user_id
              AND coach_access.status = 'active'
        )
    );

CREATE POLICY "tenant_insert_raw_fills" ON raw_fills
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tenant_delete_raw_fills" ON raw_fills
    FOR DELETE
    USING (auth.uid() = user_id);

-- 6. Trades Policies
CREATE POLICY "tenant_select_trades" ON trades
    FOR SELECT
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM coach_access
            WHERE coach_access.coach_id = auth.uid()
              AND coach_access.trader_id = trades.user_id
              AND coach_access.status = 'active'
        )
    );

CREATE POLICY "tenant_insert_trades" ON trades
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tenant_update_trades" ON trades
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tenant_delete_trades" ON trades
    FOR DELETE
    USING (auth.uid() = user_id);

-- 7. Charge Rates Policies (Public Read, Admin Write)
CREATE POLICY "public_read_charge_rates" ON charge_rates
    FOR SELECT
    USING (true);

CREATE POLICY "admin_manage_charge_rates" ON charge_rates
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role IN ('client_admin', 'platform_admin')
        )
    );

-- 8. Stats Snapshots Policies
CREATE POLICY "tenant_select_stats_snapshots" ON stats_snapshots
    FOR SELECT
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM coach_access
            WHERE coach_access.coach_id = auth.uid()
              AND coach_access.trader_id = stats_snapshots.user_id
              AND coach_access.status = 'active'
        )
    );

CREATE POLICY "tenant_insert_stats_snapshots" ON stats_snapshots
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tenant_delete_stats_snapshots" ON stats_snapshots
    FOR DELETE
    USING (auth.uid() = user_id);

-- 9. Insights Policies
CREATE POLICY "tenant_select_insights" ON insights
    FOR SELECT
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM coach_access
            WHERE coach_access.coach_id = auth.uid()
              AND coach_access.trader_id = insights.user_id
              AND coach_access.status = 'active'
        )
    );

CREATE POLICY "tenant_insert_insights" ON insights
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tenant_delete_insights" ON insights
    FOR DELETE
    USING (auth.uid() = user_id);

-- 10. Rules Policies
CREATE POLICY "tenant_select_rules" ON rules
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "tenant_insert_rules" ON rules
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tenant_update_rules" ON rules
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tenant_delete_rules" ON rules
    FOR DELETE
    USING (auth.uid() = user_id);

-- 11. Rule Runs Policies
CREATE POLICY "tenant_select_rule_runs" ON rule_runs
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "tenant_insert_rule_runs" ON rule_runs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tenant_delete_rule_runs" ON rule_runs
    FOR DELETE
    USING (auth.uid() = user_id);

-- 12. Reports Policies
CREATE POLICY "tenant_select_reports" ON reports
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "tenant_insert_reports" ON reports
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 13. Audit Log Policies
CREATE POLICY "tenant_select_audit_log" ON audit_log
    FOR SELECT
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'platform_admin'
        )
    );

CREATE POLICY "tenant_insert_audit_log" ON audit_log
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 14. AI Usage Policies
CREATE POLICY "tenant_select_ai_usage" ON ai_usage
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "tenant_insert_ai_usage" ON ai_usage
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
