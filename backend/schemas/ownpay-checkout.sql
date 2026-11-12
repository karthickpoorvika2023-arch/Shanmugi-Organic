-- Run in the Supabase SQL editor before deploying ownpay-checkout.
-- Prevent the existing public insert/update policies from forging paid orders.
BEGIN;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS public.ownpay_checkouts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  reference text NOT NULL UNIQUE,
  payment_id text UNIQUE,
  trx_id text UNIQUE,
  total numeric(10,2) NOT NULL CHECK (total > 0),
  currency text NOT NULL CHECK (currency = 'INR'),
  snapshot jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
ALTER TABLE public.ownpay_checkouts ADD COLUMN IF NOT EXISTS paid_at timestamptz;
CREATE INDEX IF NOT EXISTS ownpay_checkouts_user_idx ON public.ownpay_checkouts(user_id);
ALTER TABLE public.ownpay_checkouts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ownpay_checkouts FROM anon, authenticated;

-- Only explicitly approved Supabase Auth users may read the payment ledger.
-- Add their UUIDs in the SQL Editor, never grant browser write access here.
CREATE TABLE IF NOT EXISTS public.ownpay_payment_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.ownpay_payment_admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ownpay_payment_admins FROM PUBLIC, anon, authenticated;

-- Existing public order policies expose customer addresses and allow forgery.
-- Signed-in customers can read only their own orders and items after this change.
DROP POLICY IF EXISTS "Orders are viewable by everyone" ON public.orders;
DROP POLICY IF EXISTS "Orders can be updated by admin" ON public.orders;
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Order items are viewable by everyone" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
REVOKE ALL ON public.orders FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.order_items FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.orders, public.order_items TO authenticated;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can view their order items" ON public.order_items;
CREATE POLICY "Users can view their order items" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.orders WHERE public.orders.id = order_items.order_id AND public.orders.user_id = (select auth.uid())));

CREATE OR REPLACE FUNCTION public.finalize_ownpay_checkout(p_checkout_id uuid, p_payment_id text, p_trx_id text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE p public.ownpay_checkouts%ROWTYPE;
DECLARE line jsonb;
DECLARE o_id uuid;
BEGIN
  SELECT * INTO p FROM public.ownpay_checkouts WHERE id = p_checkout_id FOR UPDATE;
  IF NOT FOUND OR p.payment_id IS DISTINCT FROM p_payment_id OR p.currency <> 'INR'
    OR p_trx_id IS NULL OR length(p_trx_id) < 1 THEN
    RAISE EXCEPTION 'Invalid checkout';
  END IF;
  IF p.status = 'paid' THEN RETURN p.reference; END IF;
  IF EXISTS(SELECT 1 FROM public.ownpay_checkouts WHERE trx_id = p_trx_id AND id <> p.id) THEN
    RAISE EXCEPTION 'Transaction already used';
  END IF;

  INSERT INTO public.orders (
    order_number, user_id, customer_name, customer_email, customer_phone,
    shipping_address, shipping_city, shipping_state, shipping_pincode,
    subtotal, shipping_cost, discount, total, status, payment_status, payment_method
  ) VALUES (
    p.reference, p.user_id, p.snapshot->'address'->>'name', p.snapshot->'address'->>'email',
    p.snapshot->'address'->>'phone', p.snapshot->'address'->>'addr',
    p.snapshot->'address'->>'city', p.snapshot->'address'->>'state', p.snapshot->'address'->>'pin',
    (p.snapshot->>'sub')::numeric, (p.snapshot->>'shipping')::numeric,
    (p.snapshot->>'discount')::numeric, p.total, 'confirmed', 'paid', 'ownpay'
  ) RETURNING id INTO o_id;

  FOR line IN SELECT value FROM jsonb_array_elements(p.snapshot->'lines') LOOP
    INSERT INTO public.order_items(order_id, product_name, product_slug, price, quantity, subtotal)
    VALUES(o_id, line->>'name', line->>'slug', (line->>'price')::numeric,
      (line->>'qty')::integer, (line->>'total')::numeric);
  END LOOP;

  UPDATE public.ownpay_checkouts SET status = 'paid', trx_id = p_trx_id, paid_at = now() WHERE id = p.id;
  RETURN p.reference;
END;
$$;
REVOKE ALL ON FUNCTION public.finalize_ownpay_checkout(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_ownpay_checkout(uuid,text,text) TO service_role;
COMMIT;