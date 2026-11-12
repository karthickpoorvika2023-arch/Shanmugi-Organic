import { createClient } from 'npm:@supabase/supabase-js@2';

const env = (key: string) => Deno.env.get(key) || '';
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (value: object, status = 200, origin = '') => new Response(JSON.stringify(value), { status, headers: { ...headers, ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}) } });
const safe = (v: unknown, limit: number) => typeof v === 'string' ? v.trim().slice(0, limit) : '';

Deno.serve(async req => {
  const origin = req.headers.get('origin') || '';
  // Development is intentionally loopback-only. Never allow arbitrary websites.
  const allowed = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  if (!allowed) return reply({ error: 'Demo checkout is available only on localhost' }, 403);
  if (req.method === 'OPTIONS') return reply({}, 200, origin);
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405, origin);
  const cors = origin;
  try {
    if (!env('SUPABASE_URL') || !env('SUPABASE_SERVICE_ROLE_KEY')) return reply({ error: 'Demo backend not configured' }, 503, cors);
    const token = req.headers.get('authorization') || '';
    if (!token.startsWith('Bearer ')) return reply({ error: 'Sign in as an approved admin' }, 401, cors);
    const client = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
    const { data: auth, error: authError } = await client.auth.getUser(token.slice(7));
    if (authError || !auth.user) return reply({ error: 'Sign in as an approved admin' }, 401, cors);
    const { data: admin, error: adminError } = await client.from('ownpay_payment_admins').select('user_id').eq('user_id', auth.user.id).maybeSingle();
    if (adminError) throw adminError;
    if (!admin) return reply({ error: 'Approved admin access required' }, 403, cors);

    const url = new URL(req.url);
    if (url.pathname.endsWith('/admin-check')) return reply({ admin: true, mode: 'demo' }, 200, cors);
    if (url.pathname.endsWith('/admin-payments')) {
      const body = await req.text();
      if (body.length > 2000) return reply({ error: 'Request too large' }, 413, cors);
      const page = JSON.parse(body || '{}').page ?? 0;
      if (!Number.isInteger(page) || page < 0 || page > 10000) return reply({ error: 'Invalid page' }, 400, cors);
      const { data, error, count } = await client.from('demo_payment_attempts')
        .select('reference, total, currency, status, snapshot, created_at', { count: 'exact' })
        .order('created_at', { ascending: false }).range(page * 50, page * 50 + 49);
      if (error) throw error;
      return reply({ total: count || 0, payments: (data || []).map(r => ({ reference: r.reference, amount: r.total, currency: r.currency,
        status: 'demo', createdAt: r.created_at, customer: r.snapshot.address, items: r.snapshot.lines })) }, 200, cors);
    }
    if (url.pathname.endsWith('/admin-orders')) {
      const { data, error } = await client.from('orders').select('id, order_number, customer_name, customer_email, customer_phone, user_id, created_at, total, status, payment_method, payment_status, shipping_address, shipping_city, shipping_state, shipping_pincode, order_items(product_name, quantity, price, subtotal)')
        .order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return reply({ orders: data || [] }, 200, cors);
    }
    if (url.pathname.endsWith('/admin-customers')) {
      const { data, error } = await client.from('user_profiles').select('id, full_name, email, phone, default_shipping_address, default_shipping_city, default_shipping_state, default_shipping_pincode, created_at').order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return reply({ customers: data || [] }, 200, cors);
    }
    if (url.pathname.endsWith('/create')) {
      const raw = await req.text();
      if (raw.length > 12000) return reply({ error: 'Request too large' }, 413, cors);
      const input = JSON.parse(raw);
      if (!input || typeof input !== 'object') return reply({ error: 'Invalid demo request' }, 400, cors);
      const address = input.address;
      // Never store real contact details by mistake: require reserved examples.
      // 0000000000 is intentionally unreachable by phone/SMS.
      const demoEmail = safe(address?.email, 200).toLowerCase();
      const demoPhone = safe(address?.phone, 20);
      if (!address || !safe(address.name, 150) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safe(address.email, 200)) ||
        !demoEmail.endsWith('@example.com') || demoPhone !== '0000000000' ||
        !safe(address.state, 100))
        return reply({ error: 'Use an @example.com email and 0000000000 for demo testing only' }, 400, cors);
      if (!['standard', 'express', 'pickup'].includes(input.ship) || !Array.isArray(input.items) || input.items.length < 1 || input.items.length > 50)
        return reply({ error: 'Invalid demo cart' }, 400, cors);
      if (input.coupon) return reply({ error: 'Discounts are not supported in the demo' }, 400, cors);
      const slugs = input.items.map((i: any) => i?.slug);
      if (slugs.some((s: unknown) => typeof s !== 'string' || !/^[a-z0-9-]{1,90}$/.test(s))) return reply({ error: 'Invalid item' }, 400, cors);
      const { data: products, error: productError } = await client.from('products').select('slug,name,price,unit,in_stock').in('slug', slugs);
      if (productError) throw productError;
      const lines = input.items.map((i: any) => {
        const product = (products || []).find(p => p.slug === i.slug && p.in_stock);
        const price = Number(product?.price);
        if (!product || i.size !== product.unit || !Number.isInteger(i.qty) || i.qty < 1 || i.qty > 99 ||
          !Number.isSafeInteger(price) || price <= 0) return null;
        return { slug: product.slug, name: product.name, size: product.unit, price, qty: i.qty, total: price * i.qty };
      });
      if (lines.some((line: unknown) => !line)) return reply({ error: 'Product or size unavailable for demo' }, 400, cors);
      if (new Set(slugs).size !== slugs.length) return reply({ error: 'Duplicate demo item' }, 400, cors);
      const sub = lines.reduce((sum: number, item: any) => sum + item.total, 0);
      const shipping = input.ship === 'pickup' ? 0 : (sub < 999 ? (address.state === 'Tamil Nadu' ? 60 : 90) : 0) + (input.ship === 'express' ? 90 : 0);
      const total = sub + shipping;
      if (!Number.isSafeInteger(total) || total <= 0 || total > 10000000) return reply({ error: 'Invalid demo total' }, 400, cors);
      const reference = 'DEMO-' + crypto.randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase();
      const { error } = await client.from('demo_payment_attempts').insert({ user_id: auth.user.id, reference, total,
        snapshot: { address: { name: safe(address.name, 150), email: safe(address.email, 200), phone: safe(address.phone, 20) },
          lines, ship: input.ship, sub, shipping } });
      if (error) throw error;
      return reply({ status: 'demo', reference, total, message: 'Demo saved. No payment was collected and no real order was created.' }, 200, cors);
    }
    return reply({ error: 'Not found' }, 404, cors);
  } catch (error) {
    console.error('[demo-payment-kit]', error);
    return reply({ error: 'Demo backend unavailable; nothing has been confirmed. Try again later.' }, 503, cors);
  }
});