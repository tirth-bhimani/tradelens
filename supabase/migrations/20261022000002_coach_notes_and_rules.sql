-- Migration: 20261022000002_coach_notes_and_rules.sql
-- Description: Coach notes table, RLS policies, and rule assignment attributes for Task 25

-- 1. Create coach_notes table
CREATE TABLE IF NOT EXISTS coach_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    trader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    note TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}'::text[],
    is_private_to_coach BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_coach_notes_trader ON coach_notes(trader_id, coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_notes_created ON coach_notes(created_at DESC);

-- Enable RLS
ALTER TABLE coach_notes ENABLE ROW LEVEL SECURITY;

-- Coach can read and write notes for traders who have granted active consent
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'coach_manage_notes') THEN
        CREATE POLICY "coach_manage_notes" ON coach_notes
            FOR ALL
            USING (
                auth.uid() = coach_id 
                AND EXISTS (
                    SELECT 1 FROM coach_access ca 
                    WHERE ca.coach_id = auth.uid() 
                      AND ca.trader_id = coach_notes.trader_id 
                      AND ca.status = 'active'
                )
            )
            WITH CHECK (
                auth.uid() = coach_id 
                AND EXISTS (
                    SELECT 1 FROM coach_access ca 
                    WHERE ca.coach_id = auth.uid() 
                      AND ca.trader_id = coach_notes.trader_id 
                      AND ca.status = 'active'
                )
            );
    END IF;
END $$;

-- Trader can read non-private notes addressed to them
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'trader_read_own_notes') THEN
        CREATE POLICY "trader_read_own_notes" ON coach_notes
            FOR SELECT
            USING (
                auth.uid() = trader_id 
                AND is_private_to_coach = FALSE
            );
    END IF;
END $$;

-- 2. Alter rules table for coach assignments
ALTER TABLE rules ADD COLUMN IF NOT EXISTS suggested_by_coach_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE rules ADD COLUMN IF NOT EXISTS coach_recommendation_status TEXT DEFAULT 'active' CHECK (coach_recommendation_status IN ('pending_trader_review', 'active', 'rejected'));
