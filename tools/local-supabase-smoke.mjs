/* Integration check. LOCAL Docker only; never contacts a hosted Supabase project. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(root, 'node_modules/supabase/dist/supabase.js');
const status = execFileSync(process.execPath, [cli, 'status', '-o', 'env', '--workdir', join(root, 'backend')], {
  encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']
});
const env = Object.fromEntries(status.split(/\r?\n/).filter(s => /^[A-Z_]+=/.test(s)).map(s => {
  const at = s.indexOf('='); return [s.slice(0, at), s.slice(at + 1).replace(/^"|"$/g, '')];
}));
const url = new URL(env.API_URL);
assert.match(url.origin, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
assert.ok(env.SERVICE_ROLE_KEY && (env.PUBLISHABLE_KEY || env.ANON_KEY));
const admin = createClient(url.origin, env.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const publicClient = createClient(url.origin, env.ANON_KEY || env.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const email = `local-smoke-${randomBytes(10).toString('hex')}@example.com`;
const password = randomBytes(32).toString('base64url') + 'A!1';
let userId;
let signupUserId;
const post = async (action, token, origin = 'http://localhost:4173', payload = {}) => {
  const result = await fetch(url.origin + '/functions/v1/demo-payment-kit/' + action, {
    method: 'POST', headers: { origin, apikey: env.ANON_KEY || env.PUBLISHABLE_KEY,
      authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body: JSON.stringify(payload)
  });
  return { status: result.status, body: await result.json() };
};

try {
  const settings = await (await fetch(url.origin + '/auth/v1/settings')).json();
  assert.equal(settings.disable_signup, false);
  assert.equal(settings.mailer_autoconfirm, false);
  // Exercise the same Auth HTTP signup used by signup-email.js (without real mail).
  const signupEmail = `local-otp-${randomBytes(10).toString('hex')}@example.com`;
  const signup = await fetch(url.origin + '/auth/v1/signup?redirect_to=http%3A%2F%2Flocalhost%3A4173%2F', {
    method: 'POST', headers: { apikey: env.ANON_KEY || env.PUBLISHABLE_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ email: signupEmail, password, data: { full_name: 'Local OTP Smoke' } })
  });
  const signupResult = await signup.json();
  assert.equal(signup.status, 200, JSON.stringify(signupResult));
  assert.ok(!signupResult.access_token && !signupResult.session, 'signup must require email confirmation');
  signupUserId = signupResult.id;
  const inbox = await (await fetch('http://127.0.0.1:54324/api/v1/messages')).json();
  const messages = inbox.messages || inbox.Messages || [];
  const mail = messages.find(m => JSON.stringify(m.To || m.to || []).includes(signupEmail));
  assert.ok(mail, 'OTP email must reach local Mailpit');
  const detail = await (await fetch('http://127.0.0.1:54324/api/v1/message/' + encodeURIComponent(mail.ID || mail.id))).json();
  const html = detail.HTML || detail.html || '';
  assert.match(html, /\b\d{6}\b/, 'signup template must send a six-digit code');
  assert.doesNotMatch(html, /\{\{\s*\.Token\s*\}\}/, 'local email template must be rendered');
  const code = html.match(/(?:font-family:Consolas[^>]*>)\s*(\d{6})\s*</)?.[1];
  assert.ok(code, 'confirmation code must appear in the styled OTP block');
  const wrongCode = code === '000000' ? '999999' : '000000';
  const rejected = await publicClient.auth.verifyOtp({ email: signupEmail, token: wrongCode, type: 'email' });
  assert.ok(rejected.error, 'wrong signup code must be rejected');
  assert.equal(rejected.data.session, null, 'wrong signup code must not open a session');
  assert.equal((await publicClient.auth.getSession()).data.session, null, 'wrong code must leave the visitor signed out');
  const verified = await publicClient.auth.verifyOtp({ email: signupEmail, token: code, type: 'email' });
  assert.ifError(verified.error);
  assert.equal(verified.data.user.id, signupUserId, 'local OTP must confirm the account');
  assert.ok(verified.data.session?.access_token, 'correct OTP must open a session for the home page');
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true,
    user_metadata: { full_name: 'Local Smoke' } });
  assert.ifError(created.error);
  userId = created.data.user.id;
  const signed = await publicClient.auth.signInWithPassword({ email, password });
  assert.ifError(signed.error);
  const token = signed.data.session.access_token;
  const cmsId = `local-smoke-${userId}`;
  const cmsRow = { id: cmsId, payload: { v: 1, updatedAt: 0, nodes: {}, inserts: {} } };
  const deniedCms = await publicClient.from('site_content').insert(cmsRow);
  assert.ok(deniedCms.error, 'an unapproved user must not publish CMS content');
  assert.equal((await post('admin-check', token, 'https://not-local.example')).status, 403);
  assert.equal((await post('admin-check', token)).status, 403);
  assert.equal((await post('admin-check', 'invalid-token')).status, 401);
  const allow = await admin.from('ownpay_payment_admins').insert({ user_id: userId });
  assert.ifError(allow.error);
  const allowedCms = await publicClient.from('site_content').insert(cmsRow);
  assert.ifError(allowedCms.error);
  assert.equal((await post('admin-check', token)).status, 200);
  assert.equal((await post('admin-orders', token)).status, 200);
  assert.equal((await post('admin-customers', token)).status, 200);
  const demo = await post('create', token, 'http://localhost:4173', {
    address: { name: 'Sample', email: 'sample@example.com', phone: '0000000000', state: 'Tamil Nadu' },
    ship: 'standard', items: [{ slug: 'groundnut-oil', size: '1 L', qty: 2, price: 1 }]
  });
  assert.equal(demo.status, 200, JSON.stringify(demo.body));
  assert.equal(demo.body.total, 620);
  const ledger = await post('admin-payments', token);
  assert.equal(ledger.status, 200);
  assert.ok(ledger.body.payments.some(p => p.reference === demo.body.reference));
  const profile = await admin.from('user_profiles').select('email').eq('id', userId).single();
  assert.ifError(profile.error);
  console.log('PASS: local signup + Mailpit OTP verification, Auth/profile, CMS allowlist, approved admin and demo ledger');
} finally {
  if (userId) {
    await admin.from('demo_payment_attempts').delete().eq('user_id', userId);
    await admin.from('site_content').delete().eq('id', `local-smoke-${userId}`);
    const deleted = await admin.auth.admin.deleteUser(userId);
    if (deleted.error) throw deleted.error;
  }
  if (signupUserId) {
    const deleted = await admin.auth.admin.deleteUser(signupUserId);
    if (deleted.error) throw deleted.error;
  }
}