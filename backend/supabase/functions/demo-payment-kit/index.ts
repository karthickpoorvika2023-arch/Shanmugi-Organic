import { createClient } from 'npm:@supabase/supabase-js@2';

const env = (key: string) => Deno.env.get(key) || '';
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (value: object, status = 200, origin = '') => new Response(JSON.stringify(value), { status, headers: { ...headers, ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}) } });
const safe = (v: unknown, limit: number) => typeof v === 'string' ? v.trim().slice(0, limit) : '';

Deno.serve(async req => {
  const origin = req.headers.get('origin') || '';
  // Production admin operations are allowed only from explicitly approved origins.
  // This is CORS hygiene, NOT the security boundary: auth + DB allowlist below are mandatory.
  const localOrigin = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const defaultOrigins = [
    'https://shanmugaorganics.netlify.app',
    'https://karthickpoorvika2023-arch.github.io',
  ];
  const extraOrigins = env('ADMIN_ALLOWED_ORIGINS').split(',').map(s => s.trim()).filter(Boolean);
  const allowedOrigin = !origin || localOrigin || [...defaultOrigins, ...extraOrigins].includes(origin);
  const url = new URL(req.url);
  const isAdminAction = /^\/admin-(check|payments|orders|customers|categories|category-upsert|category-delete|products|product-upsert|product-delete)$/.test(
    url.pathname.replace(/^.*\/demo-payment-kit/, '')
  );
  // Never expose demo checkout to hosted origins.
  if (!allowedOrigin || (!isAdminAction && !localOrigin))
    return reply({ error: 'Origin not allowed' }, 403);
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

    if (url.pathname.endsWith('/admin-check')) return reply({ admin: true, mode: 'demo' }, 200, cors);
    // ADMIN PRODUCTS: every request runs AFTER getUser() + ownpay_payment_admins check.
    if (url.pathname.endsWith('/admin-products')) {
      const { data, error } = await client.from('products')
        .select('id,slug,name,category_slug,price,unit,in_stock,image_url,description,mrp,admin_details')
        .order('name', { ascending: true }).limit(500);
      if (error) { console.error('[admin-products] list', error); return reply({ error: 'Could not load products (' + error.code + ')' }, 500, cors); }
      return reply({ products: data || [] }, 200, cors);
    }
    if (url.pathname.endsWith('/admin-product-upsert')) {
      const raw = await req.text();
      if (raw.length > 2600000) return reply({ error: 'Product images are too large. Use at most 5 compressed images.' }, 413, cors);
      let body: { product?: Record<string, unknown>; originalSlug?: string | null };
      try { body = JSON.parse(raw); } catch { return reply({ error: 'Invalid product JSON' }, 400, cors); }
      const p = body?.product;
      if (!p || typeof p !== 'object') return reply({ error: 'Missing product' }, 400, cors);
      const name = safe(p.name, 150);
      const slug = safe(p.slug, 90);
      const category_slug = safe(p.cat, 90);
      const unit = safe(p.unit, 60);
      if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
          !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category_slug) || !unit)
        return reply({ error: 'Product name, slug, category, and size are required' }, 400, cors);
      const price = Number(p.price);
      const mrp = Number(p.mrp ?? p.price);
      if (!Number.isFinite(price) || price <= 0 || price > 10000000 ||
          !Number.isFinite(mrp) || mrp < 0 || mrp > 10000000)
        return reply({ error: 'Invalid price or MRP' }, 400, cors);
      if (!Array.isArray(p.sizes) || !p.sizes.length || p.sizes.length > 20)
        return reply({ error: 'Provide 1 to 20 size variants' }, 400, cors);
      const sizes: [string, number, number][] = [];
      for (const s of p.sizes) {
        if (!Array.isArray(s) || s.length < 3) return reply({ error: 'Invalid size row' }, 400, cors);
        const label = safe(s[0], 60), cost = Number(s[1]), max = Number(s[2]);
        if (!label || !Number.isFinite(cost) || cost <= 0 || cost > 10000000 ||
            !Number.isFinite(max) || max < 0 || max > 10000000)
          return reply({ error: 'Invalid size price' }, 400, cors);
        sizes.push([label, cost, max]);
      }
      if (sizes[0][0] !== unit || sizes[0][1] !== price || sizes[0][2] !== mrp)
        return reply({ error: 'First size must match primary unit, price and MRP' }, 400, cors);
      const { data: category, error: categoryError } = await client.from('categories')
        .select('id').eq('slug', category_slug).maybeSingle();
      if (categoryError || !category) return reply({ error: 'Category not found in Supabase' }, 400, cors);
      const validImage = (value: unknown) => typeof value === 'string' &&
        value.length <= 420000 &&
        /^(?:data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+|https:\/\/[^\s]+|assets\/img\/[A-Za-z0-9_./-]+)$/.test(value);
      if (!Array.isArray(p.images) || p.images.length > 5 ||
          p.images.some(item => !validImage(item)) ||
          p.images.reduce((sum: number, item: string) => sum + item.length, 0) > 1900000)
        return reply({ error: 'Please use up to five compressed product images' }, 400, cors);
      const img = typeof p.img === 'string' ? p.img : '';
      if (img && !validImage(img)) return reply({ error: 'Invalid main product image' }, 400, cors);
      const hl = Array.isArray(p.highlights) ? p.highlights : [];
      if (hl.length > 10 || hl.some(item => typeof item !== 'string' || item.length > 200))
        return reply({ error: 'Invalid highlights' }, 400, cors);
      // Tamil text is optional, separately validated, and stored in admin_details JSONB.
      const hlTa = Array.isArray(p.highlights_ta) ? p.highlights_ta : [];
      if (hlTa.length > 10 || hlTa.some(item => typeof item !== 'string' || item.length > 200))
        return reply({ error: 'Invalid Tamil highlights' }, 400, cors);
      const rating = Number(p.rating);
      const details = {
        ta: safe(p.ta, 150), badge: safe(p.badge, 80),
        desc_ta: safe(p.desc_ta, 10000), highlights_ta: hlTa.map(item => item.trim()).filter(Boolean),
        images: p.images, img, sizes,
        highlights: hl, rating: Number.isFinite(rating) ? Math.max(1, Math.min(5, rating)) : 4.5,
        reviews: Math.max(0, Math.min(1000000, Number(p.reviews) || 0)),
        custom: p.custom === true
      };
      const payload = { name, slug, category_slug, price, mrp, unit,
        in_stock: p.stock !== false, image_url: img || null,
        description: safe(p.desc, 10000), admin_details: details };
      const columns = 'id,slug,name,category_slug,price,unit,in_stock,image_url,description,mrp,admin_details';
      const originalSlug = safe(body?.originalSlug, 90);
      if (originalSlug) {
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(originalSlug) || originalSlug !== slug)
          return reply({ error: 'Changing product slugs is not supported' }, 400, cors);
        const { data, error } = await client.from('products').update(payload)
          .eq('slug', originalSlug).select(columns).maybeSingle();
        if (error) { console.error('[admin-products] update', error); return reply({ error: 'Product update failed (' + error.code + ')' }, 500, cors); }
        if (!data) return reply({ error: 'Product not found; refresh the page' }, 404, cors);
        return reply({ product: data }, 200, cors);
      }
      const { data, error } = await client.from('products').insert(payload).select(columns).single();
      if (error) { console.error('[admin-products] insert', error);
        return reply({ error: error.code === '23505' ? 'Product slug already exists' : 'Product insert failed (' + error.code + ')' }, error.code === '23505' ? 409 : 500, cors); }
      return reply({ product: data }, 201, cors);
    }
    if (url.pathname.endsWith('/admin-product-delete')) {
      const raw = await req.text();
      if (raw.length > 1000) return reply({ error: 'Request too large' }, 413, cors);
      let body: { slug?: string };
      try { body = JSON.parse(raw); } catch { return reply({ error: 'Invalid JSON' }, 400, cors); }
      const slug = safe(body?.slug, 90);
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return reply({ error: 'Invalid product slug' }, 400, cors);
      // Foreign-key constraints protect sold products. Do not cascade-delete order history.
      const { data, error } = await client.from('products').delete().eq('slug', slug).select('id').maybeSingle();
      if (error) { console.error('[admin-products] delete', error);
        return reply({ error: error.code === '23503' ? 'Product has related records and cannot be deleted.' : 'Product delete failed (' + error.code + ')' }, error.code === '23503' ? 409 : 500, cors); }
      if (!data) return reply({ error: 'Product not found; refresh the page' }, 404, cors);
      return reply({ deleted: true, slug }, 200, cors);
    }

    // All category endpoints run after getUser() + ownpay_payment_admins verification.
    // No PUBLIC/anon/authenticated write grant is required on public.categories.
    if (url.pathname.endsWith('/admin-categories')) {
      const { data, error } = await client.from('categories')
        .select('id, name, name_tamil, slug, description, icon, image_url, order_index')
        .order('order_index', { ascending: true }).order('name', { ascending: true }).limit(500);
      if (error) { console.error('[admin-categories] list', error); return reply({ error: 'Could not load categories (' + error.code + ')' }, 500, cors); }
      return reply({ categories: data || [] }, 200, cors);
    }
    if (url.pathname.endsWith('/admin-category-upsert')) {
      const raw = await req.text();
      if (raw.length > 320000) return reply({ error: 'Category image is too large (max 200 KB compressed).' }, 413, cors);
      let body: { category?: Record<string, unknown>; originalSlug?: string | null };
      try { body = JSON.parse(raw); } catch { return reply({ error: 'Invalid JSON' }, 400, cors); }
      const incoming = body?.category;
      if (!incoming || typeof incoming !== 'object') return reply({ error: 'Category missing' }, 400, cors);
      const name = safe(incoming.name, 120);
      const slug = safe(incoming.slug, 90);
      const name_tamil = safe(incoming.ta, 150);
      const description = safe(incoming.blurb, 2000);
      const image_url = typeof incoming.img === 'string' ? incoming.img.trim() : '';
      if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
        return reply({ error: 'Invalid name or slug' }, 400, cors);
      if (image_url.length > 280000 ||
          (image_url && !/^(data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+|https:\/\/[^\s]+|assets\/img\/[A-Za-z0-9_./-]+)$/.test(image_url)))
        return reply({ error: 'Invalid or oversized category image' }, 400, cors);
      const payload = { name, name_tamil, description, image_url: image_url || null };
      const originalSlug = safe(body.originalSlug, 90);
      if (originalSlug) {
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(originalSlug) || slug !== originalSlug)
          return reply({ error: 'Changing existing category slugs is not supported' }, 400, cors);
        const { data, error } = await client.from('categories').update(payload)
          .eq('slug', originalSlug).select('id, name, name_tamil, slug, description, icon, image_url, order_index').maybeSingle();
        if (error) { console.error('[admin-categories] update', error); return reply({ error: 'Category update failed (' + error.code + ')' }, 500, cors); }
        if (!data) return reply({ error: 'Category not found. Reload and try again.' }, 404, cors);
        return reply({ category: data }, 200, cors);
      }
      const { data: last, error: orderError } = await client.from('categories')
        .select('order_index').order('order_index', { ascending: false }).limit(1);
      if (orderError) { console.error('[admin-categories] order', orderError); return reply({ error: 'Could not determine category order' }, 500, cors); }
      const order_index = (Number(last?.[0]?.order_index) || 0) + 1;
      const { data, error } = await client.from('categories')
        .insert({ ...payload, slug, order_index }).select('id, name, name_tamil, slug, description, icon, image_url, order_index').single();
      if (error) {
        console.error('[admin-categories] insert', error);
        return reply({ error: error.code === '23505' ? 'Category slug already exists' : 'Category insert failed (' + error.code + ')' }, error.code === '23505' ? 409 : 500, cors);
      }
      return reply({ category: data }, 201, cors);
    }
    if (url.pathname.endsWith('/admin-category-delete')) {
      const raw = await req.text();
      if (raw.length > 1000) return reply({ error: 'Request too large' }, 413, cors);
      let body: { slug?: string };
      try { body = JSON.parse(raw); } catch { return reply({ error: 'Invalid JSON' }, 400, cors); }
      const slug = safe(body?.slug, 90);
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return reply({ error: 'Invalid slug' }, 400, cors);
      // Protect categories used in real DB products (not only local browser catalog).
      const { count, error: referenceError } = await client.from('products')
        .select('id', { count: 'exact', head: true }).eq('category_slug', slug);
      if (referenceError) { console.error('[admin-categories] references', referenceError); return reply({ error: 'Could not verify product references' }, 500, cors); }
      if (count && count > 0) return reply({ error: 'This category has ' + count + ' products; move them before deleting.' }, 409, cors);
      const { data, error } = await client.from('categories').delete().eq('slug', slug).select('id').maybeSingle();
      if (error) { console.error('[admin-categories] delete', error); return reply({ error: 'Category delete failed (' + error.code + ')' }, 500, cors); }
      if (!data) return reply({ error: 'Category not found. Reload and try again.' }, 404, cors);
      return reply({ deleted: true, slug }, 200, cors);
    }
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
