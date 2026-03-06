-- Receipt Storage Policies for Supabase Storage
-- Run this in Supabase Dashboard → Storage → Policies

-- Note: These are SQL-style policies for the receipts bucket
-- Make sure the 'receipts' bucket exists (created in initial schema)

-- Policy 1: Allow task participants to upload receipts
CREATE POLICY "Task helper can upload receipt"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'receipts' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE id::text = (storage.foldername(name))[1]
    AND helper_id = auth.uid()
  )
);

-- Policy 2: Allow task participants to view receipts
CREATE POLICY "Task participants can view receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'receipts' AND
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE id::text = (storage.foldername(name))[1]
    AND (requester_id = auth.uid() OR helper_id = auth.uid())
  )
);

-- Policy 3: Allow task participants to delete receipts (optional, for helper)
CREATE POLICY "Task helper can delete receipt"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'receipts' AND
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE id::text = (storage.foldername(name))[1]
    AND helper_id = auth.uid()
  )
);

-- Update tasks table to support multiple receipts (optional)
-- If you want to store multiple receipt URLs, use JSONB array
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS receipt_urls JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN tasks.receipt_url IS 'Primary receipt URL (deprecated, use receipt_urls)';
COMMENT ON COLUMN tasks.receipt_urls IS 'Array of receipt URLs with metadata';

-- Add index for receipt queries
CREATE INDEX IF NOT EXISTS idx_tasks_receipts ON tasks(id) WHERE receipt_url IS NOT NULL OR receipt_urls != '[]'::jsonb;
