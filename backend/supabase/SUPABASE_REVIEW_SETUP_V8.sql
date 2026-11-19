-- SHANMUGA V8: reviews require an authenticated user and approval before publication.
-- Paste into Supabase Dashboard > SQL Editor. Review BEFORE executing.
-- Your existing public.reviews and public.products tables must exist.
-- No secrets, service_role keys or credentials are needed in frontend files.
BEGIN;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Old policy allowed customers to submit approved=true. Replace it safely.
DROP POLICY IF EXISTS "Authenticated users can submit reviews" ON public.reviews;
DROP POLICY IF EXISTS "shanmuga_submit_pending_review_v8" ON public.reviews;
CREATE POLICY "shanmuga_submit_pending_review_v8"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND approved IS FALSE
    AND rating BETWEEN 1 AND 5
    AND length(btrim(comment)) BETWEEN 10 AND 1500
    AND length(btrim(COALESCE(title,''))) BETWEEN 1 AND 100
    AND length(btrim(reviewer_name)) BETWEEN 1 AND 80
  );

-- Public readers can only see reviewed and approved content.
DROP POLICY IF EXISTS "Approved reviews are viewable by everyone" ON public.reviews;
DROP POLICY IF EXISTS "shanmuga_public_approved_reviews_v8" ON public.reviews;
CREATE POLICY "shanmuga_public_approved_reviews_v8"
  ON public.reviews FOR SELECT TO anon, authenticated
  USING (approved IS TRUE);

-- Prevent callers with public/authenticated role from bypassing moderation.
-- Trusted dashboard admins/service-role operations are not affected by RLS.
REVOKE UPDATE, DELETE ON public.reviews FROM anon, authenticated;
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT ON public.reviews TO authenticated;

-- Update product ratings only from approved reviews. The public catalog then
-- automatically reads new average + count after page refresh.
CREATE OR REPLACE FUNCTION public.shanmuga_refresh_approved_rating_v8()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_key uuid;
BEGIN
  -- Pending reviews never change displayed ratings or counts.
  IF TG_OP = 'INSERT' THEN
    IF NEW.approved IS NOT TRUE THEN RETURN NULL; END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.approved IS NOT TRUE THEN RETURN NULL; END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.approved IS NOT TRUE AND NEW.approved IS NOT TRUE THEN RETURN NULL; END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN product_key := OLD.product_id; ELSE product_key := NEW.product_id; END IF;
  UPDATE public.products p SET
    rating = COALESCE((SELECT round(avg(r.rating)::numeric, 1)
                       FROM public.reviews r
                       WHERE r.product_id = product_key AND r.approved IS TRUE), 0),
    reviews_count = (SELECT count(*) FROM public.reviews r
                     WHERE r.product_id = product_key AND r.approved IS TRUE)
  WHERE p.id = product_key;
  -- Also refresh the previous product if a review was moved by trusted admin.
  IF TG_OP = 'UPDATE' AND OLD.product_id IS DISTINCT FROM NEW.product_id THEN
    UPDATE public.products p SET
      rating = COALESCE((SELECT round(avg(r.rating)::numeric,1) FROM public.reviews r
                         WHERE r.product_id=OLD.product_id AND r.approved IS TRUE), 0),
      reviews_count = (SELECT count(*) FROM public.reviews r
                       WHERE r.product_id=OLD.product_id AND r.approved IS TRUE)
    WHERE p.id = OLD.product_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS shanmuga_review_rating_v8 ON public.reviews;
CREATE TRIGGER shanmuga_review_rating_v8
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.shanmuga_refresh_approved_rating_v8();

COMMIT;

-- IMPORTANT: Existing old/demo product rating values are intentionally NOT reset.
-- After the first approval or change to a given product's reviews, its figures
-- become the average/count of approved reviews for that product.
-- To manually approve: Supabase Table Editor > reviews > set approved = true.
