/* Real-browser forgot-password regression: logo, loading, errors and success. */
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
  console.log('SKIP: forgot-password browser test requires Chrome or Edge (set CHROME_PATH)');
  process.exit(0);
}

const profile = mkdtempSync(join(tmpdir(), 'forgot-password-browser-'));
const sitePort = 42771;
const debugPort = 42772;
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
    } catch { /* still loading */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Timed out waiting for browser or page');
}

try {
  await waitFor(async () => (await fetch(`http://127.0.0.1:${sitePort}/forgot-password.html`)).ok);
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
  async function navigate() {
    await send('Page.navigate', { url: `http://127.0.0.1:${sitePort}/forgot-password.html` });
    await waitFor(async () => evaluate('document.readyState === "complete" && !!document.getElementById("resetForm")'));
  }
  async function submit() {
    await evaluate(`(() => {
      document.getElementById('email').value = 'test@example.com';
      document.getElementById('resetForm').requestSubmit();
    })()`);
  }
  const idle = () => evaluate(`(() => {
    const button = document.getElementById('submitBtn');
    return !button.disabled && !button.classList.contains('btn-loading') && button.textContent.trim() === 'Send Reset Code';
  })()`);

  await navigate();
  assert.equal(await evaluate(`(() => {
    const img = document.querySelector('.auth-card__logo img');
    return img.getAttribute('src') === 'assets/img/logo.png' && img.naturalWidth > 0;
  })()`), true, 'the requested PNG logo must load');

  await evaluate('window.Supabase.resetPassword = async () => ({ error: "Supabase not initialized" })');
  await submit();
  await waitFor(async () => evaluate('document.getElementById("alertBox").textContent.includes("Supabase not initialized")'));
  assert.equal(await idle(), true, 'missing SDK must restore the button');
  console.log('PASS: missing SDK shows error and stops spinning');

  await evaluate(`(() => {
    window.SupabaseClient = { auth: {} };
    window.Supabase.resetPassword = async () => ({ error: 'Email rate limit exceeded' });
  })()`);
  await submit();
  await waitFor(async () => evaluate('document.getElementById("alertBox").textContent.includes("Email rate limit exceeded")'));
  assert.equal(await idle(), true, 'string error must restore the button');
  console.log('PASS: Supabase string error shows message and stops spinning');

  await evaluate(`(() => {
    const original = window.setTimeout;
    window.setTimeout = (fn, ms, ...args) => original(fn, ms === 15000 ? 150 : ms, ...args);
    window.Supabase.resetPassword = () => new Promise(() => {});
  })()`);
  await submit();
  await waitFor(async () => evaluate('document.getElementById("alertBox").textContent.includes("Request timed out")'));
  assert.equal(await idle(), true, 'timed-out request must restore the button');
  console.log('PASS: stalled request times out and button can be retried');

  await evaluate('window.Supabase.resetPassword = async () => ({ error: null })');
  await submit();
  await waitFor(async () => evaluate('location.pathname.endsWith("/verify-otp.html") && new URLSearchParams(location.search).get("mode") === "recovery"'));
  assert.equal(await evaluate('sessionStorage.getItem("so_pending_recovery_email")'), 'test@example.com');
  console.log('PASS: reset request opens recovery OTP instead of Check Your Email');

  // Reproduce the screenshot: Live Server serves frontend/ without injecting
  // __soSupabaseConfig. The page must open the working preview instead.
  let liveServerAvailable = false;
  try {
    liveServerAvailable = (await fetch('http://127.0.0.1:5500/frontend/forgot-password.html')).ok &&
      (await fetch('http://localhost:4173/forgot-password.html')).ok;
  } catch { /* preview or Live Server is not running in this environment */ }
  if (liveServerAvailable) {
    await send('Page.navigate', { url: 'http://127.0.0.1:5500/frontend/forgot-password.html' });
    await waitFor(async () => evaluate('location.href === "http://localhost:4173/forgot-password.html" && !!window.SupabaseClient && !!window.__soSupabaseConfig'));
    console.log('PASS: Live Server forgot-password page redirects to configured local preview');
  }
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