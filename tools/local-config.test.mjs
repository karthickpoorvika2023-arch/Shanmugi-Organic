import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'plugins/supabase/supabase-client.js'), 'utf8');
function initialize(origin, config) {
  const calls = [];
  const window = { location: { origin, href: origin + '/signup.html' },
    supabase: { createClient: (url, key) => { calls.push({ url, key }); return { auth: {} }; } } };
  if (config) window.__soSupabaseConfig = config;
  vm.runInNewContext(source, { window, console: { warn() {}, log() {} } });
  return { calls, client: window.SupabaseClient };
}
const local = { url: 'http://127.0.0.1:54321', publicKey: 'local-anon-test-key' };
assert.equal(initialize('http://localhost:4173').calls.length, 0, 'no localhost fallback to hosted');
assert.equal(initialize('http://127.0.0.1:4173', { url: 'https://bad.example', publicKey: local.publicKey }).calls.length, 0);
const active = initialize('http://localhost:4173', local);
assert.equal(active.calls[0].url, local.url);
assert.equal(active.calls[0].key, local.publicKey);
const hosted = initialize('https://store.example', local);
assert.equal(hosted.calls.length, 1);
assert.match(hosted.calls[0].url, /^https:\/\/[^/]+\.supabase\.co$/);
assert.notEqual(hosted.calls[0].key, local.publicKey);
assert.ok(hosted.client);
console.log('PASS: localhost Supabase config is local-only and fail-closed; hosted path is unchanged');