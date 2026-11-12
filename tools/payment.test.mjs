import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import { priceCart, checkPayment } from '../backend/supabase/functions/ownpay-checkout/logic.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(readFileSync(join(root, 'backend/supabase/functions/ownpay-checkout/catalog.json'), 'utf8'));
const item = { slug: 'groundnut-oil', size: '1 L', qty: 2 };
const quote = (coupon = '', ship = 'standard', state = 'Tamil Nadu') => priceCart(catalog, [item], coupon, ship, state);
assert.equal(quote().sub, 560);
assert.equal(quote().shipping, 60);
assert.equal(quote().total, 620);
assert.equal(quote('SHANMUGA10').total, 564);
assert.equal(quote('FREESHIP').total, 560);
assert.equal(quote('', 'express').total, 710);
assert.equal(quote('', 'pickup').total, 560);
assert.equal(quote('', 'standard', 'Kerala').total, 650);
assert.throws(() => priceCart(catalog, [{ ...item, price: 1 }, item], '', 'standard', 'Tamil Nadu'), /Duplicate/);
assert.throws(() => priceCart(catalog, [{ ...item, size: 'fake' }], '', 'standard', 'Tamil Nadu'), /unavailable/);
assert.throws(() => priceCart(catalog, [{ ...item, qty: 0 }], '', 'standard', 'Tamil Nadu'), /Invalid/);
assert.throws(() => quote('__proto__'), /Invalid coupon/);
const pending = { payment_id: 'pay-id', reference: 'SOABC', total: 620 };
const verified = { payment_id: 'pay-id', reference: 'SOABC', status: 'completed', amount: '620.00', currency: 'INR', trx_id: 'trx-1' };
assert.equal(checkPayment(verified, pending), true);
for (const change of [{ amount: '1.00' }, { currency: 'BDT' }, { status: 'created' }, { trx_id: '' }, { payment_id: 'different' }, { reference: 'different' }]) {
  assert.equal(checkPayment({ ...verified, ...change }, pending), false, JSON.stringify(change));
}
const pages = readFileSync(join(root, 'frontend/assets/js/pages.js'), 'utf8');
const edge = readFileSync(join(root, 'backend/supabase/functions/demo-payment-kit/index.ts'), 'utf8');
const sql = readFileSync(join(root, 'backend/schemas/demo-payment-kit.sql'), 'utf8');
const admin = readFileSync(join(root, 'frontend/assets/js/admin.js'), 'utf8');
const adminHtml = readFileSync(join(root, 'frontend/admin.html'), 'utf8');
assert.doesNotMatch(pages, /pushOrderToSupabase|ownpayRequest\(|so_pending_ownpay_v1|A\.Orders\.create\(/);
assert.match(pages, /result\.status !== 'demo'/);
assert.match(pages, /No money is charged/);
assert.match(pages, /Demo records are stored separately/);
assert.match(pages, /Save demo checkout \(no payment\)/);
assert.match(pages, /addr\.phone !== '0000000000'/);
assert.match(edge, /demoEmail\.endsWith\('@example\.com'\)/);
assert.match(pages, /data-payment-error/);
const requestStart = pages.indexOf('  async function demoRequest(');
const requestEnd = pages.indexOf('  /* ========================================================= checkout', requestStart);
assert.ok(requestStart >= 0 && requestEnd > requestStart, 'demo request code found');
const requestSource = pages.slice(requestStart, requestEnd) + '\n demoRequest;';
const requestContext = (fetch) => ({
  window: { __soSupabaseConfig: { url: 'http://127.0.0.1:54321', publicKey: 'local-public-key-test' }, __soEnsureSupabase: async () => {}, SupabaseClient: { auth: { getSession: async () => ({ data: { session: { access_token: 'test-token' } } }) } } },
  location: { origin: 'http://localhost:3000' }, fetch, Error, TypeError
});
const requestWith = fetch => vm.runInNewContext(requestSource, requestContext(fetch));
const publicContext = requestContext(async () => { throw new Error('must not contact backend'); });
publicContext.location.origin = 'https://store.example';
await assert.rejects(vm.runInNewContext(requestSource, publicContext)('create', {}), /only on localhost/);
await assert.rejects(requestWith(async () => { throw new TypeError('Failed to fetch'); })('create', {}), /Cannot reach the demo backend/);
await assert.rejects(requestWith(async () => ({ status: 404, ok: false, json: async () => { throw new Error('Not JSON'); } }))('create', {}), /Demo backend unavailable/);
await assert.rejects(requestWith(async () => ({ status: 503, ok: false, json: async () => ({ error: 'Unavailable' }) }))('create', {}), /Unavailable/);
let target = '';
const create = requestWith(async (url, options) => {
  target = url;
  assert.equal(options.method, 'POST');
  assert.equal(options.headers.Authorization, 'Bearer test-token');
  return { status: 200, ok: true, json: async () => ({ status: 'demo', reference: 'DEMO-TEST' }) };
});
assert.equal((await create('create', {})).reference, 'DEMO-TEST');
assert.match(target, /\/functions\/v1\/demo-payment-kit\/create$/);
assert.equal(new URL(target).origin, 'http://127.0.0.1:54321', 'demo checkout must never use hosted backend');
const missingConfig = requestContext(async () => { throw new Error('must not fetch'); });
delete missingConfig.window.__soSupabaseConfig;
await assert.rejects(vm.runInNewContext(requestSource, missingConfig)('create', {}), /Local Supabase is not configured/);
assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.demo_payment_attempts/);
assert.match(sql, /CHECK \(status = 'demo'\)/);
assert.match(sql, /REVOKE ALL ON public\.demo_payment_attempts FROM PUBLIC, anon, authenticated/);
assert.match(sql, /REVOKE INSERT, UPDATE, DELETE ON public\.products FROM PUBLIC, anon, authenticated/);
assert.match(sql, /REVOKE INSERT, UPDATE, DELETE ON public\.categories FROM PUBLIC, anon, authenticated/);
for (const policy of ['products_insert_auth', 'products_update_auth', 'products_delete_auth'])
  assert.ok(sql.includes(`DROP POLICY IF EXISTS "${policy}" ON public.products`));
assert.match(sql, /REVOKE ALL ON public\.orders, public\.order_items FROM PUBLIC, anon, authenticated/);
assert.match(sql, /DROP POLICY IF EXISTS "Orders are viewable by everyone"/);
assert.match(sql, /DROP POLICY IF EXISTS "Profiles are viewable by everyone"/);
assert.match(sql, /REVOKE ALL ON FUNCTION public\.bootstrap_user_profiles\(\) FROM PUBLIC, anon, authenticated/);
assert.match(sql, /REVOKE ALL ON FUNCTION public\.create_user_profile\(\) FROM PUBLIC, anon, authenticated/);
assert.match(adminHtml, /data-page="payments"/);
assert.match(admin, /payments: renderPayments/);
assert.match(admin, /Payment Gateway — DEMO/);
assert.match(admin, /demoAdminRequest\('admin-check'\)/);
assert.match(admin, /demoAdminRequest\('admin-orders'\)/);
assert.match(admin, /demoAdminRequest\('admin-customers'\)/);
assert.doesNotMatch(admin, /\.from\('orders'\)|\.from\('user_profiles'\)/);
assert.doesNotMatch(admin, /RLS_FIX_SQL|Copy Fix SQL|One-time Supabase permission fix/);
assert.match(admin, /id="syncSupabaseBtn" disabled/);
assert.match(admin, /id="syncCatsBtn" disabled/);
assert.doesNotMatch(admin, /\.from\('products'\)|\.from\('categories'\)/);
assert.match(admin, /Product saved locally only/);
assert.match(admin, /Catalog editor changes are local to this browser only/);
assert.match(edge, /auth\.getUser\(token\.slice\(7\)\)/);
assert.match(edge, /client\.from\('ownpay_payment_admins'\)/);
assert.ok(edge.indexOf("client.from('ownpay_payment_admins')") < edge.indexOf("client.from('demo_payment_attempts')"), 'Admin permission must be checked before reading the demo ledger');
assert.match(edge, /client\.from\('demo_payment_attempts'\)\.insert/);
assert.doesNotMatch(edge, /client\.from\('orders'\)\.insert|client\.from\('ownpay_checkouts'\)|payment_id|trx_id/);
assert.match(admin, /escHtml\(customer\.name/);

// Exercise the Edge handler without network access or real customer records.
let handler;
let approved = true;
const writes = [];
const attempts = [];
const mockClient = {
  auth: { getUser: async token => token === 'test-token'
    ? { data: { user: { id: 'mock-admin' } }, error: null }
    : { data: { user: null }, error: new Error('Invalid token') } },
  from(table) {
    const query = {
      select() { return this; },
      eq() { return this; },
      in() { return Promise.resolve({ data: [{ slug: 'groundnut-oil', name: 'Groundnut oil', unit: '1 L', price: 280, in_stock: true }], error: null }); },
      maybeSingle() { return Promise.resolve({ data: approved ? { user_id: 'mock-admin' } : null, error: null }); },
      order() { return this; },
      limit() { return Promise.resolve({ data: [], error: null }); },
      range() { return Promise.resolve({ data: attempts, count: attempts.length, error: null }); },
      insert(row) { writes.push({ table, row }); attempts.push(row); return Promise.resolve({ error: null }); }
    };
    return query;
  }
};
vm.runInNewContext(stripTypeScriptTypes(edge).replace(/^import .*;\s*/m, ''), {
  createClient: () => mockClient,
  Deno: { env: { get: key => key === 'SUPABASE_URL' ? 'https://example.supabase.co' : 'mock-service-key' }, serve: fn => { handler = fn; } },
  Response, URL, crypto, console, Set, Number, JSON
});
const edgeRequest = (action, payload = {}, origin = 'http://localhost:3000', token = 'test-token') => handler(new Request('https://example.supabase.co/functions/v1/demo-payment-kit/' + action, {
  method: 'POST', headers: { origin, authorization: 'Bearer ' + token }, body: JSON.stringify(payload)
}));
const validDemo = { address: { name: 'Sample', email: 'sample@example.com', phone: '0000000000', state: 'Tamil Nadu' },
  ship: 'standard', items: [{ slug: 'groundnut-oil', size: '1 L', qty: 2 }] };
assert.equal((await edgeRequest('create', validDemo, 'https://other.example')).status, 403);
assert.equal((await edgeRequest('create', validDemo, '')).status, 403, 'server-to-server calls without a local browser origin must be rejected');
assert.equal((await edgeRequest('create', validDemo, 'http://localhost:3000', 'invalid-token')).status, 401);
assert.equal((await handler(new Request('https://example.supabase.co/functions/v1/demo-payment-kit/create', {
  method: 'POST', headers: { origin: 'http://localhost:3000' }, body: JSON.stringify(validDemo)
}))).status, 401);
approved = false;
assert.equal((await edgeRequest('create', validDemo)).status, 403);
assert.equal((await edgeRequest('admin-payments')).status, 403);
assert.equal(writes.length, 0);
approved = true;
assert.equal((await edgeRequest('admin-check')).status, 200);
assert.equal((await edgeRequest('create', { ...validDemo, address: { ...validDemo.address, email: 'real@personal.test' } })).status, 400);
assert.equal((await edgeRequest('create', { ...validDemo, items: [{ ...validDemo.items[0], qty: 0 }] })).status, 400);
assert.equal((await edgeRequest('create', { ...validDemo, items: [validDemo.items[0], validDemo.items[0]] })).status, 400);
assert.equal((await edgeRequest('create', { ...validDemo, items: [{ ...validDemo.items[0], price: 1 }] })).status, 200, 'server must ignore forged client-side prices');
assert.equal(writes.length, 1);
assert.equal(writes[0].table, 'demo_payment_attempts');
assert.equal(writes[0].row.total, 620, 'server computes subtotal and shipping from catalog');
assert.equal(writes[0].row.snapshot.address.addr, undefined, 'demo must not store a street address');
const ledger = await (await edgeRequest('admin-payments')).json();
assert.equal(ledger.total, 1);
assert.equal(ledger.payments[0].status, 'demo');
assert.equal(ledger.payments[0].amount, 620);
assert.equal((await edgeRequest('admin-orders')).status, 200);
assert.equal((await edgeRequest('admin-customers')).status, 200);
assert.equal(writes.length, 1, 'admin reads must not write to tables');
assert.equal((await edgeRequest('unknown')).status, 404);
console.log('PASS: legacy payment reconciliation logic and demo checkout isolation, admin authorization, RLS structure');