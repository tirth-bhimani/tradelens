-- Migration: 20261022000001_coach_invitations_and_access.sql
-- Description: Coach invitations table, indexes, and refined RLS policies for Task 24

-- 1. Create coach_invitations table
CREATE TABLE IF NOT EXISTS coach_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    invite_token TEXT NOT NULL UNIQUE,
    invite_code VARCHAR(12) NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_coach_invitations_token ON coach_invitations(invite_token);
CREATE INDEX IF NOT EXISTS idx_coach_invitations_coach ON coach_invitations(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_access_lookup ON coach_access(coach_id, trader_id, status);

-- 2. Enable RLS on coach_invitations
ALTER TABLE coach_invitations ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for coach_invitations
-- Coach can create and manage their own invitations
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'coach_manage_own_invitations') THEN
        CREATE POLICY "coach_manage_own_invitations" ON coach_invitations
            FOR ALL
            USING (auth.uid() = coach_id)
            WITH CHECK (auth.uid() = coach_id);
    END IF;
END $$;

-- Authenticated traders can inspect valid pending invitations
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'traders_read_valid_invitations') THEN
        CREATE POLICY "traders_read_valid_invitations" ON coach_invitations
            FOR SELECT
            USING (status = 'pending' AND expires_at > NOW());
    END IF;
END $$;

-- 4. Refine coach_access RLS if needed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'trader_revoke_coach_access') THEN
        CREATE POLICY "trader_revoke_coach_access" ON coach_access
            FOR UPDATE
            USING (auth.uid() = trader_id)
            WITH CHECK (auth.uid() = trader_id);
    END IF;
END $$;
