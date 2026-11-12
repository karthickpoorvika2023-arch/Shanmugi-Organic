/* LOCAL-only password reset regression; never sends mail to a real inbox. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const status = execFileSync(process.execPath, [join(root, 'node_modules/supabase/dist/supabase.js'),
  'status', '-o', 'env', '--workdir', join(root, 'backend')],
{ encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
const env = Object.fromEntries(status.split(/\r?\n/).filter(s => /^[A-Z_]+=/.test(s)).map(s => {
  const at = s.indexOf('=');
  return [s.slice(0, at), s.slice(at + 1).replace(/^"|"$/g, '')];
}));
assert.match(env.API_URL, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
assert.match(env.MAILPIT_URL, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
const admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const publicClient = createClient(env.API_URL, env.ANON_KEY || env.PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } });
const email = `local-recovery-${randomBytes(12).toString('hex')}@example.com`;
const password = randomBytes(28).toString('base64url') + 'A!1';
let userId;
try {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(created.error);
  userId = created.data.user.id;
  const requested = await publicClient.auth.resetPasswordForEmail(email, {
    redirectTo: 'http://localhost:4173/reset-password.html'
  });
  assert.ifError(requested.error);
  let mail;
  for (let i = 0; i < 30; i++) {
    const inbox = await (await fetch(env.MAILPIT_URL + '/api/v1/messages')).json();
    mail = (inbox.messages || inbox.Messages || []).find(m =>
      JSON.stringify(m.To || m.to || []).includes(email));
    if (mail) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(mail, 'reset email must arrive in local Mailpit');
  const detail = await (await fetch(env.MAILPIT_URL + '/api/v1/message/' +
    encodeURIComponent(mail.ID || mail.id))).json();
  const content = (detail.HTML || detail.html || '') + '\n' + (detail.Text || detail.text || '');
  assert.match(content, /Reset Your Password/, 'recovery email must use the styled reset template');
  assert.doesNotMatch(content, /\{\{\s*\.Token\s*\}\}|ConfirmationURL|Reset password<\/a>/i,
    'recovery email must render a code instead of a reset link');
  const code = (detail.HTML || detail.html || '').match(/font-family:Consolas[^>]*>\s*(\d{6})\s*</)?.[1];
  assert.ok(code, 'recovery template must render a six-digit code in the styled OTP block');
  const badCode = code === '000000' ? '000001' : '000000';
  const rejected = await publicClient.auth.verifyOtp({ email, token: badCode, type: 'recovery' });
  assert.ok(rejected.error, 'incorrect recovery OTP must be rejected');
  assert.equal(rejected.data.session, null, 'incorrect recovery OTP must not establish a session');
  const verified = await publicClient.auth.verifyOtp({ email, token: code, type: 'recovery' });
  assert.ifError(verified.error);
  assert.equal(verified.data.user?.email, email);
  assert.ok(verified.data.session, 'a correct recovery code establishes a session for password update');
  const newPassword = randomBytes(28).toString('base64url') + 'B!2';
  assert.ifError((await publicClient.auth.updateUser({ password: newPassword })).error);
  assert.ifError((await publicClient.auth.signOut({ scope: 'local' })).error);
  assert.ifError((await publicClient.auth.signInWithPassword({ email, password: newPassword })).error);
  console.log('PASS: styled recovery OTP arrives in Mailpit, verifies, changes password and signs in');
} finally {
  if (userId) assert.ifError((await admin.auth.admin.deleteUser(userId)).error);
}