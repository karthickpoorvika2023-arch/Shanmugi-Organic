/* Standalone recovery screen regression: no account shell or shopper details. */
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
  console.log('SKIP: reset-password browser test requires Chrome or Edge (set CHROME_PATH)');
  process.exit(0);
}
const profile = mkdtempSync(join(tmpdir(), 'reset-password-browser-'));
const port = 42781;
const debugPort = 42782;
const server = spawn(process.execPath, ['tools/serve.mjs'], {
  cwd: root, env: { ...process.env, PORT: String(port) }, stdio: 'ignore'
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
    } catch { /* page is still loading */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Timed out waiting for recovery page');
}
try {
  await waitFor(async () => (await fetch(`http://127.0.0.1:${port}/reset-password.html`)).ok);
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
    const item = pending.get(message.id);
    if (!item) return;
    pending.delete(message.id);
    message.error ? item.reject(new Error(message.error.message)) : item.resolve(message.result);
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
  const base = `http://127.0.0.1:${port}/`;
  // Use a mocked recovery session, never a real user's reset link.
  await send('Page.enable');
  await send('Network.enable');
  await send('Network.setBlockedURLs', { urls: ['*supabase.umd.js*', '*supabase-client.js*'] });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.SupabaseClient = { auth: {
      setSession: async ({ access_token }) => {
        window.resetTokenWasChecked = access_token === 'test-recovery';
        return { data: { session: {} }, error: null };
      },
      getSession: async () => ({ data: { session: { access_token: 'verified' } }, error: null }),
      getUser: async () => ({ data: { user: { email: 'test@example.com' } }, error: null }),
      updateUser: async ({ password }) => {
        window.passwordWasUpdated = password === 'NewPassword123!';
        return { data: {}, error: null };
      }
    } };
    window.Supabase = { signOut: async () => { window.signedOut = true; return { error: null }; } };
    const originalTimeout = window.setTimeout;
    window.setTimeout = (fn, ms, ...args) => originalTimeout(fn, ms === 2000 ? 50 : ms, ...args);
  ` });
  await send('Page.navigate', { url: base + 'reset-password.html' });
  await waitFor(async () => evaluate('document.readyState === "complete" && !document.getElementById("errorState").classList.contains("hidden")'));
  assert.equal(await evaluate('document.getElementById("resetForm").classList.contains("hidden")'), true);
  assert.equal(await evaluate('!!document.querySelector("[data-shell], .masthead, .topbar, #userAccountBtn, #cartBtn, #wishlistBtn")'), false);
  console.log('PASS: missing recovery link shows error without the storefront or account details');

  await evaluate('sessionStorage.setItem("so_verified_recovery_email", "test@example.com")');
  await send('Page.navigate', { url: 'about:blank' });
  await waitFor(async () => evaluate('location.href === "about:blank"'));
  await send('Page.navigate', { url: base + 'reset-password.html' });
  await waitFor(async () => evaluate('document.readyState === "complete" && !document.getElementById("resetForm").classList.contains("hidden")'));
  assert.equal(await evaluate('sessionStorage.getItem("so_verified_recovery_email")'), null);
  assert.equal(await evaluate('!!document.querySelector("[data-shell], .masthead, .topbar, #userAccountBtn, #cartBtn, #wishlistBtn")'), false);
  console.log('PASS: verified recovery OTP session opens the password form without storefront details');

  // A hash-only navigation on the same URL does not rerun the recovery script.
  // Leave the page before opening the link, just as a user does from Mailpit.
  await send('Page.navigate', { url: 'about:blank' });
  await waitFor(async () => evaluate('location.href === "about:blank"'));
  await send('Page.navigate', { url: base + 'reset-password.html#access_token=test-recovery&refresh_token=test-refresh&type=recovery' });
  await waitFor(async () => evaluate('document.readyState === "complete" && !document.getElementById("resetForm").classList.contains("hidden")'));
  assert.equal(await evaluate('window.resetTokenWasChecked'), true);
  assert.equal(await evaluate('!!document.querySelector("[data-shell], .masthead, .topbar, #userAccountBtn, #cartBtn, #wishlistBtn")'), false);
  assert.equal(await evaluate(`(() => {
    const image = document.querySelector('.auth-card__logo img');
    return image.getAttribute('src') === 'assets/img/logo.png' && image.naturalWidth > 0;
  })()`), true);
  await evaluate(`(() => {
    document.getElementById('password').value = 'NewPassword123!';
    document.getElementById('confirmPassword').value = 'NewPassword123!';
    document.getElementById('passwordResetForm').requestSubmit();
  })()`);
  await waitFor(async () => evaluate('location.pathname === "/"'));
  console.log('PASS: recovery form loads with requested logo and no store shell; password update opens home');
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