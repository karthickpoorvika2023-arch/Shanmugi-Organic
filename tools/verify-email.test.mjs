import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'frontend/verify-email.html'), 'utf8');
const script = html.match(/<script>\s*(\(function \(\) \{[\s\S]*?\}\)\(\);)\s*<\/script>/);
assert.ok(script, 'verification handler must be present');
assert.match(html, /href="\.\/" class="btn btn--primary">Go to Home/);

async function run(path, options = {}) {
  const nodes = Object.fromEntries(['loadingState', 'successState', 'errorState', 'alreadyVerifiedState', 'alertBox'].map(id => [id, {
    textContent: '',
    classList: {
      values: new Set(id === 'loadingState' ? [] : ['hidden']),
      add(name) { this.values.add(name); },
      remove(name) { this.values.delete(name); },
      contains(name) { return this.values.has(name); }
    }
  }]));
  const calls = [];
  const url = new URL(path, 'https://store.example/shop/');
  const location = {
    href: url.href, search: url.search, hash: url.hash,
    replace(target) { calls.push(['home', target]); }
  };
  const context = vm.createContext({
    URL, URLSearchParams, decodeURIComponent, console: { error() {} },
    window: {
      location,
      Supabase: {
        verifyEmailTokenHash: async (...args) => { calls.push(['verify', ...args]); return { error: options.error || null }; },
        isAuthenticated: async () => !!options.authenticated
      },
      SupabaseClient: { auth: { setSession: async data => { calls.push(['session', data]); return { error: options.error || null }; } } }
    },
    document: { getElementById(id) { return nodes[id]; } }
  });
  vm.runInContext(script[1], context);
  await new Promise(resolve => setImmediate(resolve));
  return { calls, nodes, location };
}

{
  const { calls } = await run('verify-email.html?token_hash=example&type=signup');
  assert.deepEqual(calls, [['verify', 'example', 'signup'], ['home', 'https://store.example/shop/']]);
}
{
  const { calls } = await run('verify-email.html#access_token=example&refresh_token=refresh&type=signup');
  assert.equal(calls[0][0], 'session');
  assert.deepEqual(calls[1], ['home', 'https://store.example/shop/']);
}
{
  const { calls, nodes } = await run('verify-email.html?token_hash=bad&type=signup', { error: { message: 'Expired token' } });
  assert.equal(calls.some(c => c[0] === 'home'), false);
  assert.equal(nodes.alertBox.textContent, 'Expired token');
}
{
  const { calls } = await run('verify-email.html#access_token=example&type=recovery');
  assert.equal(calls.some(c => c[0] === 'home'), false);
  assert.equal(calls.length, 0);
}
{
  const { calls } = await run('verify-email.html?error=access_denied&error_description=Expired');
  assert.equal(calls.length, 0);
}
console.log('PASS: confirmation link goes home only after verification; failures and recovery do not');