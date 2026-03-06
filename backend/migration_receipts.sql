-- ============================================
-- Canupls - Receipt & Expense Management Migration
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Make the receipts bucket public (so receipt_url works directly)
UPDATE storage.buckets SET public = true WHERE id = 'receipts';

-- 2. Drop old storage policies if they exist (they may fail if names differ - that's OK)
DROP POLICY IF EXISTS "Users can upload receipts for their tasks" ON storage.objects;
DROP POLICY IF EXISTS "Users can view receipts for their tasks" ON storage.objects;

-- 3. Create new simplified storage policies
CREATE POLICY "Authenticated users can upload receipts" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'receipts' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can view receipts" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'receipts' AND
        auth.role() = 'authenticated'
    );

-- 4. Fix the task INSERT policy to allow users with role 'both'
DROP POLICY IF EXISTS "Requesters can create tasks" ON tasks;
CREATE POLICY "Users can create tasks" ON tasks
    FOR INSERT WITH CHECK (
        auth.uid() = requester_id
    );

-- 5. Fix the task SELECT policy for open tasks (remove role check)
DROP POLICY IF EXISTS "Helpers can view open tasks" ON tasks;
CREATE POLICY "Helpers can view open tasks" ON tasks
    FOR SELECT USING (status = 'open');

-- Done! Receipt system is ready to use.
