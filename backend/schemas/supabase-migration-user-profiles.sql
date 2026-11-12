-- ==========================================================================
-- User Profiles Migration for Shanmuga Organics
-- Run this in your Supabase SQL Editor to add user profile support
-- ==========================================================================

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,

  -- Default addresses
  default_shipping_address TEXT,
  default_shipping_city TEXT,
  default_shipping_state TEXT,
  default_shipping_pincode TEXT,

  -- Preferences
  newsletter_subscribed BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow the admin dashboard (and public pages) to LIST profiles.
-- Without this, RLS returns zero rows whenever the viewer is not the row
-- owner, so the admin Customers page would always show an empty list.
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON user_profiles;
CREATE POLICY "Profiles are viewable by everyone" ON user_profiles
  FOR SELECT USING (true);

-- Create or replace the updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for user_profiles updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create user profile when a new user signs up
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, email, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to auto-create profiles
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Create profiles for existing users (if any)
INSERT INTO public.user_profiles (id, full_name, email, created_at)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', ''),
  au.email,
  au.created_at
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = au.id)
ON CONFLICT (id) DO NOTHING;

-- Backfill email for profiles that are missing it
UPDATE public.user_profiles up
   SET email = au.email
  FROM auth.users au
 WHERE au.id = up.id
   AND (up.email IS NULL OR up.email = '')
   AND au.email IS NOT NULL;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'User profiles table created successfully!';
  RAISE NOTICE 'Auto-create trigger set up for new signups.';
  RAISE NOTICE 'Existing users have been migrated.';
END $$;
