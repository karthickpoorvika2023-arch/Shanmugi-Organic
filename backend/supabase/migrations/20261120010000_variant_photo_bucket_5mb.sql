-- V22: approved-admin size-specific image gallery; up to 5 MiB per photo.
-- Run in authorized STAGING project first after database backup.
-- Do not grant INSERT/UPDATE/DELETE permission to public/anon users.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shanmuga-variant-photos',
  'shanmuga-variant-photos',
  true,
  5242880,
  array['image/png','image/jpeg','image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Optional verification (run separately in Supabase SQL Editor):
-- select id, public, file_size_limit, allowed_mime_types
-- from storage.buckets where id='shanmuga-variant-photos';
