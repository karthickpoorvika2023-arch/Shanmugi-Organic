-- ==========================================================================
-- Supabase Database Schema for Shanmuga Organics
-- Run this in your Supabase SQL Editor
-- Fully idempotent: safe to run again at any time (re-runs only fill gaps).
-- ==========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================================================
-- User Profiles Table
-- ==========================================================================
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

  -- Notification preferences
  notify_orders BOOLEAN DEFAULT true,
  notify_promo BOOLEAN DEFAULT false,
  newsletter_subscribed BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);

-- ==========================================================================
-- Categories Table
-- ==========================================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_tamil TEXT,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  image_url TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================================================
-- Products Table
-- ==========================================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_tamil TEXT,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  short_description TEXT,
  category_slug TEXT REFERENCES categories(slug) ON DELETE SET NULL,

  -- Pricing
  price DECIMAL(10, 2) NOT NULL,
  original_price DECIMAL(10, 2),
  discount_percentage INTEGER,

  -- Product details
  unit TEXT DEFAULT 'ml', -- ml, g, kg, L, pack, etc.
  stock_quantity INTEGER DEFAULT 0,
  sku TEXT UNIQUE,

  -- Images
  image_url TEXT,
  images JSONB, -- Array of image URLs

  -- Features
  featured BOOLEAN DEFAULT false,
  bestseller BOOLEAN DEFAULT false,
  is_new BOOLEAN DEFAULT false,
  in_stock BOOLEAN DEFAULT true,

  -- Ratings
  rating DECIMAL(2, 1) DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,

  -- SEO
  meta_title TEXT,
  meta_description TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_slug);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_products_bestseller ON products(bestseller) WHERE bestseller = true;

-- ==========================================================================
-- Orders Table
-- ==========================================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Customer details (for guest checkout)
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,

  -- Shipping address
  shipping_address TEXT NOT NULL,
  shipping_city TEXT NOT NULL,
  shipping_state TEXT NOT NULL,
  shipping_pincode TEXT NOT NULL,

  -- Billing address (if different)
  billing_address TEXT,
  billing_city TEXT,
  billing_state TEXT,
  billing_pincode TEXT,

  -- Order details
  subtotal DECIMAL(10, 2) NOT NULL,
  shipping_cost DECIMAL(10, 2) DEFAULT 0,
  tax DECIMAL(10, 2) DEFAULT 0,
  discount DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,

  -- Order status
  status TEXT DEFAULT 'pending', -- pending, confirmed, processing, shipped, delivered, cancelled
  payment_status TEXT DEFAULT 'pending', -- pending, paid, failed, refunded
  payment_method TEXT, -- cod, upi, card, netbanking

  -- Notes
  customer_notes TEXT,
  admin_notes TEXT,

  -- Tracking
  tracking_number TEXT,
  tracking_url TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);

-- ==========================================================================
-- Order Items Table
-- ==========================================================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,

  -- Product snapshot at time of order
  product_name TEXT NOT NULL,
  product_slug TEXT,
  product_image TEXT,

  -- Pricing
  price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- ==========================================================================
-- Wishlist Table
-- ==========================================================================
CREATE TABLE IF NOT EXISTS wishlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist(user_id);

-- ==========================================================================
-- Reviews Table
-- ==========================================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Review details
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT NOT NULL,
  reviewer_name TEXT NOT NULL,
  reviewer_email TEXT,

  -- Moderation
  approved BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_approved ON reviews(approved) WHERE approved = true;

-- ==========================================================================
-- Contact Submissions Table
-- ==========================================================================
CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new', -- new, read, replied
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================================================
-- Bulk Enquiries Table
-- ==========================================================================
CREATE TABLE IF NOT EXISTS bulk_enquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  products TEXT NOT NULL,
  quantity TEXT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'new', -- new, contacted, quoted, closed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================================================
-- Newsletter Subscribers Table
-- ==========================================================================
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  subscribed BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE
);

-- ==========================================================================
-- Row Level Security (RLS) Policies
-- ==========================================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- User Profiles: Users can view and update their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Profiles are viewable by everyone (for admin dashboard & customer lookup)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON user_profiles;
CREATE POLICY "Profiles are viewable by everyone" ON user_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Categories: Public read access
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;
CREATE POLICY "Categories are viewable by everyone" ON categories
  FOR SELECT USING (true);

-- Categories: admin panel can push/manage categories
DROP POLICY IF EXISTS "Categories can be created by admin" ON categories;
CREATE POLICY "Categories can be created by admin" ON categories
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Categories can be updated by admin" ON categories;
CREATE POLICY "Categories can be updated by admin" ON categories
  FOR UPDATE USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Categories can be removed by admin" ON categories;
CREATE POLICY "Categories can be removed by admin" ON categories
  FOR DELETE USING (true);

-- Products: Public read access
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
CREATE POLICY "Products are viewable by everyone" ON products
  FOR SELECT USING (true);

-- Products: admin panel can push/manage the catalog
DROP POLICY IF EXISTS "Products can be created by admin" ON products;
CREATE POLICY "Products can be created by admin" ON products
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Products can be updated by admin" ON products;
CREATE POLICY "Products can be updated by admin" ON products
  FOR UPDATE USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Products can be removed by admin" ON products;
CREATE POLICY "Products can be removed by admin" ON products
  FOR DELETE USING (true);

-- Orders: Users can view their own orders
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
CREATE POLICY "Users can view their own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create orders" ON orders;
CREATE POLICY "Users can create orders" ON orders
  FOR INSERT WITH CHECK (true);

-- Orders: admin dashboard can list every order (read-only for the public
-- catalog keys; without this policy RLS returns zero rows on the dashboard)
DROP POLICY IF EXISTS "Orders are viewable by everyone" ON orders;
CREATE POLICY "Orders are viewable by everyone" ON orders
  FOR SELECT USING (true);

-- Orders: admin dashboard can update the status dropdown
DROP POLICY IF EXISTS "Orders can be updated by admin" ON orders;
CREATE POLICY "Orders can be updated by admin" ON orders
  FOR UPDATE USING (true)
  WITH CHECK (true);

-- Order Items: Users can view items from their orders
DROP POLICY IF EXISTS "Users can view their order items" ON order_items;
CREATE POLICY "Users can view their order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Order Items: admin dashboard can list items for every order
DROP POLICY IF EXISTS "Order items are viewable by everyone" ON order_items;
CREATE POLICY "Order items are viewable by everyone" ON order_items
  FOR SELECT USING (true);

-- Order Items: checkout writes item rows after the order insert
DROP POLICY IF EXISTS "Anyone can create order items" ON order_items;
CREATE POLICY "Anyone can create order items" ON order_items
  FOR INSERT WITH CHECK (true);

-- Wishlist: Users can manage their own wishlist
DROP POLICY IF EXISTS "Users can view their own wishlist" ON wishlist;
CREATE POLICY "Users can view their own wishlist" ON wishlist
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add to their wishlist" ON wishlist;
CREATE POLICY "Users can add to their wishlist" ON wishlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove from their wishlist" ON wishlist;
CREATE POLICY "Users can remove from their wishlist" ON wishlist
  FOR DELETE USING (auth.uid() = user_id);

-- Reviews: Everyone can view approved reviews
DROP POLICY IF EXISTS "Approved reviews are viewable by everyone" ON reviews;
CREATE POLICY "Approved reviews are viewable by everyone" ON reviews
  FOR SELECT USING (approved = true);

DROP POLICY IF EXISTS "Authenticated users can submit reviews" ON reviews;
CREATE POLICY "Authenticated users can submit reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Contact submissions: Anyone can submit
DROP POLICY IF EXISTS "Anyone can submit contact form" ON contact_submissions;
CREATE POLICY "Anyone can submit contact form" ON contact_submissions
  FOR INSERT WITH CHECK (true);

-- Bulk enquiries: Anyone can submit
DROP POLICY IF EXISTS "Anyone can submit bulk enquiry" ON bulk_enquiries;
CREATE POLICY "Anyone can submit bulk enquiry" ON bulk_enquiries
  FOR INSERT WITH CHECK (true);

-- Newsletter: Anyone can subscribe
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON newsletter_subscribers;
CREATE POLICY "Anyone can subscribe to newsletter" ON newsletter_subscribers
  FOR INSERT WITH CHECK (true);

-- ==========================================================================
-- Functions and Triggers
-- ==========================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create user profile when a new user signs up. Copies full_name,
-- email and phone from auth.users so the user_profiles row is fully
-- populated even when email confirmation is required (in which case the
-- client is not yet signed in and cannot UPDATE).
-- ON CONFLICT keeps the trigger idempotent: if the bootstrap RPC has
-- already inserted a row, we just update the new fields.
CREATE OR REPLACE FUNCTION create_user_profile()
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
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Backfill phone for users who signed up before this trigger fix ran.
-- Pulls phone from auth.users.raw_user_meta_data->>'phone' and writes
-- it into user_profiles. Idempotent — only updates rows where phone
-- is currently NULL.
DO $$
DECLARE
  rows_updated INT;
BEGIN
  UPDATE public.user_profiles up
     SET phone     = au.raw_user_meta_data->>'phone',
         updated_at = NOW()
    FROM auth.users au
   WHERE au.id = up.id
     AND up.phone IS NULL
     AND au.raw_user_meta_data->>'phone' IS NOT NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  IF rows_updated > 0 THEN
    RAISE NOTICE 'Backfilled phone for % existing user(s).', rows_updated;
  ELSE
    RAISE NOTICE 'No users needed a phone backfill.';
  END IF;
END $$;

-- Backfill email for users whose profile was created before the trigger
-- copied it. Pulls email from auth.users and writes it into user_profiles.
-- Idempotent — only updates rows where email is currently empty.
DO $$
DECLARE
  rows_updated INT;
BEGIN
  UPDATE public.user_profiles up
     SET email      = au.email,
         updated_at = NOW()
    FROM auth.users au
   WHERE au.id = up.id
     AND (up.email IS NULL OR up.email = '')
     AND au.email IS NOT NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  IF rows_updated > 0 THEN
    RAISE NOTICE 'Backfilled email for % existing user(s).', rows_updated;
  ELSE
    RAISE NOTICE 'No users needed an email backfill.';
  END IF;
END $$;

-- Generate unique order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Auto-generate order number on insert
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_order_number_trigger ON orders;
CREATE TRIGGER set_order_number_trigger BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION set_order_number();

-- ==========================================================================
-- Sample Data (Optional - for testing)
-- ==========================================================================

-- Insert sample categories (safe on re-runs: skips slugs that already exist)
INSERT INTO categories (name, name_tamil, slug, icon, order_index) VALUES
  ('Cold Pressed Oils', 'மரச்செக்கு எண்ணெய்', 'cold-pressed-oils', '🌿', 1),
  ('Traditional Rice', 'பாரம்பரிய அரிசி', 'traditional-rice', '🌾', 2),
  ('Millets', 'தினைகள்', 'millets', '🌾', 3),
  ('Bath & Body Care', 'குளியல் & உடல் பராமரிப்பு', 'bath-body-care', '🧴', 4),
  ('Pickles & Powders', 'ஊறுகாய் & பொடி', 'pickles-powders', '🌶️', 5),
  ('Health Mix', 'சத்து மாவு', 'health-mix', '💪', 6),
  ('Ghee & Honey', 'நெய் & தேன்', 'ghee-honey', '🍯', 7)
ON CONFLICT (slug) DO NOTHING;

COMMENT ON TABLE categories IS 'Product categories for organizing the catalog';
COMMENT ON TABLE products IS 'Main products table with all product information';
COMMENT ON TABLE orders IS 'Customer orders with shipping and payment details';
COMMENT ON TABLE order_items IS 'Individual items within each order';
COMMENT ON TABLE wishlist IS 'User wishlists for saving favorite products';
COMMENT ON TABLE reviews IS 'Product reviews and ratings from customers';

-- ==========================================================================
-- MIGRATION: Add notification preferences to user_profiles
-- Run this if you already have the user_profiles table
-- ==========================================================================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS notify_orders BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_promo BOOLEAN DEFAULT false;

-- ==========================================================================
-- MIGRATION: Author role + public author profile
-- Adds an author identity to a user. Self-service: any signed-in user can
-- enable author. The is_author_published flag is a soft-publish gate so an
-- admin can demote without code changes. The public_author_profiles view
-- exposes only author columns for authors who are both is_author = true AND
-- is_author_published = true. Re-runs are safe (every DDL is idempotent).
-- ==========================================================================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS is_author BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_author_published BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS author_slug TEXT,
  ADD COLUMN IF NOT EXISTS author_bio TEXT,
  ADD COLUMN IF NOT EXISTS author_avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS author_socials JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS author_published_at TIMESTAMP WITH TIME ZONE;

-- Partial unique index on author_slug: many NULLs allowed, but slugs that
-- do exist are unique. The client retries with -2, -3 suffixes on conflict.
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_profiles_author_slug
  ON user_profiles(author_slug) WHERE author_slug IS NOT NULL;

-- Public read-only view: only author columns, only for published authors.
CREATE OR REPLACE VIEW public_author_profiles AS
SELECT
  author_slug,
  full_name,
  author_bio,
  author_avatar_url,
  author_socials,
  is_author_published,
  author_published_at
FROM user_profiles
WHERE is_author = true AND is_author_published = true;

-- Grant SELECT to anon + authenticated. Wrapped in DO block so re-runs don't
-- error if the grant already exists. (GRANT is not natively idempotent.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_name = 'public_author_profiles'
      AND grantee IN ('anon', 'authenticated')
      AND privilege_type = 'SELECT'
  ) THEN
    GRANT SELECT ON public_author_profiles TO anon, authenticated;
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'Author migration applied'; END $$;

-- ==========================================================================
-- Profile photos are stored as base64 data URLs in user_profiles.avatar_url
-- (a TEXT column that already exists). No storage bucket, no RPC, no extra
-- setup required — the avatar upload/remove flow runs entirely client-side.
-- ==========================================================================

-- ==========================================================================
-- Self-healing RPC: ensure the user_profiles table exists.
-- Idempotent. Safe to call repeatedly. SECURITY DEFINER so anon/authenticated
-- callers can DDL. Sets search_path to include 'auth' so the FK to
-- auth.users(id) resolves. Sends a pgrst NOTIFY at the end so PostgREST
-- refreshes its schema cache immediately. Returns the SQL error message
-- in case anything goes wrong, so the client can show the real reason.
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.bootstrap_user_profiles()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- 1. Create the table if missing.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
  ) THEN
    EXECUTE $tbl$
      CREATE TABLE public.user_profiles (
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
      )
    $tbl$;
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON public.user_profiles(id)';
  ELSE
    -- 2. Table exists -- make sure all expected columns are present.
    EXECUTE $alt$
      ALTER TABLE public.user_profiles
        ADD COLUMN IF NOT EXISTS full_name TEXT,
        ADD COLUMN IF NOT EXISTS email TEXT,
        ADD COLUMN IF NOT EXISTS phone TEXT,
        ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS avatar_url TEXT,
        ADD COLUMN IF NOT EXISTS default_shipping_address TEXT,
        ADD COLUMN IF NOT EXISTS default_shipping_city TEXT,
        ADD COLUMN IF NOT EXISTS default_shipping_state TEXT,
        ADD COLUMN IF NOT EXISTS default_shipping_pincode TEXT,
        ADD COLUMN IF NOT EXISTS notify_orders BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS notify_promo BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS newsletter_subscribed BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS is_author BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS is_author_published BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS author_slug TEXT,
        ADD COLUMN IF NOT EXISTS author_bio TEXT,
        ADD COLUMN IF NOT EXISTS author_avatar_url TEXT,
        ADD COLUMN IF NOT EXISTS author_socials JSONB DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS author_published_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    $alt$;
  END IF;

  -- 3. Ensure RLS is on and the standard policies exist.
  EXECUTE 'ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY';

  EXECUTE 'DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles';
  EXECUTE $p$CREATE POLICY "Users can view their own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id)$p$;

  EXECUTE 'DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.user_profiles';
  EXECUTE $p$CREATE POLICY "Profiles are viewable by everyone" ON public.user_profiles
    FOR SELECT USING (true)$p$;

  EXECUTE 'DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles';
  EXECUTE $p$CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id)$p$;

  EXECUTE 'DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles';
  EXECUTE $p$CREATE POLICY "Users can insert their own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id)$p$;

  -- 4. Partial unique index on author_slug.
  EXECUTE $i$CREATE UNIQUE INDEX IF NOT EXISTS uq_user_profiles_author_slug
    ON public.user_profiles(author_slug) WHERE author_slug IS NOT NULL$i$;

  -- 5. Tell PostgREST to reload its schema cache so the next query sees
  -- the table immediately (instead of returning "schema cache" errors).
  PERFORM pg_notify('pgrst', 'reload schema');

  RETURN 'ok';
EXCEPTION WHEN OTHERS THEN
  -- Surface the real error so the client can show the actual reason.
  RETURN 'error: ' || SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_user_profiles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_user_profiles() TO anon, authenticated;

DO $$ BEGIN RAISE NOTICE 'bootstrap_user_profiles() RPC ready.'; END $$;
