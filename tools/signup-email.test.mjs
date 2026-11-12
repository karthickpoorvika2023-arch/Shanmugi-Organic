import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const signup = fs.readFileSync(path.join(root, 'frontend/signup.html'), 'utf8');
const otp = fs.readFileSync(path.join(root, 'frontend/verify-otp.html'), 'utf8');
const signin = fs.readFileSync(path.join(root, 'frontend/signin.html'), 'utf8');
const client = fs.readFileSync(path.join(root, 'plugins/supabase/supabase-client.js'), 'utf8');
const localSdk = 'plugins/supabase/supabase.umd.js';
const confirmationTemplate = fs.readFileSync(path.join(root, 'md/CONFIRM_SIGNUP_OTP_TEMPLATE.html'), 'utf8');
assert.match(confirmationTemplate, /{{\s*\.Token\s*}}/, 'confirmation template must include the Supabase-generated OTP');
assert.doesNotMatch(confirmationTemplate, /ConfirmationURL/, 'confirmation template should direct users to enter the OTP, not a link');
assert.match(confirmationTemplate, /Confirm Your Email/, 'signup email must describe email confirmation');
assert.match(confirmationTemplate, /60 minutes/, 'display the configured 3600-second email OTP lifetime');
assert.match(confirmationTemplate, /border-top:4px solid/, 'include the screenshot-inspired accent line');
assert.match(confirmationTemplate, /letter-spacing:5px/, 'make the OTP prominent and readable');
assert.doesNotMatch(confirmationTemplate, /reset (your )?password|<button\b|<script\b|<link\b/i, 'signup OTP email must not be a password-reset or button template');
assert.match(otp, /const OTP_LENGTH = 6;/, 'OTP boxes must match the project email OTP length');
assert.doesNotMatch(signin, /Email me a sign-in code|localOtpEntry|sendLoginOtp|loginOtpForm/, 'sign-in must not offer passwordless email codes');
assert.doesNotMatch(client, /signInWithEmailOtp|verifyEmailOtp|signInWithOtp/, 'unused passwordless sign-in helpers must be removed');
assert.doesNotMatch(otp, /goToSignin|signinUrl/, 'verified signup OTP must not sign out and return to sign-in');
assert.match(otp, /Mailpit's local inbox/, 'local signup must explain where the code is captured');
{
  const hint = otp.match(/<script id="local-otp-mailpit-hint">([\s\S]*?)<\/script>/);
  assert.ok(hint, 'local Mailpit notice needs a preview-only visibility guard');
  for (const [origin, configured, expected] of [
    ['http://localhost:4173', { url: 'http://127.0.0.1:54321' }, false],
    ['http://localhost:4173', null, true],
    ['https://store.example', { url: 'http://127.0.0.1:54321' }, true]
  ]) {
    const element = { hidden: true };
    vm.runInNewContext(hint[1], { location: { origin }, window: { __soSupabaseConfig: configured },
      document: { getElementById: () => element } });
    assert.equal(element.hidden, expected, 'Mailpit notice is visible only on the configured local preview');
  }
}
assert.match(otp, /const boxCount = OTP_LENGTH;/, 'OTP boxes must use the configured length');
assert.doesNotMatch(otp, /params\.get\('digits'\)/, 'query parameters must not override the project OTP length');
assert.match(signup, /assets\/js\/signup-email\.js\?v=5/);
assert.ok(fs.existsSync(path.join(root, localSdk)), 'the locally hosted Supabase browser SDK must exist');
for (const [name, html] of Object.entries({ signup, signin, otp, 'verify-email': fs.readFileSync(path.join(root, 'frontend/verify-email.html'), 'utf8'), 'forgot-password': fs.readFileSync(path.join(root, 'frontend/forgot-password.html'), 'utf8'), 'reset-password': fs.readFileSync(path.join(root, 'frontend/reset-password.html'), 'utf8') })) {
  assert.match(html, /<script src="plugins\/supabase\/supabase\.umd\.js"><\/script>\s*<script src="plugins\/supabase\/supabase-client\.js(?:\?v=\d+)?"><\/script>/, `${name} must load the local SDK before its Supabase client`);
}
for (const page of [signup, otp, signin]) assert.doesNotMatch(page, /sms-otp\.js|firebasejs|phone-signup|SmsOtp/);
assert.match(otp, /verifySignupOtp\(email, code\)/);
assert.match(otp, /resendVerification\(email\)/);
assert.match(client, /async verifySignupOtp\(email, token\)[\s\S]*?type: 'email'/);
assert.doesNotMatch(otp, /autoConfirmMode|smsMode|signInWithEmailOtp/);

{
  const calls = [];
  const auth = {
    verifyOtp: async (payload) => { calls.push(['verify', payload]); return { data: { user: { id: 'test' } }, error: null }; },
    resend: async (payload) => { calls.push(['resend', payload]); return { error: null }; }
  };
  const context = vm.createContext({ window: { location: { href: 'https://store.example/signup.html', origin: 'https://store.example' }, supabase: { createClient: () => ({ auth }) } }, URL, console: { log() { } } });
  vm.runInContext(client, context);
  await context.window.Supabase.verifySignupOtp('test@example.com', '123456');
  await context.window.Supabase.resendVerification('test@example.com');
  assert.equal(calls[0][1].type, 'email');
  assert.equal(calls[0][1].token, '123456');
  assert.equal(calls[1][1].type, 'signup');
  assert.equal(calls[1][1].options.emailRedirectTo, 'https://store.example/');
}

function setup(settings, signupResult = { status: 200, body: { id: 'test-user' } }, storage = new Map()) {
  const elements = new Map();
  function element(id, value = '') {
    return {
      value, type: id === 'password' || id === 'confirmPassword' ? 'password' : 'text',
      disabled: false, validity: { valid: true }, checked: true,
      style: {}, className: '', textContent: '', listeners: {}, focus() { },
      scrollIntoView() { }, addEventListener(name, fn) { this.listeners[name] = fn; }
    };
  }
  for (const [id, value] of Object.entries({ fullName: 'Test Person', email: 'test@example.com', phone: '+91 9876543210', password: 'SecurePass1!', confirmPassword: 'SecurePass1!' })) elements.set(id, element(id, value));
  for (const id of ['signupForm', 'submitBtn', 'alertBox', 'strengthFill', 'strengthText', 'terms']) elements.set(id, element(id));
  const toggles = ['password', 'confirmPassword'].map(id => {
    const attributes = { 'data-toggle-password': id, 'aria-label': 'Show password', 'aria-pressed': 'false' };
    const icons = { '.eye-open': { style: { display: 'block' } }, '.eye-off': { style: { display: 'none' } } };
    return {
      listeners: {}, icons,
      getAttribute(name) { return attributes[name]; },
      setAttribute(name, value) { attributes[name] = value; },
      querySelector(selector) { return icons[selector]; },
      addEventListener(name, fn) { this.listeners[name] = fn; }
    };
  });
  const log = { signups: [], requests: [], storage: [] };
  const window = {
    location: { href: 'https://store.example/signup.html', origin: 'https://store.example' }, Supabase: {
      isAuthenticated: async () => false
    }
  };
  const context = vm.createContext({
    window, URL, console: { error() { } }, sessionStorage: {
      getItem(key) { return storage.get(key) || null; },
      setItem(...args) { log.storage.push(args); storage.set(args[0], args[1]); }
    },
    document: { getElementById(id) { return elements.get(id); }, querySelectorAll(selector) { return selector === '.password-toggle[data-toggle-password]' ? toggles : []; } },
    fetch: async (url, options) => {
      log.requests.push([url, options]);
      if (url.includes('/auth/v1/settings')) return { ok: true, json: async () => settings };
      if (url.includes('/auth/v1/signup')) {
        log.signups.push([url, options]);
        return {
          ok: signupResult.status < 400, status: signupResult.status,
          headers: { get(name) { return name === 'Retry-After' ? signupResult.retryAfter || null : null; } },
          json: async () => signupResult.body
        };
      }
      throw new Error('Unexpected request: ' + url);
    }
  });
  const visibility = signup.match(/<script id="signup-password-visibility">([\s\S]*?)<\/script>/);
  assert.ok(visibility, 'signup password toggles must be initialized in the page');
  vm.runInContext(visibility[1], context);
  vm.runInContext(fs.readFileSync(path.join(root, 'frontend/assets/js/signup-email.js'), 'utf8'), context);
  return { elements, toggles, log, window, submit: () => elements.get('signupForm').listeners.submit({ preventDefault() { } }) };
}

{
  const app = setup({ disable_signup: false, mailer_autoconfirm: false });
  for (const [index, id] of ['password', 'confirmPassword'].entries()) {
    const markup = signup.match(new RegExp(`<button\\b[^>]*data-toggle-password="${id}"[^>]*>`));
    assert.ok(markup, `${id} needs its own visibility button`);
    assert.match(markup[0], /type="button"/);
    assert.match(markup[0], /aria-pressed="false"/);
    assert.doesNotMatch(markup[0], /tabindex="-1"/, 'eye button must be keyboard accessible');

    const input = app.elements.get(id);
    const other = app.elements.get(id === 'password' ? 'confirmPassword' : 'password');
    const toggle = app.toggles[index];
    const originalValue = input.value;
    const otherType = other.type;
    toggle.listeners.click();
    assert.equal(input.type, 'text');
    assert.equal(input.value, originalValue, 'showing a password must not alter its value');
    assert.equal(other.type, otherType, 'visibility buttons must act independently');
    assert.equal(toggle.getAttribute('aria-label'), 'Hide password');
    assert.equal(toggle.getAttribute('aria-pressed'), 'true');
    assert.equal(toggle.icons['.eye-open'].style.display, 'none');
    assert.equal(toggle.icons['.eye-off'].style.display, 'block');

    toggle.listeners.click();
    assert.equal(input.type, 'password');
    assert.equal(toggle.getAttribute('aria-label'), 'Show password');
    assert.equal(toggle.getAttribute('aria-pressed'), 'false');
    assert.equal(toggle.icons['.eye-open'].style.display, 'block');
    assert.equal(toggle.icons['.eye-off'].style.display, 'none');
  }
  assert.equal(app.log.signups.length, 0, 'visibility controls must not submit the form');
}

{
  const app = setup({ disable_signup: false, mailer_autoconfirm: false });
  await app.submit();
  assert.equal(app.log.signups.length, 1);
  const [url, options] = app.log.signups[0];
  assert.equal(url, 'https://ufhlmdqkqdkcohpbzdux.supabase.co/auth/v1/signup?redirect_to=https%3A%2F%2Fstore.example%2F');
  assert.equal(options.method, 'POST');
  assert.equal(options.headers.apikey, 'sb_publishable_vGSGtfcC4bX9jGtIWpAknQ_-c42WmiR');
  assert.equal(options.headers['Content-Type'], 'application/json');
  const payload = JSON.parse(options.body);
  assert.equal(payload.email, 'test@example.com');
  assert.equal(payload.password, 'SecurePass1!');
  assert.equal(payload.data.phone, '+919876543210');
  assert.equal(payload.data.full_name, 'Test Person');
  assert.equal(app.log.storage[0][0], 'so_pending_signup_email');
  assert.equal(app.window.location.href, 'verify-otp.html?email=test%40example.com');
}
{
  const app = setup({ disable_signup: false, mailer_autoconfirm: false });
  app.window.location.href = 'https://store.example/shop/signup.html';
  await app.submit();
  assert.equal(new URL(app.log.signups[0][0]).searchParams.get('redirect_to'), 'https://store.example/shop/');
}
for (const settings of [{ disable_signup: true, mailer_autoconfirm: false }, { disable_signup: false, mailer_autoconfirm: true }]) {
  const app = setup(settings);
  await app.submit();
  assert.equal(app.log.signups.length, 0, 'misconfigured project must not create an account');
  assert.match(app.elements.get('alertBox').textContent, /Confirm email|public signup/);
}
{
  const app = setup({ disable_signup: false, mailer_autoconfirm: false }, { status: 429, body: { msg: 'Email rate limit exceeded' } });
  await app.submit();
  assert.equal(app.window.location.href, 'https://store.example/signup.html');
  assert.equal(app.elements.get('submitBtn').disabled, false);
  assert.match(app.elements.get('alertBox').textContent, /Email sending is temporarily limited/);
  assert.match(app.elements.get('alertBox').textContent, /No verification email was sent/);
  assert.equal(app.log.signups.length, 1);
  await app.submit();
  assert.equal(app.log.signups.length, 1, 'cooldown must block repeat sends');
  assert.equal(app.log.requests.length, 2, 'cooldown must also avoid repeated settings requests');
}
{
  const storage = new Map();
  const result = { status: 429, body: { code: 'over_email_send_rate_limit', msg: 'Too Many Requests' }, retryAfter: '120' };
  const app = setup({ disable_signup: false, mailer_autoconfirm: false }, result, storage);
  await app.submit();
  assert.match(app.elements.get('alertBox').textContent, /at least 2 minutes/);
  const until = Number(storage.get('so_signup_email_rate_limit_until_v1'));
  assert.ok(until > Date.now() + 110000);
  const afterReload = setup({ disable_signup: false, mailer_autoconfirm: false }, result, storage);
  await afterReload.submit();
  assert.equal(afterReload.log.requests.length, 0, 'cooldown survives a reload in the same tab');
}
{
  const app = setup({ disable_signup: false, mailer_autoconfirm: false }, { status: 429, body: { msg: 'Too many requests' } });
  await app.submit();
  assert.match(app.elements.get('alertBox').textContent, /Too many signup requests/);
  await app.submit();
  assert.equal(app.log.signups.length, 2, 'a non-email 429 must not claim the email quota was hit');
}
{
  const app = setup({ disable_signup: false, mailer_autoconfirm: false }, { status: 200, body: { access_token: 'test-token' } });
  await app.submit();
  assert.equal(app.window.location.href, 'https://store.example/signup.html');
  assert.match(app.elements.get('alertBox').textContent, /Email confirmation is disabled/);
}
{
  // The form must not depend on the browser Supabase SDK at all.
  const app = setup({ disable_signup: false, mailer_autoconfirm: false });
  delete app.window.Supabase;
  await app.submit();
  assert.equal(app.log.signups.length, 1);
}
{
  const app = setup({ disable_signup: false, mailer_autoconfirm: false });
  app.elements.get('phone').value = '123';
  await app.submit();
  assert.equal(app.log.requests.length, 0);
  assert.equal(app.log.signups.length, 0);
}
console.log('PASS: signup password visibility, email signup, profile metadata, OTP handoff, configuration guards and errors');
