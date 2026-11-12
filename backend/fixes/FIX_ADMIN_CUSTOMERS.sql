-- ==========================================================================
-- FIX: Supabase users don't show up on the Admin panel → Customers page
-- Run this ONCE in the Supabase SQL Editor:
--   Supabase Dashboard → SQL Editor → New query → paste → Run
--
-- What it does (all steps are idempotent / safe to re-run):
--   1. Makes sure the user_profiles table exists (with the email column)
--   2. Creates a profile row for EVERY auth user that doesn't have one yet
--      (this backfills the users you already created in Supabase)
--   3. Copies the email of every profile that is missing it
--   4. Updates the signup trigger so future signups copy name/email/phone
--   5. Adds the "Profiles are viewable by everyone" SELECT policy so the
--      dashboard can LIST profiles even when nobody is signed in
--   6. Refreshes the PostgREST schema cache so the API sees changes at once
-- ==========================================================================

-- 1. Table (matches supabase-schema.sql)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  default_shipping_address TEXT,
  default_shipping_city TEXT,
  default_shipping_state TEXT,
  default_shipping_pincode TEXT,
  notify_orders BOOLEAN DEFAULT true,
  notify_promo BOOLEAN DEFAULT false,
  newsletter_subscribed BOOLEAN DEFAULT false,
  is_author BOOLEAN DEFAULT false,
  is_author_published BOOLEAN DEFAULT false,
  author_slug TEXT,
  author_bio TEXT,
  author_avatar_url TEXT,
  author_socials JSONB DEFAULT '{}'::jsonb,
  author_published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS email TEXT;
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON public.user_profiles(id);

-- 2. Create a profile for every auth user that has none (backfill)
INSERT INTO public.user_profiles (id, full_name, email, phone, created_at, updated_at)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email, 'Customer'),
  au.email,
  COALESCE(au.raw_user_meta_data->>'phone', au.phone),
  au.created_at,
  NOW()
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = au.id)
ON CONFLICT (id) DO NOTHING;

-- 3. Copy email onto any profile that is missing it
UPDATE public.user_profiles up
   SET email      = au.email,
       updated_at = NOW()
  FROM auth.users au
 WHERE au.id = up.id
   AND (up.email IS NULL OR up.email = '')
   AND au.email IS NOT NULL;

-- Also backfill phone from signup metadata while we are here
UPDATE public.user_profiles up
   SET phone      = au.raw_user_meta_data->>'phone',
       updated_at = NOW()
  FROM auth.users au
 WHERE au.id = up.id
   AND (up.phone IS NULL OR up.phone = '')
   AND au.raw_user_meta_data->>'phone' IS NOT NULL;

-- 4. Signup trigger — also copies email (older versions only copied name)
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, email, phone, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.user_profiles.full_name),
    email     = COALESCE(EXCLUDED.email,     public.user_profiles.email),
    phone     = COALESCE(EXCLUDED.phone,     public.user_profiles.phone),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_profile();

-- 5. RLS: allow the admin dashboard to list every profile.
--    (Users can still only edit their own row — that policy stays.)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.user_profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.user_profiles
  FOR SELECT USING (true);

-- 6. Refresh PostgREST schema cache + report the result
DO $$
DECLARE
  profile_count INT;
  auth_count INT;
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
  SELECT COUNT(*) INTO profile_count FROM public.user_profiles;
  SELECT COUNT(*) INTO auth_count FROM auth.users;
  RAISE NOTICE 'user_profiles rows: %, auth.users rows: %', profile_count, auth_count;
  IF profile_count >= auth_count THEN
    RAISE NOTICE 'OK — every auth user now has a profile. Reload the admin Customers page.';
  ELSE
    RAISE NOTICE 'WARNING: some auth users still have no profile — check for errors above.';
  END IF;
END $$;
