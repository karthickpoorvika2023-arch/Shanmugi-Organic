import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const site = join(root, 'frontend');
const plugins = join(root, 'plugins');
const pages = readdirSync(site).filter(name => name.endsWith('.html'));
assert.ok(pages.length > 0, 'frontend pages must exist');
assert.ok(existsSync(join(root, 'backend/schemas/supabase-schema.sql')));

let checked = 0;
for (const page of pages) {
  const html = readFileSync(join(site, page), 'utf8');
  for (const match of html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g)) {
    const ref = match[1];
    if (/^(?:https?:|data:|mailto:|tel:|javascript:|#|\/\/)/i.test(ref)) continue;
    const route = ref.split(/[?#]/)[0];
    if (!route || route.startsWith('#')) continue;
    // The page's own links are resolved relative to the site's URL root.
    const target = route.startsWith('plugins/')
      ? join(plugins, route.slice('plugins/'.length))
      : join(site, route.replace(/^\//, ''));
    assert.ok(existsSync(target), `${page}: missing local resource ${ref}`);
    checked++;
  }
}
for (const plugin of [
  'supabase/supabase-client.js', 'supabase/supabase-db.js',
  'supabase/supabase-adapter.js', 'cms/content-cms.js',
  'cms/admin-content.js', 'cms/content-cms.css'
]) assert.ok(existsSync(join(plugins, plugin)), `missing plugin ${plugin}`);
console.log(`PASS: ${pages.length} frontend pages and ${checked} local resource links`);