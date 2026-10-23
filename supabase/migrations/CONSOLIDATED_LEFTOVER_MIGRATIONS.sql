-- ==============================================================================
-- TRADELENS CONSOLIDATED LEFTOVER MIGRATIONS
-- Run this in your Supabase Dashboard SQL Editor (takes ~5 seconds).
-- All statements are safe, idempotent (IF NOT EXISTS), and error-proof.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Storage Bucket & Policies: trade-imports (Migration: 20261014000001)
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'trade-imports',
    'trade-imports',
    false,
    26214400, -- 25 MB
    ARRAY['text/csv', 'text/plain', 'application/vnd.ms-excel']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 26214400,
    allowed_mime_types = ARRAY['text/csv', 'text/plain', 'application/vnd.ms-excel'];

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'tenant_insert_trade_imports') THEN
        CREATE POLICY "tenant_insert_trade_imports"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (
            bucket_id = 'trade-imports' AND
            auth.uid()::text = (storage.foldername(name))[1]
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'tenant_select_trade_imports') THEN
        CREATE POLICY "tenant_select_trade_imports"
        ON storage.objects FOR SELECT
        TO authenticated
        USING (
            bucket_id = 'trade-imports' AND
            auth.uid()::text = (storage.foldername(name))[1]
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'tenant_delete_trade_imports') THEN
        CREATE POLICY "tenant_delete_trade_imports"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (
            bucket_id = 'trade-imports' AND
            auth.uid()::text = (storage.foldername(name))[1]
        );
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. Coach Invitations & Access (Migration: 20261022000001)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coach_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    invite_token TEXT NOT NULL UNIQUE,
    invite_code VARCHAR(12) NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_invitations_token ON public.coach_invitations(invite_token);
CREATE INDEX IF NOT EXISTS idx_coach_invitations_coach ON public.coach_invitations(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_access_lookup ON public.coach_access(coach_id, trader_id, status);

ALTER TABLE public.coach_invitations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coach_invitations' AND policyname = 'coach_manage_own_invitations') THEN
        CREATE POLICY "coach_manage_own_invitations" ON public.coach_invitations
            FOR ALL
            USING (auth.uid() = coach_id)
            WITH CHECK (auth.uid() = coach_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coach_invitations' AND policyname = 'traders_read_valid_invitations') THEN
        CREATE POLICY "traders_read_valid_invitations" ON public.coach_invitations
            FOR SELECT
            USING (status = 'pending' AND expires_at > NOW());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coach_access' AND policyname = 'trader_revoke_coach_access') THEN
        CREATE POLICY "trader_revoke_coach_access" ON public.coach_access
            FOR UPDATE
            USING (auth.uid() = trader_id)
            WITH CHECK (auth.uid() = trader_id);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. Coach Notes & Rules Extensions (Migration: 20261022000002)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coach_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    trader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    note TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}'::text[],
    is_private_to_coach BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_notes_trader ON public.coach_notes(trader_id, coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_notes_created ON public.coach_notes(created_at DESC);

ALTER TABLE public.coach_notes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coach_notes' AND policyname = 'coach_manage_notes') THEN
        CREATE POLICY "coach_manage_notes" ON public.coach_notes
            FOR ALL
            USING (
                auth.uid() = coach_id 
                AND EXISTS (
                    SELECT 1 FROM public.coach_access ca 
                    WHERE ca.coach_id = auth.uid() 
                      AND ca.trader_id = coach_notes.trader_id 
                      AND ca.status = 'active'
                )
            )
            WITH CHECK (
                auth.uid() = coach_id 
                AND EXISTS (
                    SELECT 1 FROM public.coach_access ca 
                    WHERE ca.coach_id = auth.uid() 
                      AND ca.trader_id = coach_notes.trader_id 
                      AND ca.status = 'active'
                )
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coach_notes' AND policyname = 'trader_read_own_notes') THEN
        CREATE POLICY "trader_read_own_notes" ON public.coach_notes
            FOR SELECT
            USING (
                auth.uid() = trader_id 
                AND is_private_to_coach = FALSE
            );
    END IF;
END $$;

ALTER TABLE public.rules ADD COLUMN IF NOT EXISTS suggested_by_coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.rules ADD COLUMN IF NOT EXISTS coach_recommendation_status TEXT DEFAULT 'active' CHECK (coach_recommendation_status IN ('pending_trader_review', 'active', 'rejected'));

-- ------------------------------------------------------------------------------
-- 4. Permanent Account Deletion & RPC (Migrations: 20261023000001 & 20261023000002)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'tenant_delete_profiles'
    ) THEN
        CREATE POLICY "tenant_delete_profiles" ON public.profiles
            FOR DELETE USING (auth.uid() = id);
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Cascade delete all user records across application tables
  DELETE FROM public.rule_runs WHERE user_id = v_user_id;
  DELETE FROM public.rules WHERE user_id = v_user_id;
  DELETE FROM public.stats_snapshots WHERE user_id = v_user_id;
  DELETE FROM public.insights WHERE user_id = v_user_id;
  DELETE FROM public.weekly_reports WHERE user_id = v_user_id;
  DELETE FROM public.reports WHERE user_id = v_user_id;
  DELETE FROM public.trades WHERE user_id = v_user_id;
  DELETE FROM public.raw_fills WHERE user_id = v_user_id;
  DELETE FROM public.imports WHERE user_id = v_user_id;
  DELETE FROM public.coach_invitations WHERE coach_id = v_user_id;
  DELETE FROM public.coach_notes WHERE trader_id = v_user_id OR coach_id = v_user_id;
  DELETE FROM public.coach_access WHERE trader_id = v_user_id OR coach_id = v_user_id;
  DELETE FROM public.organization_memberships WHERE user_id = v_user_id;
  DELETE FROM public.ai_usage WHERE user_id = v_user_id;
  DELETE FROM public.audit_log WHERE user_id = v_user_id;

  -- 2. Delete profile
  DELETE FROM public.profiles WHERE id = v_user_id;

  -- 3. Erase from auth.users (permanently purges login identity)
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_user_account() FROM public;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

-- ------------------------------------------------------------------------------
-- 5. Purge Any Unimported Default / Mock Trades
-- ------------------------------------------------------------------------------
DELETE FROM public.trades WHERE import_id IS NULL;
