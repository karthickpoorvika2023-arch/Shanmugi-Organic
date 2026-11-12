/* LOCAL-only sign-in OTP regression; disposable user, no real email. */
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const status = execFileSync(process.execPath, [join(root, 'node_modules/supabase/dist/supabase.js'),
  'status', '-o', 'env', '--workdir', join(root, 'backend')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
const env = Object.fromEntries(status.split(/\r?\n/).filter(s => /^[A-Z_]+=/.test(s)).map(s => {
  const at = s.indexOf('='); return [s.slice(0, at), s.slice(at + 1).replace(/^"|"$/g, '')];
}));
assert.match(env.API_URL, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
const admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const publicClient = createClient(env.API_URL, env.ANON_KEY || env.PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } });
const email = `local-login-flow-${randomBytes(12).toString('hex')}@example.com`;
const password = randomBytes(28).toString('base64url') + 'A!1';
const port = 42761;
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['tools/serve.mjs'], {
  cwd: root, env: { ...process.env, PORT: String(port) }, stdio: 'ignore'
});
let userId;
async function start(pw, host = origin) {
  const response = await fetch(origin + '/__local/signin-otp/start', {
    method: 'POST', headers: { origin: host, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: pw })
  });
  return { status: response.status, body: await response.json() };
}
async function inbox() {
  const result = await (await fetch('http://127.0.0.1:54324/api/v1/messages')).json();
  return (result.messages || result.Messages || []).find(m => JSON.stringify(m.To || m.to || []).includes(email));
}
try {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(created.error);
  userId = created.data.user.id;
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(origin + '/signin.html')).ok) break; } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal((await start(password, 'https://attacker.example')).status, 403);
  assert.equal((await start('incorrect-password')).status, 400);
  assert.equal(await inbox(), undefined, 'wrong password must not send a code');
  const requested = await start(password);
  assert.equal(requested.status, 200, JSON.stringify(requested.body));
  assert.deepEqual(requested.body, { sent: true }, 'server must not expose password session or OTP');
  assert.equal((await publicClient.auth.getSession()).data.session, null);
  const mail = await inbox();
  assert.ok(mail, 'sign-in code must arrive in local Mailpit');
  const detail = await (await fetch('http://127.0.0.1:54324/api/v1/message/' + encodeURIComponent(mail.ID || mail.id))).json();
  const html = detail.HTML || detail.html || '';
  assert.match(html, /Verify Your\s+Sign-In/);
  const code = html.match(/font-family:Consolas[^>]*>\s*(\d{6})\s*</)?.[1];
  assert.ok(code, 'six-digit code must render');
  const wrong = await publicClient.auth.verifyOtp({ email, token: code === '000000' ? '999999' : '000000', type: 'email' });
  assert.ok(wrong.error, 'incorrect OTP must fail');
  assert.equal((await publicClient.auth.getSession()).data.session, null, 'incorrect OTP must not open a session');
  const verified = await publicClient.auth.verifyOtp({ email, token: code, type: 'email' });
  assert.ifError(verified.error);
  assert.equal(verified.data.user.id, userId);
  assert.ok(verified.data.session?.access_token, 'correct OTP must create a session');
  console.log('PASS: local password → Mailpit OTP → wrong code denied → correct code opens session');
} finally {
  server.kill();
  if (userId) assert.ifError((await admin.auth.admin.deleteUser(userId)).error);
}