/* Real-browser sign-in regression: eye toggle and missing SDK handling. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const chrome = process.env.CHROME_PATH || [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
].find(existsSync);
if (!chrome) {
  console.log('SKIP: sign-in browser test requires Chrome or Edge (set CHROME_PATH)');
  process.exit(0);
}

const profile = mkdtempSync(join(tmpdir(), 'signin-browser-'));
const sitePort = 42751;
const debugPort = 42752;
const server = spawn(process.execPath, ['tools/serve.mjs'], {
  cwd: root, env: { ...process.env, PORT: String(sitePort) }, stdio: 'ignore'
});
const browser = spawn(chrome, [
  '--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-allow-origins=*', `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profile}`, 'about:blank'
], { stdio: 'ignore' });
let socket;
let exited = false;
browser.once('exit', () => { exited = true; });

async function waitFor(fn, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const value = await fn();
      if (value) return value;
    } catch { /* still starting */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Timed out waiting for browser or page');
}

try {
  await waitFor(async () => (await fetch(`http://127.0.0.1:${sitePort}/signin.html`)).ok);
  const page = await waitFor(async () => {
    const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
    return targets.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
  });
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const result = pending.get(message.id);
    if (!result) return;
    pending.delete(message.id);
    message.error ? result.reject(new Error(message.error.message)) : result.resolve(message.result);
  });
  function send(method, params = {}) {
    const id = ++sequence;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const reply = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (reply.exceptionDetails) throw new Error(reply.exceptionDetails.text);
    return reply.result.value;
  }
  const navigate = async () => {
    await send('Page.navigate', { url: `http://127.0.0.1:${sitePort}/signin.html` });
    await waitFor(async () => evaluate('document.readyState === "complete" && !!document.querySelector(".password-toggle")'));
  };
  const eyeState = () => evaluate(`(() => ({
    type: document.getElementById('password').type,
    label: document.querySelector('.password-toggle').getAttribute('aria-label'),
    pressed: document.querySelector('.password-toggle').getAttribute('aria-pressed')
  }))()`);
  const clickEye = () => evaluate('document.querySelector(".password-toggle").click()');
  async function clickEyeWithMouse() {
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await evaluate('document.querySelector(".password-toggle").scrollIntoView({ block: "center" })');
    const position = await evaluate(`(() => {
      const rect = document.querySelector('.password-toggle').getBoundingClientRect();
      const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
      return { x, y, onButton: !!document.elementFromPoint(x, y)?.closest('.password-toggle') };
    })()`);
    assert.equal(position.onButton, true, 'eye must be within viewport and clickable');
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...position, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...position, button: 'left', clickCount: 1 });
  }
  const submit = () => evaluate(`(() => {
    document.getElementById('email').value = 'example@example.com';
    document.getElementById('password').value = 'test-password-123';
    document.getElementById('signinForm').requestSubmit();
  })()`);

  await send('Page.enable');
  await send('Network.enable');
  await send('Network.setBlockedURLs', { urls: ['*cdn.jsdelivr.net*', '*fonts.googleapis.com*', '*fonts.gstatic.com*'] });
  await navigate();
  assert.equal(await evaluate('typeof window.Supabase?.signIn'), 'function');
  assert.equal((await eyeState()).type, 'password');
  await clickEyeWithMouse();
  assert.deepEqual(await eyeState(), { type: 'text', label: 'Hide password', pressed: 'true' });
  await clickEyeWithMouse();
  assert.deepEqual(await eyeState(), { type: 'password', label: 'Show password', pressed: 'false' });
  await evaluate(`(() => {
    const original = window.fetch.bind(window);
    window.fetch = (url, options) => String(url).includes('/__local/signin-otp/start')
      ? Promise.resolve(new Response(JSON.stringify({ error: 'Invalid email or password' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } })) : original(url, options);
  })()`);
  await submit();
  await waitFor(async () => (await evaluate('document.getElementById("alertBox").textContent')).includes('Invalid email or password'));
  console.log('PASS: sign-in eye shows/hides password; rejected password stays on page');

  await evaluate(`(() => {
    const original = window.fetch.bind(window);
    window.fetch = (url, options) => String(url).includes('/__local/signin-otp/start')
      ? Promise.resolve(new Response(JSON.stringify({ sent: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } })) : original(url, options);
  })()`);
  await submit();
  await waitFor(async () => evaluate('location.pathname.endsWith("/verify-otp.html") && !!document.getElementById("otpForm")'));
  assert.equal(await evaluate('sessionStorage.getItem("so_pending_signin_email")'), 'example@example.com');
  await evaluate(`(() => {
    window.SupabaseClient.auth.verifyOtp = async ({ email, token }) => token === '123456'
      ? { data: { user: { email }, session: { access_token: 'test-session' } }, error: null }
      : { data: { user: null, session: null }, error: { message: 'Invalid token' } };
    window.enterTestCode = code => {
      document.querySelectorAll('.otp-input').forEach((box, index) => {
        box.value = code[index];
        box.dispatchEvent(new Event('input', { bubbles: true }));
      });
      document.getElementById('otpForm').requestSubmit();
    };
  })()`);
  await evaluate('window.enterTestCode("000000")');
  await waitFor(async () => (await evaluate('document.getElementById("alertBox").textContent')).includes('Invalid or expired OTP'));
  assert.equal(await evaluate('location.pathname.endsWith("/verify-otp.html")'), true);
  await evaluate('window.enterTestCode("123456")');
  await waitFor(async () => evaluate('location.pathname === "/"'));
  console.log('PASS: sign-in sends OTP, wrong code stays on verification, correct code goes home (Auth mocked)');

  await send('Network.setBlockedURLs', { urls: [
    '*supabase.umd.js*', '*supabase-client.js*', '*cdn.jsdelivr.net*', '*fonts.googleapis.com*', '*fonts.gstatic.com*'
  ] });
  await navigate();
  assert.equal(await evaluate('typeof window.Supabase'), 'undefined');
  await clickEyeWithMouse();
  assert.equal((await eyeState()).type, 'text', 'eye must work without the Auth SDK');
  await clickEye();
  assert.equal((await eyeState()).type, 'password');
  await submit();
  await waitFor(async () => (await evaluate('document.getElementById("alertBox").textContent')).includes('Sign-in service unavailable'));
  assert.equal(await evaluate('document.getElementById("submitBtn").textContent.trim()'), 'Sign In');
  console.log('PASS: missing Auth SDK leaves the eye usable and shows a clear sign-in error');
} finally {
  socket?.close();
  server.kill();
  browser.kill();
  try {
    await waitFor(() => exited, 5000);
    rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  } catch (error) {
    if (error.code !== 'EPERM' && error.code !== 'EBUSY') console.warn('Could not remove browser test profile:', error.message);
  }
}