-- TradeLens Storage Bucket & Policies Migration
-- Migration: 20261014000001_storage_bucket.sql

-- 1. Create Private Storage Bucket for Trade Imports
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

-- 2. Tenant Isolation Policies on Storage Objects
-- Path structure: <user_id>/<import_id>.csv
-- storage.foldername(name)[1] extracts the first path segment (the user_id)

CREATE POLICY "tenant_insert_trade_imports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'trade-imports' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "tenant_select_trade_imports"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'trade-imports' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "tenant_delete_trade_imports"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'trade-imports' AND
    auth.uid()::text = (storage.foldername(name))[1]
);
