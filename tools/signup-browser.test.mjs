/* Optional real-browser regression check: node tools/signup-browser.test.mjs */
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
  console.log('SKIP: signup browser test requires Chrome or Edge (set CHROME_PATH)');
  process.exit(0);
}

const profile = mkdtempSync(join(tmpdir(), 'signup-browser-'));
const sitePort = 42731;
const debugPort = 42732;
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
  await waitFor(async () => (await fetch(`http://127.0.0.1:${sitePort}/signup.html`)).ok);
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

  await send('Page.enable');
  await send('Network.enable');
  // Third-party CDN scripts can fail; the local Supabase SDK must still initialize.
  for (const blockSignupScript of [false, true]) {
    await send('Network.setBlockedURLs', { urls: [
      '*cdn.jsdelivr.net*', '*fonts.googleapis.com*', '*fonts.gstatic.com*',
      ...(blockSignupScript ? ['*signup-email.js*'] : [])
    ] });
    for (const width of [390, 1280]) {
      for (const editor of [false, true]) {
        await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width === 390 });
        await send('Page.navigate', { url: `http://127.0.0.1:${sitePort}/signup.html${editor ? '?cms=edit' : ''}` });
        await waitFor(async () => evaluate('document.readyState === "complete" && !!document.getElementById("confirmPassword")'));
        if (editor) await waitFor(async () => evaluate('document.documentElement.classList.contains("cms-edit-mode")'));
        await waitFor(async () => evaluate('!!window.Supabase && !!window.Supabase.client && typeof window.Supabase.signUp === "function"'));
        for (const id of ['password', 'confirmPassword']) {
          const state = async () => evaluate(`(() => {
        const input = document.getElementById('${id}');
        const button = document.querySelector('[data-toggle-password="${id}"]');
        const r = button.getBoundingClientRect();
        return { type: input.type, label: button.getAttribute('aria-label'),
          x: r.left + r.width / 2, y: r.top + r.height / 2,
          hit: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === button };
      })()`);
          await evaluate(`document.getElementById('${id}').value = 'ExamplePassword123!'`);
          let before = await state();
          assert.equal(before.type, 'password');
          assert.equal(before.hit, true, `${width}px: click should hit the ${id} eye button`);
          for (const [expectedType, expectedLabel] of [['text', 'Hide password'], ['password', 'Show password']]) {
            await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: before.x, y: before.y, button: 'left', clickCount: 1 });
            await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: before.x, y: before.y, button: 'left', clickCount: 1 });
            const after = await state();
            assert.equal(after.type, expectedType, `${width}px ${editor ? 'CMS preview' : 'signup'}: clicking ${id} should ${expectedType === 'text' ? 'show' : 'hide'} password`);
            assert.equal(after.label, expectedLabel);
            before = after;
          }
        }
        if (!blockSignupScript && !editor && width === 390) {
          // Exercise the actual form handler without sending credentials or creating an account.
          await evaluate(`(() => {
            const nativeFetch = window.fetch.bind(window);
            window.fetch = (url, options) => {
              if (String(url).includes('/auth/v1/settings'))
                return Promise.resolve(new Response(JSON.stringify({ disable_signup: false, mailer_autoconfirm: false }),
                  { status: 200, headers: { 'Content-Type': 'application/json' } }));
              if (String(url).includes('/auth/v1/signup')) {
                const data = JSON.parse(options.body);
                sessionStorage.setItem('signup_test_called', String(!!data.email && !!data.password && !!data.data.phone));
                sessionStorage.setItem('signup_test_redirect', new URL(url).searchParams.get('redirect_to'));
                return Promise.resolve(new Response(JSON.stringify({ id: 'test-user' }),
                  { status: 200, headers: { 'Content-Type': 'application/json' } }));
              }
              return nativeFetch(url, options);
            };
            document.getElementById('fullName').value = 'Test Person';
            document.getElementById('email').value = 'test@example.com';
            document.getElementById('phone').value = '+91 9876543210';
            document.getElementById('password').value = 'SecurePass1!';
            document.getElementById('confirmPassword').value = 'SecurePass1!';
            document.getElementById('terms').checked = true;
            document.getElementById('signupForm').requestSubmit();
          })()`);
          await waitFor(async () => evaluate('location.pathname.endsWith("/verify-otp.html")'));
          assert.equal(await evaluate('sessionStorage.getItem("signup_test_called")'), 'true');
          assert.equal(await evaluate('sessionStorage.getItem("signup_test_redirect")'), `http://127.0.0.1:${sitePort}/`);
          console.log('PASS: browser signup reaches OTP with CDN blocked (auth and settings mocked)');
        }
        console.log(`PASS: browser signup visibility at ${width}px (${editor ? 'CMS preview' : 'normal'}, ${blockSignupScript ? 'signup script blocked' : 'signup script loaded'})`);
      }
    }
  }
  // Reproduce the reported failure: neither the browser SDK nor its client helper loads.
  // The form should still reach the verification step over the Supabase Auth HTTP API.
  await send('Network.setBlockedURLs', { urls: ['*supabase.umd.js*', '*supabase-client.js*', '*cdn.jsdelivr.net*', '*fonts.googleapis.com*', '*fonts.gstatic.com*'] });
  await send('Page.navigate', { url: `http://127.0.0.1:${sitePort}/signup.html?no-sdk-test=1` });
  await waitFor(async () => evaluate('document.readyState === "complete" && !!document.getElementById("signupForm")'));
  assert.equal(await evaluate('!!(window.Supabase && window.Supabase.client)'), false);
  await evaluate(`(() => {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (url, options) => {
      if (String(url).includes('/auth/v1/settings'))
        return Promise.resolve(new Response(JSON.stringify({ disable_signup: false, mailer_autoconfirm: false }), { status: 200 }));
      if (String(url).includes('/auth/v1/signup')) {
        const payload = JSON.parse(options.body);
        sessionStorage.setItem('signup_no_sdk_test', String(!!payload.email && !!payload.password && !!payload.data.phone));
        return Promise.resolve(new Response(JSON.stringify({ id: 'test-user' }), { status: 200 }));
      }
      return nativeFetch(url, options);
    };
    document.getElementById('fullName').value = 'Test Person';
    document.getElementById('email').value = 'test@example.com';
    document.getElementById('phone').value = '+91 9876543210';
    document.getElementById('password').value = 'SecurePass1!';
    document.getElementById('confirmPassword').value = 'SecurePass1!';
    document.getElementById('terms').checked = true;
    document.getElementById('signupForm').requestSubmit();
  })()`);
  await waitFor(async () => evaluate('location.pathname.endsWith("/verify-otp.html")'));
  assert.equal(await evaluate('sessionStorage.getItem("signup_no_sdk_test")'), 'true');
  console.log('PASS: signup reaches OTP even with Supabase browser SDK blocked (HTTP calls mocked)');
} finally {
  socket?.close();
  server.kill();
  browser.kill();
  // Chrome releases its Windows profile files asynchronously after shutdown.
  try {
    await waitFor(() => exited, 5000);
    rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  } catch (error) {
    if (error.code !== 'EPERM' && error.code !== 'EBUSY') console.warn('Could not remove browser test profile:', error.message);
  }
}