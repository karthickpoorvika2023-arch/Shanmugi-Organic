-- ADMIN-ONLY DEMO. No money is collected and no real orders are created.
-- Apply once before deploying demo-payment-kit. Old unsafe policies must stay disabled.
-- WARNING: Revoking public product writes disables the old browser-side admin
-- product editor. A server-authorized catalog writer is needed before using it.
-- Do not re-run legacy supabase-schema.sql, FIX_ADMIN_CUSTOMERS.sql,
-- FIX_PRODUCTS_SYNC.sql, or supabase-products-schema.sql afterwards:
-- they re-create broad policies on private or catalog tables.
-- Ensure the approved admin is already in public.ownpay_payment_admins.
-- The Edge Function uses its UUID allowlist and rejects other signed-in users.
BEGIN;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS public.demo_payment_attempts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference text NOT NULL UNIQUE,
  total numeric(10,2) NOT NULL CHECK (total > 0),
  currency text NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  snapshot jsonb NOT NULL,
  status text NOT NULL DEFAULT 'demo' CHECK (status = 'demo'),
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.demo_payment_attempts IS 'Admin-only test attempts; no real money or confirmed orders';
CREATE INDEX IF NOT EXISTS demo_payment_attempts_created_idx ON public.demo_payment_attempts(created_at DESC);
ALTER TABLE public.demo_payment_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.demo_payment_attempts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.ownpay_payment_admins FROM PUBLIC, anon, authenticated;

-- Demo totals are calculated from products. Public catalog writes would let an
-- anonymous visitor set arbitrary prices (and also alter the live storefront).
DROP POLICY IF EXISTS "Products can be created by admin" ON public.products;
DROP POLICY IF EXISTS "Products can be updated by admin" ON public.products;
DROP POLICY IF EXISTS "Products can be removed by admin" ON public.products;
-- Remove alternative authenticated-write policies from older product schema scripts.
DROP POLICY IF EXISTS "products_insert_auth" ON public.products;
DROP POLICY IF EXISTS "products_update_auth" ON public.products;
DROP POLICY IF EXISTS "products_delete_auth" ON public.products;
REVOKE INSERT, UPDATE, DELETE ON public.products FROM PUBLIC, anon, authenticated;

-- Categories also allow anonymous deletes; products.category_slug uses ON DELETE SET NULL.
DROP POLICY IF EXISTS "Categories can be created by admin" ON public.categories;
DROP POLICY IF EXISTS "Categories can be updated by admin" ON public.categories;
DROP POLICY IF EXISTS "Categories can be removed by admin" ON public.categories;
DROP POLICY IF EXISTS "categories_insert_auth" ON public.categories;
DROP POLICY IF EXISTS "categories_update_auth" ON public.categories;
DROP POLICY IF EXISTS "categories_delete_auth" ON public.categories;
REVOKE INSERT, UPDATE, DELETE ON public.categories FROM PUBLIC, anon, authenticated;

-- Signed-in customers see only their own existing orders; browser writes are forbidden.
DROP POLICY IF EXISTS "Orders are viewable by everyone" ON public.orders;
DROP POLICY IF EXISTS "Orders can be updated by admin" ON public.orders;
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Order items are viewable by everyone" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
REVOKE ALL ON public.orders, public.order_items FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.orders, public.order_items TO authenticated;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can view their order items" ON public.order_items;
CREATE POLICY "Users can view their order items" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = (select auth.uid())));

-- The existing SECURITY DEFINER bootstrap RPC re-creates public profile access.
-- Remove its execute permission before revoking the public profile policy.
REVOKE ALL ON FUNCTION public.bootstrap_user_profiles() FROM PUBLIC, anon, authenticated;
-- Trigger execution is not controlled by EXECUTE grants; auth.users signup trigger still works.
REVOKE ALL ON FUNCTION public.create_user_profile() FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.user_profiles;
REVOKE ALL ON public.user_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile" ON public.user_profiles FOR SELECT TO authenticated USING ((select auth.uid()) = id);
-- Preserve existing own-row INSERT/UPDATE policies (no broad profile writes).
COMMIT;