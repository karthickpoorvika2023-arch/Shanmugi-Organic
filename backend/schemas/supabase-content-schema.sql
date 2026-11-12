-- ============================================================================
-- Supabase Website Content Schema for Shanmuga Organics Admin Panel
-- Run this in your Supabase SQL Editor (same place as supabase-banners-schema.sql)
-- Powers the admin "Website Content" page → assets/js/content-cms.js cloud sync
-- ============================================================================

-- One row holds the whole editable content document for the site.
-- payload shape (written by admin-content.js / content-cms.js):
-- {
--   "v": 1,
--   "updatedAt": 1712345678901,
--   "nodes":   { "index.html::h1.hero-title": { "text": "..." }, ... },
--   "inserts": { "index.html": [ { "id": "i...", "type": "button", ... } ] }
-- }

CREATE TABLE IF NOT EXISTS public.site_content (
    id          TEXT PRIMARY KEY,                    -- 'global' (single row)
    payload     JSONB NOT NULL,                      -- full content document above
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at timestamp (reuses the function from banners schema)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS site_content_updated_at ON public.site_content;
CREATE TRIGGER site_content_updated_at
    BEFORE UPDATE ON public.site_content
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ── Row Level Security (RLS) ────────────────────────────────────────────────

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- Every visitor must be able to READ the published content (anon key pull)
DROP POLICY IF EXISTS "site_content_select_all" ON public.site_content;
CREATE POLICY "site_content_select_all" ON public.site_content
    FOR SELECT
    USING (true);

-- Only signed-in admins can publish (push) changes
DROP POLICY IF EXISTS "site_content_insert_auth" ON public.site_content;
CREATE POLICY "site_content_insert_auth" ON public.site_content
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "site_content_update_auth" ON public.site_content;
CREATE POLICY "site_content_update_auth" ON public.site_content
    FOR UPDATE
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "site_content_delete_auth" ON public.site_content;
CREATE POLICY "site_content_delete_auth" ON public.site_content
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- ── Seed: empty document so the first pull has a row to read ────────────────

INSERT INTO public.site_content (id, payload, updated_at)
VALUES ('global', '{"v":1,"updatedAt":0,"nodes":{},"inserts":{}}'::jsonb, NOW())
ON CONFLICT (id) DO NOTHING;

-- ── Example queries ─────────────────────────────────────────────────────────
-- Visitors pull content:
--   SELECT payload FROM public.site_content WHERE id = 'global';
-- Admin push (upsert from content-cms.js cloudPush):
--   UPSERT (id='global', payload=<doc>, updated_at=now())

-- ── After running this, open Admin → Website Content → "Turn cloud ON" ─────
-- Your edits will then be visible to every visitor of the storefront.
