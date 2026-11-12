import { createClient } from 'npm:@supabase/supabase-js@2';
import catalog from './catalog.json' with { type: 'json' };
import { checkPayment, priceCart } from './logic.js';

const env = (name: string) => Deno.env.get(name) || '';
const db = () => createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: object, status = 200, origin = '') => new Response(JSON.stringify(body), { status, headers: { ...headers, ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}) } });

function configuration() {
  const url = new URL(env('OWNPAY_BASE_URL'));
  const site = new URL(env('STORE_ORIGIN'));
  if (url.protocol !== 'https:' || site.protocol !== 'https:' || !env('OWNPAY_API_KEY') || !env('OWNPAY_WEBHOOK_SECRET') || !env('SUPABASE_SERVICE_ROLE_KEY')) throw new Error('Payment is not configured');
  return { url, site };
}

async function ownpay(base: URL, path: string, payload?: object) {
  const res = await fetch(new URL('/api/v1/payments' + path, base), {
    method: payload ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + env('OWNPAY_API_KEY'), 'Content-Type': 'application/json' },
    ...(payload ? { body: JSON.stringify(payload) } : {}), signal: AbortSignal.timeout(12000)
  });
  const body = await res.json();
  if (!res.ok || body.success !== true || !body.data) throw new Error('OwnPay rejected the payment request');
  return body.data;
}

async function verifySignature(raw: string, signature: string, timestamp: string) {
  if (!/^\d{10}$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300 || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env('OWNPAY_WEBHOOK_SECRET')), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const bytes = Uint8Array.from(signature.match(/.{2}/g)!, pair => parseInt(pair, 16));
  return crypto.subtle.verify('HMAC', key, bytes, new TextEncoder().encode(raw));
}

async function reconcile(client: ReturnType<typeof db>, pending: any, base: URL) {
  if (pending.status === 'paid') return { status: 'paid', orderNumber: pending.reference };
  if (!pending.payment_id) return { status: 'pending' };
  const verified = await ownpay(base, '/' + encodeURIComponent(pending.payment_id));
  if (verified.status !== 'completed') return { status: verified.status === 'failed' || verified.status === 'cancelled' ? verified.status : 'pending' };
  if (!checkPayment(verified, pending)) throw new Error('Payment details did not match this order');
  const { data, error } = await client.rpc('finalize_ownpay_checkout', { p_checkout_id: pending.id, p_payment_id: pending.payment_id, p_trx_id: verified.trx_id });
  if (error || !data) throw new Error('Could not safely record the paid order');
  return { status: 'paid', orderNumber: data };
}

Deno.serve(async req => {
  const origin = req.headers.get('origin') || '';
  // Check the storefront origin separately: missing gateway secrets must not hide
  // a useful JSON 503 behind the browser's CORS "Failed to fetch" error.
  let site: URL;
  try { site = new URL(env('STORE_ORIGIN')); } catch { return json({ error: 'Payment is not configured' }, 503); }
  const corsOrigin = origin === site.origin ? origin : '';
  if (origin && !corsOrigin) return json({ error: 'Origin not allowed' }, 403);
  if (req.method === 'OPTIONS') return json({}, 200, corsOrigin);
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, corsOrigin);
  const url = new URL(req.url);
  const client = db();
  try {
    // The admin ledger does not depend on the merchant gateway being online.
    // This privileged query runs only after verifying the caller's JWT and
    // checking a server-owned allowlist; the service key never reaches the UI.
    if (url.pathname.endsWith('/admin-payments')) {
      const bearer = req.headers.get('authorization') || '';
      if (!bearer.startsWith('Bearer ')) return json({ error: 'Sign in required' }, 401, corsOrigin);
      const { data: auth, error: authError } = await client.auth.getUser(bearer.slice(7));
      if (authError || !auth.user) return json({ error: 'Sign in required' }, 401, corsOrigin);
      const { data: admin, error: adminError } = await client.from('ownpay_payment_admins').select('user_id').eq('user_id', auth.user.id).maybeSingle();
      if (adminError) throw new Error('Admin permission check unavailable');
      if (!admin) return json({ error: 'Payment reports require an approved admin account' }, 403, corsOrigin);
      const raw = await req.text();
      if (raw.length > 1000) return json({ error: 'Request too large' }, 413, corsOrigin);
      const body = raw ? JSON.parse(raw) : {};
      if (!body || !Number.isInteger(body.page) || body.page < 0 || body.page > 10000) return json({ error: 'Invalid page' }, 400, corsOrigin);
      const pageSize = 50;
      const { data, count, error } = await client.from('ownpay_checkouts')
        .select('id, user_id, reference, payment_id, trx_id, total, currency, status, snapshot, created_at, paid_at', { count: 'exact' })
        .order('created_at', { ascending: false }).order('id', { ascending: false })
        .range(body.page * pageSize, (body.page + 1) * pageSize - 1);
      if (error) throw new Error('Payment report unavailable');
      return json({ total: count || 0, payments: (data || []).map(p => ({
        id: p.id, userId: p.user_id, reference: p.reference, paymentId: p.payment_id,
        transactionId: p.trx_id, amount: p.total, currency: p.currency,
        status: p.status, createdAt: p.created_at, paidAt: p.paid_at,
        customer: { name: p.snapshot?.address?.name || '', email: p.snapshot?.address?.email || '', phone: p.snapshot?.address?.phone || '' },
        items: p.snapshot?.lines || []
      })) }, 200, corsOrigin);
    }
    let config: ReturnType<typeof configuration>;
    try { config = configuration(); } catch { return json({ error: 'Payment is not configured' }, 503, corsOrigin); }
    if (url.pathname.endsWith('/webhook')) {
      const raw = await req.text();
      if (raw.length > 10000 || !await verifySignature(raw, req.headers.get('X-OwnPay-Signature') || '', req.headers.get('X-OwnPay-Timestamp') || '')) return json({ error: 'Invalid webhook' }, 401, corsOrigin);
      const event = JSON.parse(raw);
      if (event.event !== 'payment.completed' || typeof event.data?.payment_id !== 'string') return json({ received: true }, 200, corsOrigin);
      const { data: pending, error } = await client.from('ownpay_checkouts').select('*').eq('payment_id', event.data.payment_id).maybeSingle();
      if (error || !pending) return json({ error: 'Payment not found' }, 404, corsOrigin);
      await reconcile(client, pending, config.url); // Never trust webhook claims without provider GET.
      return json({ received: true }, 200, corsOrigin);
    }
    const bearer = req.headers.get('authorization') || '';
    if (!bearer.startsWith('Bearer ')) return json({ error: 'Sign in required' }, 401, corsOrigin);
    const { data: auth, error: authError } = await client.auth.getUser(bearer.slice(7));
    if (authError || !auth.user) return json({ error: 'Sign in required' }, 401, corsOrigin);
    const rawBody = await req.text();
    if (rawBody.length > 20000) return json({ error: 'Request too large' }, 413, corsOrigin);
    const body = JSON.parse(rawBody);
    if (url.pathname.endsWith('/create')) {
      const { address: a, items, coupon = '', ship } = body;
      if (typeof coupon !== 'string' || typeof ship !== 'string') return json({ error: 'Invalid cart' }, 400, corsOrigin);
      if (!a || typeof a.name !== 'string' || !a.name.trim() || a.name.length > 150 || typeof a.phone !== 'string' || !/^(\+?91)?[6-9]\d{9}$/.test(a.phone) || typeof a.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email) || a.email.length > 200 ||
        typeof a.addr !== 'string' || !a.addr.trim() || a.addr.length > 500 || typeof a.city !== 'string' || !a.city.trim() || a.city.length > 100 || typeof a.state !== 'string' || !a.state.trim() || a.state.length > 100 || typeof a.pin !== 'string' || !/^\d{6}$/.test(a.pin)) return json({ error: 'Invalid delivery address' }, 400, corsOrigin);
      const quote = priceCart(catalog, items, coupon, ship, a.state);
      const reference = 'SO' + crypto.randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase();
      const { data: pending, error } = await client.from('ownpay_checkouts').insert({ user_id: auth.user.id, reference, total: quote.total, currency: 'INR', snapshot: { ...quote, ship, address: a } }).select('id').single();
      if (error || !pending) throw new Error('Could not start checkout');
      const callback = new URL('/functions/v1/ownpay-checkout/webhook', req.url).href;
      const redirect = new URL('/checkout.html', config.site);
      redirect.searchParams.set('payment_return', pending.id);
      const cancel = new URL(redirect);
      cancel.searchParams.set('cancelled', '1');
      const payment = await ownpay(config.url, '', { amount: quote.total.toFixed(2), currency: 'INR', reference, callback_url: callback, redirect_url: redirect.href, cancel_url: cancel.href, customer_name: a.name, customer_email: a.email, customer_phone: a.phone });
      if (typeof payment.payment_id !== 'string' || typeof payment.checkout_url !== 'string' || !payment.payment_id) throw new Error('Invalid gateway response');
      const checkout = new URL(payment.checkout_url);
      if (checkout.protocol !== 'https:' || checkout.origin !== config.url.origin) throw new Error('Unexpected OwnPay checkout domain');
      const saved = await client.from('ownpay_checkouts').update({ payment_id: payment.payment_id }).eq('id', pending.id).is('payment_id', null).select('id').single();
      if (saved.error || !saved.data) throw new Error('Could not save payment reference');
      return json({ checkoutUrl: checkout.href, checkoutId: pending.id }, 200, corsOrigin);
    }
    if (url.pathname.endsWith('/status')) {
      if (typeof body.checkoutId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.checkoutId)) return json({ error: 'Invalid checkout' }, 400, corsOrigin);
      const { data: pending, error } = await client.from('ownpay_checkouts').select('*').eq('id', body.checkoutId).eq('user_id', auth.user.id).maybeSingle();
      if (error || !pending) return json({ error: 'Checkout not found' }, 404, corsOrigin);
      return json(await reconcile(client, pending, config.url), 200, corsOrigin);
    }
    return json({ error: 'Not found' }, 404, corsOrigin);
  } catch (err) {
    console.error('[ownpay-checkout]', err);
    return json({ error: 'Payment unavailable or not verified. Your cart has not been cleared.' }, 503, corsOrigin);
  }
});