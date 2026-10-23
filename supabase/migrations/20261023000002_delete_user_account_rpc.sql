-- Migration: Add tenant delete policy on profiles and self-service account erasure RPC
-- Conforms to Indian DPDP Act 2023 Sec 12(3) Right to Erasure

-- 1. Ensure authenticated users have RLS permission to delete their own profile
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

-- 2. Create atomic erasure procedure executing with SECURITY DEFINER
CREATE OR REPLACE FUNCTION delete_user_account()
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

-- Grant execution to authenticated users
REVOKE EXECUTE ON FUNCTION delete_user_account() FROM public;
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;
