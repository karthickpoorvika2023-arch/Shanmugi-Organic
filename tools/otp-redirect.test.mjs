/* Signup OTP page: only a successful verification with a session goes home. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'frontend/verify-otp.html'), 'utf8');
const script = html.match(/<script>\s*(\(function \(\) \{[\s\S]*?\}\)\(\);)\s*<\/script>/)?.[1];
assert.ok(script, 'OTP page script must exist');

function setup({ email = 'shopper@example.com', result, signin = false, recovery = false } = {}) {
  const origin = 'http://localhost:4173';
  const url = origin + '/verify-otp.html' + (signin ? '?mode=signin' : recovery ? '?mode=recovery' : '') +
    (email ? (signin || recovery ? '&' : '?') + 'email=' + encodeURIComponent(email) : '');
  const nodes = new Map();
  const timers = [];
  const calls = [];
  const storage = new Map(email ? [[recovery ? 'so_pending_recovery_email' : signin ? 'so_pending_signin_email' : 'so_pending_signup_email', email]] : []);
  function element(id = '') {
    const classes = new Set();
    return {
      id, value: '', textContent: '', disabled: false, children: [], listeners: {},
      classList: { add(name) { classes.add(name); }, remove(name) { classes.delete(name); },
        contains(name) { return classes.has(name); }, toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); } },
      addEventListener(name, fn) { this.listeners[name] = fn; },
      appendChild(node) { this.children.push(node); },
      setAttribute() {}, focus() {}, select() {}, scrollIntoView() {}
    };
  }
  for (const id of ['otpBoxes', 'otpTimer', 'resendBtn', 'otpForm', 'verifyBtn', 'cancelBtn', 'alertBox', 'otpTarget', 'otpSub']) {
    nodes.set(id, element(id));
  }
  const location = { href: url, origin, search: new URL(url).search };
  const window = { location, __soSupabaseConfig: signin || recovery ? { url: 'http://127.0.0.1:54321' } : null,
    SupabaseClient: { auth: { async verifyOtp(payload) { calls.push(['verify', payload.email, payload.token, payload.type]); return result; } } },
    clearInterval() {}, setInterval() { return 1; }, setTimeout(fn) { timers.push(fn); },
    Supabase: {
      async verifySignupOtp(address, code) { calls.push(['verify', address, code]); return result; },
      async resendVerification() { return { error: null }; },
      async signOut() { calls.push(['signOut']); return { error: null }; },
      async resetPassword(address) { calls.push(['reset', address]); return { error: null }; }
    }
  };
  nodes.get('otpSub').firstChild = { textContent: '' };
  vm.runInNewContext(script, { window, document: { getElementById: id => nodes.get(id), createElement: () => element(),
    activeElement: null }, URL, URLSearchParams, sessionStorage: {
    getItem(key) { return storage.get(key) || null; }, setItem(key, value) { storage.set(key, value); },
    removeItem(key) { storage.delete(key); }
  }, console: { error() {} } });
  const boxes = nodes.get('otpBoxes').children;
  function enter(code) {
    [...code].forEach((digit, index) => { boxes[index].value = digit; boxes[index].listeners.input({ target: boxes[index] }); });
  }
  async function verify() {
    await nodes.get('otpForm').listeners.submit({ preventDefault() {} });
    // Form event calls verify() without awaiting; flush the asynchronous handler.
    await new Promise(resolve => setImmediate(resolve));
  }
  return { nodes, boxes, window, location, storage, timers, calls, enter, verify };
}

{
  const app = setup({ result: { data: { user: { email: 'shopper@example.com' }, session: { access_token: 'ok' } }, error: null } });
  app.enter('123456');
  await app.verify();
  assert.deepEqual(app.calls, [['verify', 'shopper@example.com', '123456']]);
  assert.equal(app.location.href, 'http://localhost:4173/');
  assert.equal(app.storage.has('so_pending_signup_email'), false);
  assert.equal(app.nodes.get('verifyBtn').textContent, 'Verified');
  assert.equal(app.timers.length, 0, 'a successful OTP needs no delayed sign-out/redirect');
}
for (const [name, result] of [
  ['rejected', { data: { user: null, session: null }, error: { message: 'Invalid token' } }],
  ['no session', { data: { user: { email: 'shopper@example.com' }, session: null }, error: null }],
  ['other user', { data: { user: { email: 'other@example.com' }, session: { access_token: 'bad' } }, error: null }]
]) {
  const app = setup({ result });
  app.enter('123456');
  await app.verify();
  assert.equal(app.location.href, 'http://localhost:4173/verify-otp.html?email=shopper%40example.com', `${name} must stay on OTP page`);
  assert.match(app.nodes.get('alertBox').className, /is-visible/);
  assert.equal(app.nodes.get('verifyBtn').textContent, 'Verify');
  assert.equal(app.storage.has('so_pending_signup_email'), true);
  assert.equal(app.calls.some(call => call[0] === 'signOut'), false);
}
{
  const app = setup({ email: '', result: null });
  assert.equal(app.nodes.get('verifyBtn').disabled, true);
  assert.match(app.nodes.get('alertBox').textContent, /No email address found/);
  assert.equal(app.calls.length, 0);
  assert.equal(app.location.href, 'http://localhost:4173/verify-otp.html');
}
console.log('PASS: correct signup OTP goes home; wrong/missing-session/missing-email OTP stays on page');
for (const [label, result, expectedHome] of [
  ['correct', { data: { user: { email: 'shopper@example.com' }, session: { access_token: 'ok' } }, error: null }, true],
  ['incorrect', { data: { user: null, session: null }, error: { message: 'Invalid token' } }, false]
]) {
  const app = setup({ result, signin: true });
  app.enter('123456');
  await app.verify();
  assert.deepEqual(app.calls, [['verify', 'shopper@example.com', '123456', 'email']]);
  assert.equal(app.location.href === 'http://localhost:4173/', expectedHome, `${label} sign-in OTP redirect`);
  assert.equal(app.storage.has('so_pending_signin_email'), !expectedHome);
}
{
  const app = setup({ signin: true, email: '', result: null });
  assert.equal(app.nodes.get('verifyBtn').disabled, true);
  assert.equal(app.calls.length, 0);
}
console.log('PASS: sign-in OTP correct code goes home; incorrect/missing-email stays on verification');
for (const [label, result, expectedReset] of [
  ['correct', { data: { user: { email: 'shopper@example.com' }, session: { access_token: 'ok' } }, error: null }, true],
  ['incorrect', { data: { user: null, session: null }, error: { message: 'Invalid token' } }, false],
  ['no session', { data: { user: { email: 'shopper@example.com' }, session: null }, error: null }, false],
  ['other user', { data: { user: { email: 'another@example.com' }, session: { access_token: 'bad' } }, error: null }, false]
]) {
  const app = setup({ result, recovery: true });
  app.enter('123456');
  await app.verify();
  assert.deepEqual(app.calls, [['verify', 'shopper@example.com', '123456', 'recovery']]);
  assert.equal(app.location.href === 'reset-password.html', expectedReset, `${label} recovery OTP should only open reset form after verification`);
  assert.equal(app.storage.has('so_verified_recovery_email'), expectedReset);
  assert.equal(app.storage.has('so_pending_recovery_email'), !expectedReset);
  assert.notEqual(app.location.href, 'http://localhost:4173/', 'recovery OTP alone must never open home');
}
{
  const app = setup({ recovery: true, email: '', result: null });
  assert.equal(app.nodes.get('verifyBtn').disabled, true);
  assert.match(app.nodes.get('alertBox').textContent, /No pending password reset/);
  assert.equal(app.calls.length, 0);
}
console.log('PASS: recovery OTP only opens password form after valid code and matching session; failures never go home');