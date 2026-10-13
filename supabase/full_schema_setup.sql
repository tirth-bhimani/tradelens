   -- 1. Helper Extensions
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    
    -- 2. Profiles Table
    CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT NOT NULL UNIQUE,
        display_name TEXT,
        timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
        starting_capital NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
        trading_segments TEXT[] NOT NULL DEFAULT ARRAY['EQUITY', 'FNO'],
        role TEXT NOT NULL DEFAULT 'trader' CHECK (role IN ('trader', 'coach', 'client_admin', 'platform_admin')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- Backfill existing registered users into profiles
    INSERT INTO public.profiles (id, email, display_name, timezone, trading_segments, role)
    SELECT 
      id, 
      email, 
      COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)),
      'Asia/Kolkata',
      ARRAY['EQUITY', 'FNO'],
      'trader'
    FROM auth.users
    ON CONFLICT (id) DO NOTHING;
    
    -- 3. Organizations and Memberships
    CREATE TABLE IF NOT EXISTS public.organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS public.organization_memberships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'coach', 'member')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_org_member UNIQUE (organization_id, user_id)
    );
    
    -- 4. Coach Access Permissions
    CREATE TABLE IF NOT EXISTS public.coach_access (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        trader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
        granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        revoked_at TIMESTAMPTZ,
        CONSTRAINT uq_coach_trader UNIQUE (trader_id, coach_id)
    );
    
    -- 5. Imports Table
    CREATE TABLE IF NOT EXISTS public.imports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        broker TEXT NOT NULL,
        file_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('uploaded', 'processing', 'completed',
  'failed')),
        total_rows INT NOT NULL DEFAULT 0,
        imported_rows INT NOT NULL DEFAULT 0,
        skipped_rows INT NOT NULL DEFAULT 0,
        error_report JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- 6. Raw Fills Table
    CREATE TABLE IF NOT EXISTS public.raw_fills (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        import_id UUID NOT NULL REFERENCES public.imports(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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
    
    -- 7. Trades Table
    CREATE TABLE IF NOT EXISTS public.trades (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        import_id UUID REFERENCES public.imports(id) ON DELETE SET NULL,
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
    
    -- 8. Charge Rates Table
    CREATE TABLE IF NOT EXISTS public.charge_rates (
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
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_charge_rates_segment_effective UNIQUE (segment, effective_from)
    );
    
    -- 9. Stats Snapshots Table
    CREATE TABLE IF NOT EXISTS public.stats_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        date_range_start DATE NOT NULL,
        date_range_end DATE NOT NULL,
        metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
        behavior_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
        hash TEXT NOT NULL,
        calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- 10. Insights Table
    CREATE TABLE IF NOT EXISTS public.insights (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        top_leaks JSONB NOT NULL DEFAULT '[]'::jsonb,
        suggested_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
        confidence_notes TEXT,
        model_used TEXT NOT NULL,
        stats_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- 11. Rules Table
    CREATE TABLE IF NOT EXISTS public.rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        rule_type TEXT NOT NULL,
        rule_payload JSONB NOT NULL,
        natural_language_text TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- 12. Rule Runs Table
    CREATE TABLE IF NOT EXISTS public.rule_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        rule_id UUID REFERENCES public.rules(id) ON DELETE CASCADE,
        date_range_start DATE NOT NULL,
        date_range_end DATE NOT NULL,
        before_metrics JSONB NOT NULL,
        after_metrics JSONB NOT NULL,
        skipped_trade_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
        is_overfit_flag BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- 13. Reports Table
    CREATE TABLE IF NOT EXISTS public.reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        content JSONB NOT NULL,
        delivered_email BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- 14. Audit Log Table
    CREATE TABLE IF NOT EXISTS public.audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        resource TEXT NOT NULL,
        ip_address TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- 15. AI Usage Table
    CREATE TABLE IF NOT EXISTS public.ai_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        calls_count INT NOT NULL DEFAULT 1,
        prompt_tokens INT NOT NULL,
        completion_tokens INT NOT NULL,
        cost_usd NUMERIC(8, 4) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
    CREATE INDEX IF NOT EXISTS idx_imports_user_created ON public.imports(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_raw_fills_user_date ON public.raw_fills(user_id, trade_date DESC);
    CREATE INDEX IF NOT EXISTS idx_raw_fills_import ON public.raw_fills(import_id);
    CREATE INDEX IF NOT EXISTS idx_trades_user_entry ON public.trades(user_id, entry_time DESC);
    CREATE INDEX IF NOT EXISTS idx_trades_user_symbol ON public.trades(user_id, symbol);
    CREATE INDEX IF NOT EXISTS idx_trades_user_segment ON public.trades(user_id, segment);
    CREATE INDEX IF NOT EXISTS idx_stats_user ON public.stats_snapshots(user_id);
    CREATE INDEX IF NOT EXISTS idx_insights_user ON public.insights(user_id);
    CREATE INDEX IF NOT EXISTS idx_rules_user_active ON public.rules(user_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_rule_runs_user ON public.rule_runs(user_id);
    CREATE INDEX IF NOT EXISTS idx_reports_user ON public.reports(user_id, period_start DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON public.ai_usage(user_id);
    
    -- Auto-create profile trigger on new signups
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO public.profiles (id, email, display_name, timezone, trading_segments, role)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@',
  1)),
        'Asia/Kolkata',
        ARRAY['EQUITY', 'FNO'],
        'trader'
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
    
    -- Enable Row-Level Security
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.coach_access ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.raw_fills ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.charge_rates ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.stats_snapshots ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.rule_runs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
    
    -- RLS Policies
    DROP POLICY IF EXISTS "tenant_select_profiles" ON public.profiles;
    CREATE POLICY "tenant_select_profiles" ON public.profiles FOR SELECT USING (auth.uid() = id);
    
    DROP POLICY IF EXISTS "tenant_insert_profiles" ON public.profiles;
    CREATE POLICY "tenant_insert_profiles" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
    
    DROP POLICY IF EXISTS "tenant_update_profiles" ON public.profiles;
    CREATE POLICY "tenant_update_profiles" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK 
  (auth.uid() = id);
    
    DROP POLICY IF EXISTS "public_read_charge_rates" ON public.charge_rates;
    CREATE POLICY "public_read_charge_rates" ON public.charge_rates FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "tenant_manage_trades" ON public.trades;
    CREATE POLICY "tenant_manage_trades" ON public.trades FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.
  uid() = user_id);

    DROP POLICY IF EXISTS "tenant_manage_imports" ON public.imports;
    CREATE POLICY "tenant_manage_imports" ON public.imports FOR ALL USING (auth.uid() = user_id) WITH CHECK 
  (auth.uid() = user_id);

    DROP POLICY IF EXISTS "tenant_manage_raw_fills" ON public.raw_fills;
    CREATE POLICY "tenant_manage_raw_fills" ON public.raw_fills FOR ALL USING (auth.uid() = user_id) WITH CHECK
  (auth.uid() = user_id);

    DROP POLICY IF EXISTS "tenant_manage_stats" ON public.stats_snapshots;
    CREATE POLICY "tenant_manage_stats" ON public.stats_snapshots FOR ALL USING (auth.uid() = user_id) WITH CHECK
  (auth.uid() = user_id);

    DROP POLICY IF EXISTS "tenant_manage_rules" ON public.rules;
    CREATE POLICY "tenant_manage_rules" ON public.rules FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.
  uid() = user_id);

    -- Indian Regulatory Charge Rates Seeds
    INSERT INTO public.charge_rates (
        segment, effective_from, stt_rate_buy, stt_rate_sell, brokerage_per_order, 
        exchange_turnover_rate, sebi_turnover_rate, gst_rate, stamp_duty_rate_buy
    ) VALUES
    ('EQUITY_DELIVERY', '2024-01-01', 0.001000, 0.001000, 0.00, 0.0000345, 0.0000010, 0.1800, 0.000150),
    ('EQUITY_INTRADAY', '2024-01-01', 0.000000, 0.000250, 20.00, 0.0000345, 0.0000010, 0.1800, 0.000030),
    ('FUTURES', '2024-01-01', 0.000000, 0.000200, 20.00, 0.0000200, 0.0000010, 0.1800, 0.000020),
    ('OPTIONS', '2024-01-01', 0.000000, 0.001000, 20.00, 0.0005300, 0.0000010, 0.1800, 0.000030)
    ON CONFLICT (segment, effective_from) DO NOTHING;