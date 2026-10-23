-- Migration: Allow traders to delete their own profile record (DPDP Act 2023 Sec 12(3))
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
