/* Real-browser regression check: node tools/admin-login-browser.test.mjs */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const chrome = process.env.CHROME_PATH || [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
].find(existsSync);
if (!chrome) {
  console.log('SKIP: admin login browser test requires Chrome or Edge (set CHROME_PATH)');
  process.exit(0);
}

const profile = mkdtempSync(join(tmpdir(), 'admin-login-browser-'));
const sitePort = 42741;
const debugPort = 42742;
const workspacePort = 42743;
const server = spawn(process.execPath, ['tools/serve.mjs'], {
  cwd: root, env: { ...process.env, PORT: String(sitePort) }, stdio: 'ignore'
});
const browser = spawn(chrome, [
  '--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-allow-origins=*', `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profile}`, 'about:blank'
], { stdio: 'ignore' });
// Simulate Live Server serving the workspace root rather than the dev server's
// flattened frontend/ and plugins/ routes.
const workspaceServer = createServer(async (req, res) => {
  const pathname = req.url.split('?')[0];
  if (!/^\/(frontend|dist|plugins)\//.test(pathname) || pathname.includes('..')) {
    res.writeHead(404).end(); return;
  }
  try {
    const data = await readFile(join(root, pathname.slice(1)));
    res.writeHead(200, { 'Content-Type': pathname.endsWith('.js') ? 'text/javascript' : pathname.endsWith('.css') ? 'text/css' : 'text/html' }).end(data);
  } catch { res.writeHead(404).end(); }
});
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
  await new Promise(resolve => workspaceServer.listen(workspacePort, '127.0.0.1', resolve));
  await waitFor(async () => (await fetch(`http://127.0.0.1:${sitePort}/admin.html`)).ok);
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
  await send('Network.setBlockedURLs', { urls: ['*cdn.jsdelivr.net*', '*fonts.googleapis.com*', '*fonts.gstatic.com*'] });
  await send('Page.navigate', { url: `http://127.0.0.1:${sitePort}/admin.html` });
  await waitFor(async () => evaluate('document.readyState === "complete" && !!document.getElementById("adminGateForm")'));
  assert.equal(await evaluate('!!window.Supabase && !!window.Supabase.client && typeof window.Supabase.signIn === "function"'), true);
  await waitFor(async () => evaluate('document.getElementById("adminGate").style.display === "flex"'));

  const state = () => evaluate(`(() => ({
    gate: document.getElementById('adminGate').style.display,
    layout: document.getElementById('adminLayout').style.display,
    button: document.getElementById('adminGateSubmit').textContent,
    disabled: document.getElementById('adminGateSubmit').disabled,
    error: document.getElementById('adminGateError').textContent
  }))()`);
  const submit = () => evaluate(`(() => {
    document.getElementById('adminGateEmail').value = 'test@example.com';
    document.getElementById('adminGatePass').value = 'TestPassword123!';
    document.getElementById('adminGateForm').requestSubmit();
  })()`);

  await evaluate(`window.Supabase.signIn = () => Promise.resolve({ error: { message: 'Invalid login credentials' } })`);
  await submit();
  await waitFor(async () => (await state()).error === 'Invalid email or password.');
  assert.equal((await state()).disabled, false);
  assert.equal((await state()).gate, 'flex');

  await evaluate(`window.Supabase.signIn = () => Promise.reject(new Error('Network unavailable'))`);
  await submit();
  await waitFor(async () => (await state()).error === 'Network unavailable');
  assert.equal((await state()).disabled, false);

  await evaluate(`window.Supabase.signIn = () => Promise.reject(new TypeError('Failed to fetch'))`);
  await submit();
  await waitFor(async () => (await state()).error.startsWith('Cannot reach Supabase Auth.'));
  assert.equal((await state()).layout, 'none');
  assert.equal((await state()).disabled, false);

  await evaluate(`window.Supabase.signIn = () => new Promise(() => {})`);
  await submit();
  await waitFor(async () => (await state()).error.includes('timed out'), 15000);
  assert.equal((await state()).button, 'Sign In');
  assert.equal((await state()).disabled, false);

  await evaluate(`window.Supabase.signIn = () => Promise.resolve({ data: { user: { id: 'test-id' }, session: { access_token: 'test-token' } }, error: null })`);
  await submit();
  await waitFor(async () => (await state()).error.length > 0 && !(await state()).disabled, 15000);
  assert.equal((await state()).gate, 'flex', 'a signed-in but unapproved or unreachable admin must stay gated');
  assert.equal((await state()).layout, 'none');
  await evaluate(`(() => {
    window.SupabaseClient.auth.getSession = () => Promise.resolve({ data: { session: { access_token: 'test-token' } } });
    const original = window.fetch.bind(window);
    window.fetch = (url, options) => String(url).includes('/functions/v1/demo-payment-kit/admin-check')
      ? Promise.resolve(new Response('', { status: 404 })) : original(url, options);
  })()`);
  await submit();
  await waitFor(async () => (await state()).error.startsWith('Admin backend not deployed.'));
  assert.equal((await state()).layout, 'none');
  assert.equal((await state()).disabled, false);

  await evaluate(`(() => {
    const original = window.fetch.bind(window);
    window.fetch = (url, options) => String(url).includes('/functions/v1/demo-payment-kit/admin-check')
      ? Promise.reject(new TypeError('Failed to fetch')) : original(url, options);
  })()`);
  await submit();
  await waitFor(async () => (await state()).error.startsWith('Cannot reach the admin backend.'));
  assert.equal((await state()).layout, 'none');
  assert.equal((await state()).disabled, false);
  await evaluate(`(() => {
    window.SupabaseClient.auth.getSession = () => Promise.resolve({ data: { session: { access_token: 'test-token' } } });
    const original = window.fetch.bind(window);
    window.fetch = (url, options) => String(url).includes('/functions/v1/demo-payment-kit/admin-check')
      ? Promise.resolve(new Response(JSON.stringify({ admin: true, mode: 'demo' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }))
      : original(url, options);
  })()`);
  await submit();
  await waitFor(async () => (await state()).gate === 'none');
  assert.notEqual((await state()).layout, 'none');
  console.log('PASS: admin login failures stay gated; explicit backend approval opens the dashboard');

  await evaluate(`(() => {
    window.fetch = (url) => {
      const action = String(url).split('/').pop();
      const payload = action === 'admin-check' ? { admin: true, mode: 'demo' }
        : action === 'admin-orders' ? { orders: [] }
        : action === 'admin-customers' ? { customers: [] }
        : action === 'admin-payments' ? { total: 1, payments: [{ reference: 'DEMO-TEST', amount: 620,
            currency: 'INR', status: 'demo', createdAt: new Date().toISOString(),
            customer: { name: 'Sample', email: 'sample@example.com', phone: '0000000000' }, items: [] }] }
        : null;
      return Promise.resolve(new Response(JSON.stringify(payload || {}),
        { status: payload ? 200 : 404, headers: { 'Content-Type': 'application/json' } }));
    };
  })()`);
  const navigateAdmin = name => evaluate(`document.querySelector('.nav-link[data-page="${name}"]').click()`);
  await navigateAdmin('dashboard');
  await waitFor(async () => (await evaluate('document.getElementById("pageContent").textContent')).includes('no real orders'));
  await navigateAdmin('orders');
  await waitFor(async () => (await evaluate('document.getElementById("pageContent").textContent')).includes('No orders'));
  await navigateAdmin('customers');
  await waitFor(async () => (await evaluate('document.getElementById("pageContent").textContent')).includes('No customers'));
  await navigateAdmin('payments');
  await waitFor(async () => (await evaluate('document.getElementById("pageContent").textContent')).includes('DEMO-TEST'));
  const demoView = await evaluate('document.getElementById("pageContent").textContent');
  assert.match(demoView, /DEMO — not paid/);
  assert.match(demoView, /Demo payments collected\s*₹0/);
  await navigateAdmin('reports');
  assert.match(await evaluate('document.getElementById("pageContent").textContent'), /Real revenue report unavailable in demo mode/);
  await navigateAdmin('products');
  assert.equal(await evaluate('document.getElementById("syncSupabaseBtn").disabled'), true);
  assert.match(await evaluate('document.getElementById("pageContent").textContent'), /Catalog editor changes are local to this browser only/);
  await navigateAdmin('categories');
  assert.equal(await evaluate('document.getElementById("syncCatsBtn").disabled'), true);
  console.log('PASS: mocked admin pages isolate real orders/customers from demo ledger; catalog sync remains disabled');

  for (const folder of ['frontend', 'dist']) {
    await send('Page.navigate', { url: `http://127.0.0.1:${workspacePort}/${folder}/admin.html` });
    await waitFor(async () => evaluate('document.readyState === "complete" && document.getElementById("adminGate").style.display === "flex"'));
    assert.equal(await evaluate('!!window.SupabaseClient'), false, 'workspace server has no local config and must never use hosted credentials');
    const clientUrl = await evaluate('Array.from(document.scripts).map(s => s.src).find(s => s.includes("supabase-client.js"))');
    assert.match(clientUrl, folder === 'frontend' ? /\/plugins\/supabase\/supabase-client\.js/ : /\/dist\/plugins\/supabase\/supabase-client\.js/);
    await submit();
    await waitFor(async () => (await state()).error.length > 0);
    assert.match((await state()).error, /Local Supabase configuration unavailable.*localhost:4173\/admin\.html/);
    assert.equal((await state()).layout, 'none');
    console.log(`PASS: workspace Live Server ${folder}/admin.html explains missing local config and stays gated`);
  }

  // Simulate a transient failure to fetch the site's local login scripts.
  await send('Network.setBlockedURLs', { urls: [
    '*cdn.jsdelivr.net*', '*fonts.googleapis.com*', '*fonts.gstatic.com*',
    '*supabase.umd.js*', '*supabase-client.js*'
  ] });
  await send('Page.navigate', { url: `http://127.0.0.1:${sitePort}/admin.html?no-sdk-test=1` });
  await waitFor(async () => evaluate('document.readyState === "complete" && document.getElementById("adminGate").style.display === "flex"'));
  assert.equal(await evaluate('!!window.Supabase'), false);
  await new Promise(resolve => setTimeout(resolve, 500));
  await send('Network.setBlockedURLs', { urls: ['*cdn.jsdelivr.net*', '*fonts.googleapis.com*', '*fonts.gstatic.com*', '*supabase.co*'] });
  // Intercept auth even if the service recovers during the first automatic retry.
  await evaluate(`(() => {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (url, options) => String(url).includes('/auth/v1/token')
      ? Promise.resolve(new Response(JSON.stringify({ msg: 'Invalid login credentials' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }))
      : nativeFetch(url, options);
  })()`);
  await submit();
  await waitFor(async () => evaluate('!!window.Supabase && !!window.Supabase.client && typeof window.Supabase.signIn === "function"'));
  await waitFor(async () => (await state()).error === 'Invalid email or password.' && (await state()).disabled === false, 15000);
  assert.equal((await state()).gate, 'flex');
  assert.equal((await state()).disabled, false);
  assert.equal((await state()).layout, 'none');
  console.log('PASS: admin login service recovers after a transient script load failure');

  // A missing project-specific client must never be replaced by a fake session.
  await send('Network.setBlockedURLs', { urls: ['*supabase-client.js*', '*cdn.jsdelivr.net*', '*fonts.googleapis.com*', '*fonts.gstatic.com*'] });
  await send('Page.navigate', { url: `http://127.0.0.1:${sitePort}/admin.html?missing-client-test=1` });
  await waitFor(async () => evaluate('document.readyState === "complete" && document.getElementById("adminGate").style.display === "flex"'));
  await submit();
  await waitFor(async () => (await state()).error.includes('Project login client missing:'), 15000);
  assert.equal((await state()).layout, 'none');
  assert.equal((await state()).disabled, false);
  console.log('PASS: missing project login client keeps the dashboard locked and shows the deployment path');

  await send('Network.setBlockedURLs', { urls: [
    '*supabase.umd.js*', '*supabase-client.js*', '*cdn.jsdelivr.net*',
    '*fonts.googleapis.com*', '*fonts.gstatic.com*'
  ] });
  await send('Page.navigate', { url: `http://127.0.0.1:${sitePort}/admin.html?missing-sdk-test=1` });
  await waitFor(async () => evaluate('document.readyState === "complete" && document.getElementById("adminGate").style.display === "flex"'));
  await submit();
  await waitFor(async () => (await state()).error.includes('Login SDK unavailable.'), 15000);
  assert.equal((await state()).layout, 'none');
  assert.equal((await state()).disabled, false);
  console.log('PASS: missing SDK and blocked CDN keep the dashboard locked and show the SDK path');
} finally {
  socket?.close();
  workspaceServer.closeAllConnections();
  workspaceServer.close();
  server.kill();
  browser.kill();
  try {
    await waitFor(() => exited, 5000);
    rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  } catch (error) {
    if (error.code !== 'EPERM' && error.code !== 'EBUSY') console.warn('Could not remove browser test profile:', error.message);
  }
}