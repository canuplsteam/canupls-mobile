-- ============================================
-- Canupls - COMPREHENSIVE FIX Migration
-- Run this in your Supabase SQL Editor
-- This fixes all identified issues from the code audit
-- ============================================

-- ─── 1. Add stripe_customer_id to profiles ─────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);

-- ─── 2. Fix Profile RLS (allow task participants to see each other) ──
-- Drop old restrictive policy
DROP POLICY IF EXISTS "Anyone can view helper profiles" ON profiles;

-- Allow viewing profiles of users you share tasks with
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view profiles for tasks') THEN
        CREATE POLICY "Users can view profiles for tasks" ON profiles
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM tasks
                    WHERE (tasks.requester_id = profiles.id OR tasks.helper_id = profiles.id)
                    AND (tasks.requester_id = auth.uid() OR tasks.helper_id = auth.uid())
                )
            );
    END IF;
END $$;

-- Allow viewing available users
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view available profiles') THEN
        CREATE POLICY "Anyone can view available profiles" ON profiles
            FOR SELECT USING (is_available = TRUE);
    END IF;
END $$;

-- ─── 3. Fix Task RLS (remove role restriction) ──────────────────
DROP POLICY IF EXISTS "Requesters can create tasks" ON tasks;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create tasks') THEN
        CREATE POLICY "Users can create tasks" ON tasks
            FOR INSERT WITH CHECK (auth.uid() = requester_id);
    END IF;
END $$;

DROP POLICY IF EXISTS "Helpers can view open tasks" ON tasks;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Helpers can view open tasks') THEN
        CREATE POLICY "Helpers can view open tasks" ON tasks
            FOR SELECT USING (status = 'open');
    END IF;
END $$;

-- ─── 4. Create Checklist Items Table (if missing) ───────────────
CREATE TABLE IF NOT EXISTS checklist_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    item_name TEXT NOT NULL,
    is_checked BOOLEAN DEFAULT FALSE,
    position INTEGER NOT NULL,
    created_by UUID REFERENCES profiles(id) NOT NULL,
    checked_by UUID REFERENCES profiles(id),
    checked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checklist_items_task_id ON checklist_items(task_id);
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Task participants can view checklist') THEN
        CREATE POLICY "Task participants can view checklist" ON checklist_items
            FOR SELECT USING (
                EXISTS (SELECT 1 FROM tasks WHERE tasks.id = checklist_items.task_id 
                    AND (tasks.requester_id = auth.uid() OR tasks.helper_id = auth.uid()))
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Requester can create checklist items') THEN
        CREATE POLICY "Requester can create checklist items" ON checklist_items
            FOR INSERT WITH CHECK (
                EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_id AND tasks.requester_id = auth.uid())
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Task participants can update checklist') THEN
        CREATE POLICY "Task participants can update checklist" ON checklist_items
            FOR UPDATE USING (
                EXISTS (SELECT 1 FROM tasks WHERE tasks.id = checklist_items.task_id 
                    AND (tasks.requester_id = auth.uid() OR tasks.helper_id = auth.uid()))
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Requester can delete checklist items') THEN
        CREATE POLICY "Requester can delete checklist items" ON checklist_items
            FOR DELETE USING (
                EXISTS (SELECT 1 FROM tasks WHERE tasks.id = checklist_items.task_id 
                    AND tasks.requester_id = auth.uid())
            );
    END IF;
END $$;

-- ─── 5. Fix Receipts Bucket (make public) ───────────────────────
UPDATE storage.buckets SET public = true WHERE id = 'receipts';

DROP POLICY IF EXISTS "Users can upload receipts for their tasks" ON storage.objects;
DROP POLICY IF EXISTS "Users can view receipts for their tasks" ON storage.objects;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload receipts' AND tablename = 'objects') THEN
        CREATE POLICY "Authenticated users can upload receipts" ON storage.objects
            FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view receipts' AND tablename = 'objects') THEN
        CREATE POLICY "Authenticated users can view receipts" ON storage.objects
            FOR SELECT USING (bucket_id = 'receipts' AND auth.role() = 'authenticated');
    END IF;
END $$;

-- ─── 6. Enable Realtime on tasks and checklist_items ─────────────
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE checklist_items;

-- ─── 7. Create indexes for payment_transactions ─────────────────
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at DESC);

-- ============================================
-- DONE! All fixes applied.
-- ============================================
