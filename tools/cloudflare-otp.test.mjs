/* Cloudflare Worker OTP regression tests: all upstream calls are mocked. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from '../cloudflare-worker.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(root, 'wrangler.jsonc'), 'utf8'));
assert.equal(config.name, 'shanmuki-organics');
assert.equal(config.assets.directory, './dist');
assert.equal(config.assets.binding, 'ASSETS');
assert.ok(config.assets.run_worker_first.includes('/api/*'));

const html = readFileSync(join(root, 'frontend/signin.html'), 'utf8');
assert.match(html, /'\/api\/signin-otp\/start'/);
assert.match(html, /verify-otp\.html\?mode=signin/);
assert.ok(!/const \{ error \} = await window\.Supabase\.signIn\(email, password\)/.test(html),
  'Hosted sign-in must not silently bypass the OTP stage');

const site = 'https://store.example.test';
const credentials = { email: 'user@example.test', password: 'correct-password' };
const vars = {
  SUPABASE_URL: 'https://auth.example.test',
  SUPABASE_PUBLISHABLE_KEY: 'test-public-key',
  ASSETS: { async fetch() { return new Response('static page', { status: 200 }); } }
};
const realFetch = globalThis.fetch;
let upstreamCalls = [];
let passwordStatus = 200;
let otpStatus = 200;
globalThis.fetch = async (url, options) => {
  const name = new URL(url).pathname;
  const body = JSON.parse(options.body);
  upstreamCalls.push({ name, body, headers: options.headers });
  if (name === '/auth/v1/token') {
    return Response.json(passwordStatus === 200 ? { user: { id: 'id-123' }, access_token: 'PRIVATE-SESSION' } :
      { error: 'invalid' }, { status: passwordStatus });
  }
  if (name === '/auth/v1/otp') {
    return Response.json(otpStatus === 200 ? {} : { error: 'sending failed' }, { status: otpStatus });
  }
  throw new Error('Unexpected upstream request');
};

function startRequest({ method = 'POST', data = credentials, origin = site, path = '/api/signin-otp/start' } = {}) {
  return new Request(site + path, {
    method,
    ...(method === 'POST' ? {
      headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) },
      body: JSON.stringify(data)
    } : {})
  });
}

try {
  const success = await worker.fetch(startRequest(), vars);
  assert.equal(success.status, 200);
  const result = await success.json();
  assert.deepEqual(result, { sent: true });
  assert.equal(upstreamCalls.length, 2);
  assert.equal(upstreamCalls[0].name, '/auth/v1/token');
  assert.equal(upstreamCalls[1].name, '/auth/v1/otp');
  assert.equal(upstreamCalls[1].body.create_user, false);
  assert.equal(upstreamCalls[1].body.email, credentials.email);
  assert.equal(upstreamCalls[1].body.password, undefined);
  assert.equal(upstreamCalls[0].headers.apikey, vars.SUPABASE_PUBLISHABLE_KEY);
  assert.equal(JSON.stringify(result).includes('PRIVATE-SESSION'), false);

  upstreamCalls = [];
  passwordStatus = 401;
  const invalid = await worker.fetch(startRequest(), vars);
  assert.equal(invalid.status, 401);
  assert.equal(upstreamCalls.length, 1, 'Wrong password must never trigger a mail');
  passwordStatus = 200;

  upstreamCalls = [];
  otpStatus = 429;
  const throttled = await worker.fetch(startRequest(), vars);
  assert.equal(throttled.status, 429);
  assert.equal(upstreamCalls.length, 2);
  otpStatus = 200;

  upstreamCalls = [];
  const csrf = await worker.fetch(startRequest({ origin: 'https://evil.test' }), vars);
  assert.equal(csrf.status, 403);
  assert.equal(upstreamCalls.length, 0);

  assert.equal((await worker.fetch(startRequest({ method: 'GET' }), vars)).status, 405);
  assert.equal((await worker.fetch(startRequest({ data: { email: 'bad', password: 'ok' } }), vars)).status, 400);
  assert.equal((await worker.fetch(startRequest(), { ASSETS: vars.ASSETS })).status, 503);
  const staticFile = await worker.fetch(new Request(site + '/signin'), vars);
  assert.equal(await staticFile.text(), 'static page');
  assert.equal((await worker.fetch(new Request(site + '/api/not-found'), vars)).status, 404);
} finally {
  globalThis.fetch = realFetch;
}
console.log('PASS: Cloudflare sign-in OTP Worker validates credentials, enforces origin and preserves static pages');
