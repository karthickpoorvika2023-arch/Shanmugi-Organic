import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'frontend/assets/js/app.js'), 'utf8');
const pages = readFileSync(join(root, 'frontend/assets/js/pages.js'), 'utf8');
const css = readFileSync(join(root, 'frontend/assets/css/style.css'), 'utf8');
assert.match(pages, /A\.Wish\.clear\(\)/, 'clear wishlist must use the account-scoped API');
assert.doesNotMatch(css.match(/\.pcard__wish:hover\s*\{[^}]*\}/)[0], /var\(--red\)/, 'an unsaved heart must not turn red on hover');

const storage = new Map([['so_wish_v1', JSON.stringify(['groundnut-oil'])]]);
let currentUser = null;
let authEvent;
const hearts = ['groundnut-oil', 'sesame-oil'].map(slug => ({
  getAttribute: () => slug,
  classList: {
    classes: new Set(),
    toggle(name, on) { if (on) this.classes.add(name); else this.classes.delete(name); },
    contains(name) { return this.classes.has(name); }
  }
}));
const badge = { textContent: '', setAttribute(name, value) { this[name] = value; } };
const document = {
  readyState: 'complete',
  documentElement: { classList: { toggle() { } } },
  querySelector: () => null,
  querySelectorAll(selector) {
    if (selector === '[data-wish]') return hearts;
    if (selector === '[data-wish-count]') return [badge];
    return [];
  },
  getElementById: () => null,
  createElement: () => ({ classList: { add() { } }, appendChild() { }, remove() { } }),
  body: { appendChild() { } },
  addEventListener: () => { },
  dispatchEvent: () => { }
};
const window = {
  SITE: { byslug: slug => ['groundnut-oil', 'sesame-oil'].includes(slug) ? { slug, name: slug } : null },
  Supabase: {
    isAuthenticated: async () => !!currentUser,
    getCurrentUser: async () => currentUser
  },
  SupabaseClient: { auth: { onAuthStateChange(handler) { authEvent = handler; } } },
  location: { pathname: '/products.html', search: '', href: '' },
  addEventListener: () => { }
};
const context = vm.createContext({
  window, document, localStorage: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value)
  },
  CustomEvent: class { constructor(type) { this.type = type; } },
  setTimeout, console, encodeURIComponent
});
vm.runInContext(source, context);
const Wish = window.App.Wish;
const tick = () => new Promise(resolve => setTimeout(resolve, 10));
const selected = index => hearts[index].classList.contains('is-on');

window.App.init('products');
await tick();
assert.equal(typeof authEvent, 'function', 'auth state listener is installed');
assert.equal(Wish.all().length, 0, 'signed-out visitors cannot read the old shared list');
assert.equal(selected(0), false, 'the legacy shared heart is not red');
assert.equal(badge.textContent, 0);
assert.equal(await Wish.toggle('groundnut-oil'), false, 'guests must sign in');
assert.match(window.location.href, /^signin\.html\?redirect=/);
assert.equal(storage.has('so_wish_v2_null'), false);

currentUser = { id: 'user-a' };
authEvent('SIGNED_IN');
await tick();
assert.equal(Wish.all().length, 0, 'do not import the old shared wishlist');
assert.equal(await Wish.toggle('groundnut-oil'), true);
assert.equal(selected(0), true);
assert.equal(selected(1), false);
assert.equal(badge.textContent, 1);
assert.deepEqual(JSON.parse(storage.get('so_wish_v2_user-a')), ['groundnut-oil']);

currentUser = null;
authEvent('SIGNED_OUT');
assert.equal(selected(0), false, 'sign-out immediately clears the selected heart');
assert.equal(badge.textContent, 0);
await tick();
currentUser = { id: 'user-b' };
authEvent('SIGNED_IN');
await tick();
assert.equal(Wish.all().length, 0, 'another account does not inherit saved products');
assert.equal(selected(0), false);
await Wish.toggle('sesame-oil');
assert.equal(selected(0), false);
assert.equal(selected(1), true);
assert.deepEqual(JSON.parse(storage.get('so_wish_v2_user-b')), ['sesame-oil']);

Wish.clear();
assert.equal(selected(1), false);
assert.deepEqual(JSON.parse(storage.get('so_wish_v2_user-b')), []);
assert.deepEqual(JSON.parse(storage.get('so_wish_v2_user-a')), ['groundnut-oil']);
currentUser = { id: 'user-a' };
authEvent('SIGNED_IN');
await tick();
assert.equal(selected(0), true, 'original account recovers its own wishlist');
assert.equal(selected(1), false);
console.log('PASS: wishlist hearts are isolated per signed-in account on this browser');