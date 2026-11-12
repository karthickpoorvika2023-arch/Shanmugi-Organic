/* Create an explicitly approved LOCAL demo admin. Never use hosted credentials. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const email = process.env.LOCAL_ADMIN_EMAIL?.trim();
const password = process.env.LOCAL_ADMIN_PASSWORD;
if (!email || !password || password.length < 12) {
  console.error('Set LOCAL_ADMIN_EMAIL and LOCAL_ADMIN_PASSWORD (12+ chars) in your shell. Do not commit them.');
  process.exit(1);
}
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const status = execFileSync(process.execPath, [join(root, 'node_modules/supabase/dist/supabase.js'),
  'status', '-o', 'env', '--workdir', join(root, 'backend')], {
  encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']
});
const values = Object.fromEntries(status.split(/\r?\n/).filter(s => /^[A-Z_]+=/.test(s)).map(s => {
  const at = s.indexOf('='); return [s.slice(0, at), s.slice(at + 1).replace(/^"|"$/g, '')];
}));
const url = new URL(values.API_URL);
assert.match(url.origin, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/, 'Local-only database required');
assert.ok(values.SERVICE_ROLE_KEY, 'Local stack is not running');
const client = createClient(url.origin, values.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const created = await client.auth.admin.createUser({ email, password, email_confirm: true });
if (created.error) throw new Error('Could not create local admin (the email may already exist).');
const allowed = await client.from('ownpay_payment_admins').insert({ user_id: created.data.user.id });
if (allowed.error) {
  await client.auth.admin.deleteUser(created.data.user.id);
  throw new Error('Local admin allowlist insert failed; temporary user removed.');
}
console.log('Local admin created and explicitly allowlisted. Sign in at the local preview admin page.');