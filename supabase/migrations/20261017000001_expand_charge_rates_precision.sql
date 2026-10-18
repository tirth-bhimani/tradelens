
-- Migration: 20261017000001_expand_charge_rates_precision.sql
-- Expands exchange_turnover_rate precision to store 7-decimal NSE rates (e.g. 0.0000297, 0.0000173, 0.0003503)
-- Adds brokerage_percent_cap to support 0.03% intraday cap configuration.

ALTER TABLE charge_rates
    ALTER COLUMN exchange_turnover_rate TYPE NUMERIC(10, 8);

ALTER TABLE charge_rates
    ADD COLUMN IF NOT EXISTS brokerage_percent_cap NUMERIC(6, 4) DEFAULT 0.0003;

-- Enable RLS and public read-only access for reference data
ALTER TABLE charge_rates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'charge_rates' AND policyname = 'Anyone can view charge rates'
    ) THEN
        CREATE POLICY "Anyone can view charge rates"
            ON charge_rates FOR SELECT
            TO authenticated, anon
            USING (true);
    END IF;
END $$;


