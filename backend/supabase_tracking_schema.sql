-- Real-Time Tracking Schema Updates
-- Run this after the main schema and checklist schema

-- Add delivery status tracking fields to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS helper_location_updated_at TIMESTAMP WITH TIME ZONE;

-- Update helper_location columns if they don't exist
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS helper_location_lat DECIMAL(10,8),
ADD COLUMN IF NOT EXISTS helper_location_lng DECIMAL(11,8);

-- Create index for real-time queries
CREATE INDEX IF NOT EXISTS idx_tasks_helper_location ON tasks(helper_id, status) WHERE status IN ('accepted', 'in_progress');
CREATE INDEX IF NOT EXISTS idx_tasks_delivery_status ON tasks(delivery_status);

-- Enable Realtime for location updates (if not already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- Update RLS policies to allow helper to update their location
-- (This might already exist, but let's ensure it's there)
DROP POLICY IF EXISTS "Helpers can update task location" ON tasks;
CREATE POLICY "Helpers can update task location" ON tasks
    FOR UPDATE USING (
        auth.uid() = helper_id AND 
        status IN ('accepted', 'in_progress')
    )
    WITH CHECK (
        auth.uid() = helper_id AND 
        status IN ('accepted', 'in_progress')
    );

-- Comments for clarity
COMMENT ON COLUMN tasks.delivery_status IS 'Granular delivery tracking: pending, on_way_to_pickup, at_location, out_for_delivery, delivered';
COMMENT ON COLUMN tasks.helper_location_lat IS 'Real-time latitude of helper during task';
COMMENT ON COLUMN tasks.helper_location_lng IS 'Real-time longitude of helper during task';
COMMENT ON COLUMN tasks.helper_location_updated_at IS 'Last time helper location was updated';
