-- LOCAL stack only: minimal storefront schema with private payment/admin data.
-- Do NOT apply this migration to a linked/hosted Supabase project.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text, email text, phone text, avatar_url text,
  default_shipping_address text, default_shipping_city text,
  default_shipping_state text, default_shipping_pincode text,
  notify_orders boolean DEFAULT true, notify_promo boolean DEFAULT false,
  newsletter_subscribed boolean DEFAULT false,
  is_author boolean DEFAULT false, is_author_published boolean DEFAULT false,
  author_slug text UNIQUE, author_bio text, author_avatar_url text,
  author_socials jsonb DEFAULT '{}'::jsonb, author_published_at timestamptz,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE FUNCTION public.create_user_profile() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, email, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email, NEW.raw_user_meta_data->>'phone');
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.create_user_profile();
REVOKE ALL ON FUNCTION public.create_user_profile() FROM PUBLIC, anon, authenticated;

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), name text NOT NULL,
  name_tamil text, slug text UNIQUE NOT NULL, description text, icon text,
  image_url text, order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), name text NOT NULL, name_tamil text,
  slug text UNIQUE NOT NULL, description text, short_description text,
  category_slug text REFERENCES public.categories(slug) ON DELETE SET NULL,
  price numeric(10,2) NOT NULL CHECK (price > 0), original_price numeric(10,2),
  discount_percentage integer, unit text DEFAULT 'ml', stock_quantity integer DEFAULT 0,
  sku text UNIQUE, image_url text, images jsonb, featured boolean DEFAULT false,
  bestseller boolean DEFAULT false, is_new boolean DEFAULT false,
  in_stock boolean DEFAULT true, rating numeric(2,1) DEFAULT 0,
  reviews_count integer DEFAULT 0, meta_title text, meta_description text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), order_number text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name text NOT NULL, customer_email text NOT NULL, customer_phone text NOT NULL,
  shipping_address text NOT NULL, shipping_city text NOT NULL,
  shipping_state text NOT NULL, shipping_pincode text NOT NULL,
  billing_address text, billing_city text, billing_state text, billing_pincode text,
  subtotal numeric(10,2) NOT NULL, shipping_cost numeric(10,2) DEFAULT 0,
  tax numeric(10,2) DEFAULT 0, discount numeric(10,2) DEFAULT 0,
  total numeric(10,2) NOT NULL, status text DEFAULT 'pending',
  payment_status text DEFAULT 'pending', payment_method text,
  customer_notes text, admin_notes text, tracking_number text, tracking_url text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
  shipped_at timestamptz, delivered_at timestamptz
);
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL, product_slug text, product_image text,
  price numeric(10,2) NOT NULL, quantity integer NOT NULL,
  subtotal numeric(10,2) NOT NULL, created_at timestamptz DEFAULT now()
);
CREATE TABLE public.wishlist (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(), UNIQUE(user_id, product_id)
);
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5), title text,
  comment text NOT NULL, reviewer_name text NOT NULL, reviewer_email text,
  approved boolean DEFAULT false, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.contact_submissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), name text NOT NULL, email text NOT NULL,
  phone text, subject text, message text NOT NULL,
  status text DEFAULT 'new', created_at timestamptz DEFAULT now()
);
CREATE TABLE public.bulk_enquiries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), company_name text NOT NULL,
  contact_person text NOT NULL, email text NOT NULL, phone text NOT NULL,
  products text NOT NULL, quantity text NOT NULL, message text,
  status text DEFAULT 'new', created_at timestamptz DEFAULT now()
);
CREATE TABLE public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), email text UNIQUE NOT NULL,
  name text, subscribed boolean DEFAULT true,
  subscribed_at timestamptz DEFAULT now(), unsubscribed_at timestamptz
);
CREATE TABLE public.site_content (
  id text PRIMARY KEY, payload jsonb NOT NULL, updated_at timestamptz DEFAULT now()
);
INSERT INTO public.site_content (id, payload)
VALUES ('global', '{"v":1,"updatedAt":0,"nodes":{},"inserts":{}}');
CREATE TABLE public.ownpay_payment_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);
CREATE TABLE public.demo_payment_attempts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference text NOT NULL UNIQUE, total numeric(10,2) NOT NULL CHECK (total > 0),
  currency text NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  snapshot jsonb NOT NULL, status text NOT NULL DEFAULT 'demo' CHECK (status = 'demo'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX demo_payment_attempts_created_idx ON public.demo_payment_attempts(created_at DESC);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ownpay_payment_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_payment_attempts ENABLE ROW LEVEL SECURITY;

-- No browser writes to catalog, orders, demo ledger, or admin allowlist.
REVOKE ALL ON public.categories, public.products, public.orders, public.order_items,
  public.ownpay_payment_admins, public.demo_payment_attempts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.categories, public.products TO anon, authenticated;
GRANT SELECT ON public.orders, public.order_items TO authenticated;
CREATE POLICY catalog_read ON public.categories FOR SELECT USING (true);
CREATE POLICY products_read ON public.products FOR SELECT USING (true);
CREATE POLICY own_orders ON public.orders FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY own_order_items ON public.order_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = (select auth.uid())));
CREATE POLICY own_profile_read ON public.user_profiles FOR SELECT TO authenticated USING ((select auth.uid()) = id);
CREATE POLICY own_profile_insert ON public.user_profiles FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = id);
CREATE POLICY own_profile_update ON public.user_profiles FOR UPDATE TO authenticated USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);
CREATE POLICY own_wishlist_read ON public.wishlist FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY own_wishlist_insert ON public.wishlist FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY own_wishlist_delete ON public.wishlist FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY approved_reviews ON public.reviews FOR SELECT USING (approved = true);
CREATE POLICY submit_review ON public.reviews FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id AND approved = false);
CREATE POLICY submit_contact ON public.contact_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY submit_bulk ON public.bulk_enquiries FOR INSERT WITH CHECK (true);
CREATE POLICY subscribe_newsletter ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);
REVOKE INSERT, UPDATE, DELETE ON public.site_content FROM anon, authenticated;
GRANT SELECT ON public.site_content TO anon, authenticated;
CREATE POLICY content_read ON public.site_content FOR SELECT USING (true);