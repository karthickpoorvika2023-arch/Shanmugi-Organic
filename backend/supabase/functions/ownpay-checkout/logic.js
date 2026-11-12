// Runtime-neutral validation shared by the Edge Function and Node tests.
export function priceCart(catalog, items, coupon, ship, state) {
  if (!Array.isArray(items) || !items.length || items.length > 50 || !['standard', 'express', 'pickup'].includes(ship)) throw new Error('Invalid cart or delivery option');
  const seen = new Set();
  const lines = items.map(item => {
    if (!item || typeof item.slug !== 'string' || typeof item.size !== 'string' || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 99) throw new Error('Invalid cart item');
    const key = JSON.stringify([item.slug, item.size]);
    if (seen.has(key)) throw new Error('Duplicate cart item');
    seen.add(key);
    const product = catalog.products.find(p => p.slug === item.slug && p.stock);
    const size = product?.sizes.find(s => s[0] === item.size);
    if (!size || !Number.isSafeInteger(size[1]) || size[1] <= 0) throw new Error('Product unavailable');
    return { slug: item.slug, name: product.name, cat: product.cat, size: item.size, price: size[1], qty: item.qty, total: size[1] * item.qty };
  });
  const sub = lines.reduce((n, l) => n + l.total, 0);
  if (!Number.isSafeInteger(sub) || sub > 10000000) throw new Error('Order too large');
  if (coupon && (!/^[A-Z0-9]{1,32}$/.test(coupon) || !Object.hasOwn(catalog.coupons, coupon))) throw new Error('Invalid coupon');
  const c = coupon ? catalog.coupons[coupon] : null;
  let discount = 0, freeShip = false;
  if (c && sub >= c.min) {
    if (c.type === 'pct') {
      const base = c.cat ? lines.filter(l => l.cat === c.cat).reduce((n, l) => n + l.total, 0) : sub;
      discount = Math.round(base * c.value / 100);
    } else if (c.type === 'flat') discount = Math.min(c.value, sub);
    else if (c.type === 'ship') freeShip = true;
  }
  const after = sub - discount;
  const basicShip = !freeShip && after < catalog.shipping.freeShipOver
    ? (state === 'Tamil Nadu' ? catalog.shipping.shipFlatTN : catalog.shipping.shipFlatIN) : 0;
  const shipping = ship === 'pickup' ? 0 : basicShip + (ship === 'express' ? 90 : 0);
  const total = Math.max(0, after + shipping);
  if (!Number.isSafeInteger(total) || total <= 0) throw new Error('Invalid order total');
  return { lines, sub, discount, shipping, total, coupon: c && sub >= c.min ? coupon : '' };
}

export function checkPayment(data, pending) {
  return !!data && data.status === 'completed' && data.currency === 'INR' &&
    typeof data.amount === 'string' && /^\d+\.\d{2}$/.test(data.amount) &&
    data.amount === Number(pending.total).toFixed(2) &&
    typeof data.trx_id === 'string' && data.trx_id.length > 0 && data.trx_id.length < 150 &&
    (!data.payment_id || data.payment_id === pending.payment_id) &&
    (!data.reference || data.reference === pending.reference);
}