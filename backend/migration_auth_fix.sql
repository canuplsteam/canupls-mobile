-- ============================================
-- Canupls - Auth Fix Migration
-- Run this in your Supabase SQL Editor
-- This fixes signup & OAuth profile creation
-- ============================================

-- 1. Create a function that auto-creates a profile when a new user signs up
-- This runs with service role permissions, bypassing RLS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    user_role,
    full_name,
    phone,
    address,
    address_lat,
    address_lng,
    rating,
    completed_tasks,
    is_available
  )
  VALUES (
    NEW.id,
    'both',
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'address', ''),
    (NEW.raw_user_meta_data->>'address_lat')::DECIMAL(10,8),
    (NEW.raw_user_meta_data->>'address_lng')::DECIMAL(11,8),
    0,
    0,
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 2. Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Add the redirect URL to Supabase allowed redirect URLs
-- Go to Supabase Dashboard > Authentication > URL Configuration
-- Add these to "Redirect URLs":
--   canupls://auth/callback
--   exp://127.0.0.1:8081/--/auth/callback
--   exp://192.168.*.*:8081/--/auth/callback

-- 4. Enable Google OAuth in Supabase:
--   Go to Authentication > Providers > Google
--   Enable it and add your Google OAuth Client ID and Secret
--   Set the Authorized redirect URI in Google Cloud Console to:
--   https://<your-project-ref>.supabase.co/auth/v1/callback

-- 5. Enable Microsoft/Azure OAuth in Supabase:
--   Go to Authentication > Providers > Azure
--   Enable it and add your Azure AD Application ID and Secret
--   Set the Redirect URI in Azure Portal to:
--   https://<your-project-ref>.supabase.co/auth/v1/callback

-- ============================================
-- DONE! Auth fix applied.
-- ============================================
