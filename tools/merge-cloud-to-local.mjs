/* One-time, local-only merge from a private Supabase CLI data dump.
   Never link this repository to the hosted project or send data to it. */
import { readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const backup = process.env.CLOUD_BACKUP_DIR;
const localBackup = process.env.LOCAL_BACKUP_DIR;
const apply = process.argv.includes('--apply');
if (!backup || !localBackup || !['--dry-run', '--apply'].includes(process.argv[2]) ||
    apply && process.env.CONFIRM_LOCAL_MERGE !== 'LOCAL_ONLY') {
  console.error('Set CLOUD_BACKUP_DIR and LOCAL_BACKUP_DIR. Use --dry-run, or --apply with CONFIRM_LOCAL_MERGE=LOCAL_ONLY.');
  process.exit(1);
}
const files = [join(resolve(backup), 'data.sql'), join(resolve(backup), 'schema-check.sql'),
  join(resolve(backup), 'roles-check.sql'), ...['data.sql', 'schema.sql', 'roles.sql'].map(f => join(resolve(localBackup), f))];
if (files.some(f => statSync(f).size === 0)) throw new Error('Missing or empty backup; no changes made.');
const docker = process.env.LOCAL_DOCKER_CLI || 'docker';
const container = 'supabase_db_backend';
const probe = spawnSync(docker, ['inspect', '--format', '{{.State.Running}}', container], { encoding: 'utf8' });
if (probe.status !== 0 || probe.stdout.trim() !== 'true') throw new Error('Expected LOCAL Docker database not running.');

const tables = ['auth.users', 'auth.identities', 'public.user_profiles', 'public.categories',
  'public.products', 'public.orders', 'public.order_items', 'public.ownpay_payment_admins', 'public.banners'];
const sections = new Map();
const data = readFileSync(files[0], 'utf8');
for (const match of data.matchAll(/^COPY "([a-z_]+)"\."([a-z_]+)" \(([^\n]+)\) FROM stdin;\r?\n([\s\S]*?)^\\\.\r?$/gm)) {
  const name = match[1] + '.' + match[2];
  if (tables.includes(name)) sections.set(name, { columns: match[3], rows: match[4] });
}
if (sections.size !== tables.length) throw new Error('Cloud data dump is incomplete; no changes made.');
const count = name => sections.get(name).rows.split('\n').filter(Boolean).length;
if (count('auth.users') < 1 || count('public.categories') < 1 || count('public.products') < 1) {
  throw new Error('Unexpected empty cloud export; no changes made.');
}
// Stage data only in temporary tables. No schema/roles/remote sessions are restored.
const sql = ['\\set ON_ERROR_STOP on', 'BEGIN;',
  'SET LOCAL statement_timeout = \'60s\';',
  ...tables.filter(t => t !== 'public.banners').map(t =>
    `CREATE TEMP TABLE stage_${t.replace('.', '_')} (LIKE ${t});`),
  `CREATE TEMP TABLE stage_public_banners (id bigint, slug text, title text, link text, image text,
    position text, "order" integer, active boolean, created_at timestamptz, updated_at timestamptz);`];
for (const t of tables) {
  const section = sections.get(t);
  sql.push(`COPY stage_${t.replace('.', '_')} (${section.columns}) FROM stdin;\n${section.rows}\\.`);
}
sql.push(`
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM stage_auth_users GROUP BY lower(email) HAVING count(*) > 1) THEN
   RAISE EXCEPTION 'Duplicate cloud emails'; END IF;
 IF EXISTS (SELECT 1 FROM stage_public_products GROUP BY slug HAVING count(*) > 1) THEN
   RAISE EXCEPTION 'Duplicate cloud slugs'; END IF;
 IF EXISTS (SELECT 1 FROM stage_public_categories GROUP BY slug HAVING count(*) > 1) THEN
   RAISE EXCEPTION 'Duplicate cloud categories'; END IF;
 IF EXISTS (SELECT 1 FROM stage_auth_users c JOIN auth.users l ON c.id=l.id
   WHERE lower(c.email) IS DISTINCT FROM lower(l.email)) THEN
   RAISE EXCEPTION 'Auth UUID belongs to different email'; END IF;
 IF EXISTS (SELECT 1 FROM stage_public_products c JOIN public.products l ON c.id=l.id WHERE c.slug<>l.slug) OR
    EXISTS (SELECT 1 FROM stage_public_categories c JOIN public.categories l ON c.id=l.id WHERE c.slug<>l.slug) THEN
   RAISE EXCEPTION 'Catalog UUID belongs to different slug'; END IF;
 IF EXISTS (SELECT 1 FROM stage_public_products c JOIN public.products l ON c.sku=l.sku WHERE c.slug<>l.slug) THEN
   RAISE EXCEPTION 'Catalog SKU collision'; END IF;
 IF EXISTS (SELECT 1 FROM stage_public_orders c JOIN public.orders l ON c.order_number=l.order_number WHERE c.id<>l.id) THEN
   RAISE EXCEPTION 'Order number collision'; END IF;
 IF EXISTS (SELECT 1 FROM stage_public_orders c JOIN public.orders l ON c.id=l.id WHERE c.order_number<>l.order_number) THEN
   RAISE EXCEPTION 'Order UUID collision'; END IF;
 IF EXISTS (SELECT 1 FROM stage_public_order_items c JOIN public.order_items l ON c.id=l.id WHERE c.order_id<>l.order_id) THEN
   RAISE EXCEPTION 'Order item UUID collision'; END IF;
END $$;
CREATE TEMP TABLE user_map AS
 SELECT c.id cloud_id, COALESCE(l.id,c.id) local_id
 FROM stage_auth_users c LEFT JOIN auth.users l ON lower(c.email)=lower(l.email);
SELECT 'cloud_users='||count(*) FROM stage_auth_users;
SELECT 'account_email_remaps='||count(*) FROM user_map WHERE cloud_id<>local_id;
SELECT 'cloud_categories='||count(*) FROM stage_public_categories;
SELECT 'catalog_category_updates='||count(*) FROM stage_public_categories c JOIN public.categories l USING(slug);
SELECT 'cloud_products='||count(*) FROM stage_public_products;
SELECT 'catalog_product_updates='||count(*) FROM stage_public_products c JOIN public.products l USING(slug);
SELECT 'cloud_orders='||count(*) FROM stage_public_orders;
SELECT 'cloud_order_items='||count(*) FROM stage_public_order_items;
SELECT 'cloud_banners='||count(*) FROM stage_public_banners;`);

// Keep existing account/password/profile for the overlapping email. Import other
// users' hashes and email identities, but NEVER import remote sessions or tokens.
const userCols = ['instance_id','id','aud','role','email','encrypted_password','email_confirmed_at',
  'invited_at','raw_app_meta_data','raw_user_meta_data','is_super_admin','created_at','updated_at',
  'phone','phone_confirmed_at','is_sso_user','deleted_at','is_anonymous',
  // GoTrue scans these fields as strings; a bare NULL causes
  // "Database error querying schema" during password sign-in.
  'confirmation_token','recovery_token','email_change_token_new','email_change'];
const emptyAuthTokens = new Set(['confirmation_token','recovery_token','email_change_token_new','email_change']);
sql.push(`INSERT INTO auth.users (${userCols.join(',')})
 SELECT ${userCols.map(c => emptyAuthTokens.has(c) ? `''` : 'c.' + c).join(',')} FROM stage_auth_users c
 JOIN user_map m ON m.cloud_id=c.id WHERE m.local_id=m.cloud_id
 AND NOT EXISTS (SELECT 1 FROM auth.users l WHERE l.id=c.id);`);
const identityCols = ['provider_id','user_id','identity_data','provider','last_sign_in_at','created_at','updated_at','id'];
sql.push(`INSERT INTO auth.identities (${identityCols.join(',')})
 SELECT ${identityCols.map(c => 'i.' + c).join(',')} FROM stage_auth_identities i
 JOIN user_map m ON m.cloud_id=i.user_id WHERE m.local_id=m.cloud_id
 AND NOT EXISTS (SELECT 1 FROM auth.identities l WHERE l.id=i.id OR
   (l.provider_id=i.provider_id AND l.provider=i.provider));`);
// Trigger-created profiles are enriched only for newly imported accounts.
const profileCols = ['full_name','phone','avatar_url','default_shipping_address','default_shipping_city',
  'default_shipping_state','default_shipping_pincode','notify_orders','notify_promo',
  'newsletter_subscribed','is_author','is_author_published','author_slug','author_bio',
  'author_avatar_url','author_socials','author_published_at','created_at','updated_at','email'];
sql.push(`UPDATE public.user_profiles l SET ${profileCols.map(c => `${c}=p.${c}`).join(',')}
 FROM stage_public_user_profiles p JOIN user_map m ON m.cloud_id=p.id
 WHERE l.id=m.local_id AND m.cloud_id=m.local_id;`);
// Shared slug is the identity of a catalog item: keep local UUIDs/FKs intact.
for (const [t, cols] of [
  ['categories', ['name','name_tamil','description','icon','image_url','order_index','created_at','updated_at']],
  ['products', ['name','name_tamil','description','short_description','category_slug','price',
    'original_price','discount_percentage','unit','stock_quantity','sku','image_url','images',
    'featured','bestseller','is_new','in_stock','rating','reviews_count','meta_title','meta_description',
    'created_at','updated_at']]
]) {
  sql.push(`UPDATE public.${t} l SET ${cols.map(c => `${c}=c.${c}`).join(',')}
    FROM stage_public_${t} c WHERE l.slug=c.slug;`);
  sql.push(`INSERT INTO public.${t} (id,slug,${cols.join(',')})
    SELECT c.id,c.slug,${cols.map(c => 'c.'+c).join(',')} FROM stage_public_${t} c
    WHERE NOT EXISTS (SELECT 1 FROM public.${t} l WHERE l.slug=c.slug);`);
}
const orderCols = ['id','order_number','user_id','customer_name','customer_email','customer_phone',
  'shipping_address','shipping_city','shipping_state','shipping_pincode','billing_address','billing_city',
  'billing_state','billing_pincode','subtotal','shipping_cost','tax','discount','total','status',
  'payment_status','payment_method','customer_notes','admin_notes','tracking_number','tracking_url',
  'created_at','updated_at','shipped_at','delivered_at'];
sql.push(`INSERT INTO public.orders (${orderCols.join(',')})
 SELECT ${orderCols.map(c => c === 'user_id' ? 'COALESCE(m.local_id,o.user_id)' : 'o.'+c).join(',')}
 FROM stage_public_orders o LEFT JOIN user_map m ON m.cloud_id=o.user_id
 WHERE NOT EXISTS (SELECT 1 FROM public.orders l WHERE l.id=o.id);`);
const itemCols = ['id','order_id','product_id','product_name','product_slug','product_image','price','quantity','subtotal','created_at'];
sql.push(`INSERT INTO public.order_items (${itemCols.join(',')})
 SELECT i.id,i.order_id,COALESCE(p.id,i.product_id),${itemCols.slice(3).map(c => 'i.'+c).join(',')}
 FROM stage_public_order_items i LEFT JOIN stage_public_products cloud_p ON cloud_p.id=i.product_id
 LEFT JOIN public.products p ON p.slug=cloud_p.slug
 WHERE NOT EXISTS (SELECT 1 FROM public.order_items l WHERE l.id=i.id);`);
// A cloud admin allowlist confers privilege: intentionally NOT imported without
// separate approval. Banners can be read publicly only when active; do not
// grant browser roles insert/update/delete access as on the cloud project.
sql.push(`CREATE TABLE IF NOT EXISTS public.banners (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  slug text NOT NULL UNIQUE, title text NOT NULL, link text, image text NOT NULL,
  position text NOT NULL DEFAULT 'hero', "order" integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.banners FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.banners TO anon, authenticated;
DROP POLICY IF EXISTS banners_read_active_local ON public.banners;
CREATE POLICY banners_read_active_local ON public.banners FOR SELECT USING (active = true);
INSERT INTO public.banners (id,slug,title,link,image,position,"order",active,created_at,updated_at)
  SELECT c.id,c.slug,c.title,c.link,c.image,c.position,c."order",c.active,c.created_at,c.updated_at
  FROM stage_public_banners c WHERE NOT EXISTS (SELECT 1 FROM public.banners b WHERE b.id=c.id OR b.slug=c.slug);
DO $$ BEGIN PERFORM setval(pg_get_serial_sequence('public.banners', 'id'),
  GREATEST((SELECT COALESCE(max(id),0) FROM public.banners),1)); END $$;`);
sql.push(`SELECT 'imported_auth_users='||count(*) FROM auth.users;
SELECT 'imported_auth_identities='||count(*) FROM auth.identities;
SELECT 'imported_orders='||count(*) FROM public.orders;
SELECT 'imported_order_items='||count(*) FROM public.order_items;
SELECT 'imported_categories='||count(*) FROM public.categories;
SELECT 'imported_products='||count(*) FROM public.products;
SELECT 'imported_banners='||count(*) FROM public.banners;
SELECT 'local_admin_allowlist_unchanged='||count(*) FROM public.ownpay_payment_admins;
${apply ? 'COMMIT;' : 'ROLLBACK;'}
`);
const result = spawnSync(docker, ['exec','-i',container,'psql','-U','postgres','-d','postgres',
  '-X','-A','-t','-q','-v','ON_ERROR_STOP=1'], { input: sql.join('\n'), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
if (result.status !== 0) {
  console.error('Local transaction FAILED and was rolled back. Inspect locally; no dump data printed.');
  process.exit(1);
}
console.log(result.stdout.trim());
console.log(apply ? 'Local merge committed. Cloud was not modified.' :
  'Dry run rolled back. Cloud and local data were not modified.');