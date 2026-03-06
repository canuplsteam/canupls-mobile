-- Canupls Database Schema Setup
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('requester', 'helper', 'both');
CREATE TYPE task_status AS ENUM ('open', 'accepted', 'in_progress', 'completed', 'cancelled');
CREATE TYPE task_category AS ENUM ('grocery', 'pharmacy', 'dog_walking', 'package_delivery', 'quick_rides', 'errands', 'other');

-- Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    user_role user_role NOT NULL DEFAULT 'both',
    full_name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    address_lat DECIMAL(10,8),
    address_lng DECIMAL(11,8),
    avatar_url TEXT,
    stripe_customer_id TEXT,
    rating DECIMAL(3,2) DEFAULT 0.00,
    completed_tasks INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT TRUE,
    location_lat DECIMAL(10,8),
    location_lng DECIMAL(11,8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    requester_id UUID REFERENCES profiles(id) NOT NULL,
    helper_id UUID REFERENCES profiles(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category task_category NOT NULL,
    status task_status DEFAULT 'open',
    location_lat DECIMAL(10,8) NOT NULL,
    location_lng DECIMAL(11,8) NOT NULL,
    location_address TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    receipt_url TEXT,
    helper_location_lat DECIMAL(10,8),
    helper_location_lng DECIMAL(11,8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Ratings Table
CREATE TABLE IF NOT EXISTS ratings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID REFERENCES tasks(id) NOT NULL,
    from_user_id UUID REFERENCES profiles(id) NOT NULL,
    to_user_id UUID REFERENCES profiles(id) NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id, from_user_id, to_user_id)
);

-- Payment Transactions Table (for Stripe integration)
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID REFERENCES tasks(id) NOT NULL,
    user_id UUID REFERENCES profiles(id) NOT NULL,
    session_id TEXT UNIQUE NOT NULL,
    payment_id TEXT,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'usd',
    payment_status TEXT DEFAULT 'pending',
    status TEXT DEFAULT 'initiated',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_role ON profiles(user_role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_available ON profiles(is_available);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_requester_id ON tasks(requester_id);
CREATE INDEX IF NOT EXISTS idx_tasks_helper_id ON tasks(helper_id);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_task_id ON ratings(task_id);
CREATE INDEX IF NOT EXISTS idx_ratings_to_user_id ON ratings(to_user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_session_id ON payment_transactions(session_id);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Profiles
-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Anyone can view helper profiles (for browsing)
CREATE POLICY "Anyone can view helper profiles" ON profiles
    FOR SELECT USING (user_role = 'helper');

-- RLS Policies for Tasks
-- Requesters can create tasks (any authenticated user with role 'requester' or 'both')
CREATE POLICY "Users can create tasks" ON tasks
    FOR INSERT WITH CHECK (
        auth.uid() = requester_id
    );

-- Requesters can view their own tasks
CREATE POLICY "Requesters can view own tasks" ON tasks
    FOR SELECT USING (auth.uid() = requester_id);

-- Helpers can view open tasks
CREATE POLICY "Helpers can view open tasks" ON tasks
    FOR SELECT USING (status = 'open');

-- Helpers can view their accepted tasks
CREATE POLICY "Helpers can view accepted tasks" ON tasks
    FOR SELECT USING (auth.uid() = helper_id);

-- Helpers can update tasks they've accepted
CREATE POLICY "Helpers can update accepted tasks" ON tasks
    FOR UPDATE USING (auth.uid() = helper_id);

-- Requesters can update their own tasks
CREATE POLICY "Requesters can update own tasks" ON tasks
    FOR UPDATE USING (auth.uid() = requester_id);

-- RLS Policies for Ratings
-- Users can create ratings for completed tasks they're involved in
CREATE POLICY "Users can create ratings" ON ratings
    FOR INSERT WITH CHECK (
        auth.uid() = from_user_id AND
        EXISTS (
            SELECT 1 FROM tasks 
            WHERE id = task_id 
            AND status = 'completed'
            AND (requester_id = auth.uid() OR helper_id = auth.uid())
        )
    );

-- Users can view ratings they gave or received
CREATE POLICY "Users can view their ratings" ON ratings
    FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- RLS Policies for Payment Transactions
-- Users can view their own payment transactions
CREATE POLICY "Users can view own transactions" ON payment_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own payment transactions
CREATE POLICY "Users can create own transactions" ON payment_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can update payment transactions (for webhooks)
CREATE POLICY "Service can update transactions" ON payment_transactions
    FOR UPDATE USING (true);

-- Create Storage Bucket for Receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for Receipts
-- Allow authenticated users to upload receipts
CREATE POLICY "Authenticated users can upload receipts" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'receipts' AND
        auth.role() = 'authenticated'
    );

-- Allow authenticated users involved in tasks to view receipts
CREATE POLICY "Authenticated users can view receipts" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'receipts' AND
        auth.role() = 'authenticated'
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update user ratings after a new rating is added
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles
    SET rating = (
        SELECT ROUND(AVG(rating)::numeric, 2)
        FROM ratings
        WHERE to_user_id = NEW.to_user_id
    )
    WHERE id = NEW.to_user_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update ratings
CREATE TRIGGER update_rating_after_insert AFTER INSERT ON ratings
    FOR EACH ROW EXECUTE FUNCTION update_user_rating();

-- Function to increment completed_tasks counter
CREATE OR REPLACE FUNCTION increment_completed_tasks()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE profiles
        SET completed_tasks = completed_tasks + 1
        WHERE id = NEW.helper_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to increment completed tasks
CREATE TRIGGER increment_completed_tasks_trigger AFTER UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION increment_completed_tasks();
