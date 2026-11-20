-- Run once in the correct Supabase project, after a database backup.
-- Public READ is required to display product photos to shoppers.
-- Do NOT grant public INSERT/UPDATE/DELETE on storage.objects.
-- All writes go through the authenticated approved-admin Edge Function.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shanmuga-variant-photos',
  'shanmuga-variant-photos',
  true,
  2200000,
  array['image/png','image/jpeg','image/webp']
)
on conflict (id) do nothing;

-- Verify the configured bucket in Supabase Storage after execution.
-- If it previously existed, confirm it is public and the MIME and size rules match.
-- Images are organized under the approved admin's user UUID.
