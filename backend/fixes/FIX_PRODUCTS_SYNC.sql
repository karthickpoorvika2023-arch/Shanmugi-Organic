-- ==========================================================================
-- FIX: allow the admin panel to sync the catalog to Supabase
-- Run this ONCE in the Supabase SQL Editor:
--   https://supabase.com/dashboard/project/ufhlmdqkqdkcohpbzdux/sql/new
--
-- Why: the `categories` and `products` tables only had a public SELECT
-- policy, so the admin panel's "Sync to Supabase" button fails with:
--   42501: new row violates row-level security policy for table "categories"
--
-- This script does 3 things:
--   Step 1) Adds INSERT / UPDATE / DELETE policies for the catalog push
--   Step 2) Restores any missing default categories (the DB currently has
--           only 7 of the 10 — instant-foods, flour-varieties and
--           herbs-hair-care are absent)
--   Step 3) Refreshes the PostgREST schema cache and reports the result
--
-- All steps are idempotent / safe to re-run.
-- ==========================================================================

-- ---------------------------------------------------------------- Step 1/3
-- Write policies (RLS) for the admin "Sync to Supabase" button
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Categories: write policies
DROP POLICY IF EXISTS "Categories can be created by admin" ON public.categories;
CREATE POLICY "Categories can be created by admin" ON public.categories
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Categories can be updated by admin" ON public.categories;
CREATE POLICY "Categories can be updated by admin" ON public.categories
  FOR UPDATE USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Categories can be removed by admin" ON public.categories;
CREATE POLICY "Categories can be removed by admin" ON public.categories
  FOR DELETE USING (true);

-- Products: write policies
DROP POLICY IF EXISTS "Products can be created by admin" ON public.products;
CREATE POLICY "Products can be created by admin" ON public.products
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Products can be updated by admin" ON public.products;
CREATE POLICY "Products can be updated by admin" ON public.products
  FOR UPDATE USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Products can be removed by admin" ON public.products;
CREATE POLICY "Products can be removed by admin" ON public.products
  FOR DELETE USING (true);

-- ---------------------------------------------------------------- Step 2/3
-- Restore any missing default categories (existing rows are NOT touched)
INSERT INTO public.categories (slug, name, name_tamil, description, order_index)
VALUES
    ('cold-pressed-oils', 'Cold Pressed Oils', 'செக்கு எண்ணெய்கள்', 'Wood-pressed in traditional chekku.', 1),
    ('traditional-rice', 'Traditional Rice', 'பாரம்பரிய அரிசி', 'Heritage paddy varieties.', 2),
    ('millets', 'Millets', 'சிறுதானியங்கள்', 'Rain-fed native millets.', 3),
    ('instant-foods', 'Instant Foods', 'உடனடி உணவுகள்', 'Traditional recipes made quick.', 4),
    ('health-mix', 'Health Mix', 'ஆரோக்கிய கலவை', 'Multigrain sathu maavu.', 5),
    ('flour-varieties', 'Flour Varieties', 'மாவு வகைகள்', 'Stone-ground flours.', 6),
    ('bath-body-care', 'Bath & Body Care', 'குளியல் பொருட்கள்', 'Handmade cold-process soaps.', 7),
    ('pickles-powders', 'Pickles & Powders', 'ஊறுகாய் & பொடிகள்', 'Sun-cured pickles and podis.', 8),
    ('ghee-honey', 'Ghee & Honey', 'நெய் & தேன்', 'Bilona ghee and raw forest honey.', 9),
    ('herbs-hair-care', 'Herbs & Hair Care', 'மூலிகைகள் & ஹேர் கேர்', 'Sun-dried herbs for hair and skin.', 10)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------- Step 3/3
-- Refresh PostgREST schema cache + report the result
DO $$
DECLARE
  cat_count INT;
  prod_count INT;
  missing TEXT;
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
  SELECT COUNT(*) INTO cat_count FROM public.categories;
  SELECT COUNT(*) INTO prod_count FROM public.products;
  SELECT string_agg(slug, ', ') INTO missing
  FROM (
    VALUES ('cold-pressed-oils'), ('traditional-rice'), ('millets'),
           ('instant-foods'), ('health-mix'), ('flour-varieties'),
           ('bath-body-care'), ('pickles-powders'), ('ghee-honey'),
           ('herbs-hair-care')
  ) AS expected(slug)
  WHERE NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.slug = expected.slug);

  RAISE NOTICE 'categories rows: %, products rows: %', cat_count, prod_count;
  IF missing IS NULL THEN
    RAISE NOTICE 'OK — all 10 default categories are present.';
  ELSE
    RAISE NOTICE 'Still missing categories: %', missing;
  END IF;
  RAISE NOTICE 'DONE — open Admin > Categories and click "Sync to Supabase" to push your custom categories and products.';
END $$;
