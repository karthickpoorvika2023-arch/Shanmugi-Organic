/* Snapshot fixed storefront prices for the payment server. Regenerate after catalog edits. */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const context = { window: {}, localStorage: { getItem: () => null }, location: { pathname: '' }, document: { body: null }, console: { log() {} } };
vm.runInNewContext(readFileSync(join(root, 'frontend/assets/js/data.js'), 'utf8'), context);
const { products, coupons, shop } = context.window.SITE;
const catalog = {
  products: products.map(({ slug, name, cat, sizes, stock }) => ({ slug, name, cat, sizes, stock: !!stock })),
  coupons, shipping: {
    freeShipOver: shop.freeShipOver, shipFlatTN: shop.shipFlatTN, shipFlatIN: shop.shipFlatIN
  }
};
const path = join(root, 'backend/supabase/functions/ownpay-checkout/catalog.json');
writeFileSync(path, JSON.stringify(catalog, null, 2) + '\n');
console.log(`Payment server catalog generated: ${products.length} products`);