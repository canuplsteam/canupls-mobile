-- Shared Checklist Feature for Grocery/Pharmacy Tasks
-- Run this AFTER the main schema (supabase_setup.sql)

-- Checklist Items Table
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

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_checklist_items_task_id ON checklist_items(task_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_position ON checklist_items(task_id, position);

-- Enable Row Level Security
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Checklist Items
-- Users involved in the task can view checklist items
CREATE POLICY "Task participants can view checklist" ON checklist_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tasks 
            WHERE tasks.id = checklist_items.task_id 
            AND (tasks.requester_id = auth.uid() OR tasks.helper_id = auth.uid())
        )
    );

-- Task requester can create checklist items
CREATE POLICY "Requester can create checklist items" ON checklist_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM tasks 
            WHERE tasks.id = task_id 
            AND tasks.requester_id = auth.uid()
        )
    );

-- Both requester and helper can update checklist items (check/uncheck)
CREATE POLICY "Task participants can update checklist" ON checklist_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM tasks 
            WHERE tasks.id = checklist_items.task_id 
            AND (tasks.requester_id = auth.uid() OR tasks.helper_id = auth.uid())
        )
    );

-- Task requester can delete checklist items
CREATE POLICY "Requester can delete checklist items" ON checklist_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM tasks 
            WHERE tasks.id = checklist_items.task_id 
            AND tasks.requester_id = auth.uid()
        )
    );

-- Trigger for updated_at
CREATE TRIGGER update_checklist_items_updated_at BEFORE UPDATE ON checklist_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Realtime for checklist_items
ALTER PUBLICATION supabase_realtime ADD TABLE checklist_items;
