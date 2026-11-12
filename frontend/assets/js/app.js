/* ==========================================================================
   app.js — shared engine: shell, cart, wishlist, search, carousels, overlays.
   Depends on data.js (window.SITE). Exposes window.App.
   ========================================================================== */
(function () {
  'use strict';

  /* Lazy-load Supabase library + client on demand, so any page using app.js
     has window.Supabase available without per-page script tags. */
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('Failed to load ' + src)); };
      document.head.appendChild(s);
    });
  }
  function ensureSupabase() {
    if (window.Supabase) return Promise.resolve();
    if (window.__soSupabaseLoading) return window.__soSupabaseLoading;
    window.__soSupabaseLoading = (function () {
      var lib = window.supabase ? Promise.resolve() : loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
      return lib
        .then(function () { return loadScript('plugins/supabase/supabase-client.js'); })
        .then(function () { return new Promise(function (r) { setTimeout(r, 0); }); });
    })();
    return window.__soSupabaseLoading;
  }
  window.__soEnsureSupabase = ensureSupabase;

  const SITE = window.SITE;
  const $ = function (s, r) { return (r || document).querySelector(s); };
  const $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  const esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  const money = function (n) { return '₹' + Number(n).toLocaleString('en-IN'); };
  const clamp = function (n, a, b) { return Math.max(a, Math.min(b, n)); };

  /* --------------------------------------------------------------- icons --- */
  const S = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
  const F = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">';
  const ICONS = {
    search: S + '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    pin: S + '<path d="M12 22s7-6.1 7-11a7 7 0 10-14 0c0 4.9 7 11 7 11z"/><circle cx="12" cy="11" r="2.6"/></svg>',
    heart: S + '<path d="M12 20.5l-1.4-1.3C5.6 14.9 3 12.5 3 9.4A5.2 5.2 0 0112 6.6a5.2 5.2 0 019 2.8c0 3.1-2.6 5.5-7.6 9.8z"/></svg>',
    cart: S + '<circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/><path d="M2.5 3h2.6l2.4 11.2h11L21 7H7"/></svg>',
    truck: S + '<path d="M2 6h11v10H2z"/><path d="M13 9h4.5l3.5 3.5V16H13z"/><circle cx="6.5" cy="18.5" r="1.7"/><circle cx="17" cy="18.5" r="1.7"/></svg>',
    leaf: S + '<path d="M4 20c0-8 5-13 16-14 1 11-4 16-12 16H4z"/><path d="M4 20c3-5 7-8 12-9.5"/></svg>',
    sprout: S + '<path d="M12 21v-8"/><path d="M12 13C12 8 8 5 3 5c0 5 4 8 9 8z"/><path d="M12 13c0-4 3.5-7 8-7 0 4-3.5 7-8 7z"/></svg>',
    shield: S + '<path d="M12 3l7 3v6c0 4.6-3 8-7 9-4-1-7-4.4-7-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
    check: S + '<path d="M4 12.5l5 5L20 6.5"/></svg>',
    checkCircle: S + '<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.6 2.6L16 9.5"/></svg>',
    box: S + '<path d="M12 3l8 4.2v9.6L12 21l-8-4.2V7.2z"/><path d="M4 7.2l8 4.2 8-4.2M12 11.4V21"/></svg>',
    store: S + '<path d="M3 9.5L5 4h14l2 5.5"/><path d="M4 9.5h16V20H4z"/><path d="M9 20v-5.5h6V20"/></svg>',
    chevL: S + '<path d="M14.5 5l-7 7 7 7"/></svg>',
    chevR: S + '<path d="M9.5 5l7 7-7 7"/></svg>',
    chevD: S + '<path d="M5 9l7 7 7-7"/></svg>',
    x: S + '<path d="M6 6l12 12M18 6L6 18"/></svg>',
    plus: S + '<path d="M12 5v14M5 12h14"/></svg>',
    star: F + '<path d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5 6.1 20.6l1.2-6.5L2.5 9.5l6.6-.9z"/></svg>',
    fb: F + '<path d="M13.5 21v-7h2.4l.4-2.9h-2.8V9.3c0-.8.2-1.4 1.5-1.4h1.4V5.3c-.3 0-1.3-.1-2.4-.1-2.3 0-3.9 1.4-3.9 4v2H7.7V14h2.4v7z"/></svg>',
    ig: S + '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="3.6"/><circle cx="17" cy="7" r="1.1" fill="currentColor" stroke="none"/></svg>',
    yt: F + '<path d="M21.4 8.1a2.5 2.5 0 00-1.7-1.8C18.2 6 12 6 12 6s-6.2 0-7.7.3A2.5 2.5 0 002.6 8.1C2.3 9.6 2.3 12 2.3 12s0 2.4.3 3.9a2.5 2.5 0 001.7 1.8c1.5.3 7.7.3 7.7.3s6.2 0 7.7-.3a2.5 2.5 0 001.7-1.8c.3-1.5.3-3.9.3-3.9s0-2.4-.3-3.9zM10.1 15V9l5.2 3z"/></svg>',
    wa: F + '<path d="M12 2.5a9.4 9.4 0 00-8 14.3L2.6 21.5l4.8-1.3A9.4 9.4 0 1012 2.5zm5.1 13c-.2.6-1.2 1.2-1.7 1.2-.5.1-1 .1-1.7-.1a10.6 10.6 0 01-4-2.5 9.7 9.7 0 01-2-2.9c-.3-.7-.3-1.4 0-2 .2-.4.5-.8.8-1 .2-.2.4-.2.6-.2h.4c.2 0 .4 0 .5.4l.8 1.8c.1.2 0 .4-.1.5l-.4.5c-.1.2-.2.3-.1.5.3.6.8 1.3 1.4 1.8.5.4 1.1.8 1.6 1 .2.1.4 0 .5-.1l.6-.7c.1-.2.3-.2.5-.1l1.7.8c.2.1.3.2.3.4 0 .2 0 .5-.1.8z"/></svg>',
    phone: S + '<path d="M4.5 3.5h3.2l1.6 4-2 1.4a11.5 11.5 0 005.8 5.8l1.4-2 4 1.6v3.2a1.5 1.5 0 01-1.7 1.5A16.5 16.5 0 013 5.2a1.5 1.5 0 011.5-1.7z"/></svg>',
    mail: S + '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.6 6.5L12 13l8.4-6.5"/></svg>',
    clock: S + '<circle cx="12" cy="12" r="9"/><path d="M12 7.2V12l3.4 2.1"/></svg>',
    user: S + '<circle cx="12" cy="8.4" r="3.9"/><path d="M4.6 20.2a7.6 7.6 0 0114.8 0"/></svg>',
    trash: S + '<path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.9 12.4h9.2L17.5 7"/></svg>',
    eye: S + '<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    tag: S + '<path d="M20.5 12.8l-7.7 7.7-9.3-9.3V3.5h7.7l9.3 9.3z"/><circle cx="8" cy="8" r="1.5"/></svg>',
    gift: S + '<rect x="3" y="8.5" width="18" height="12" rx="2"/><path d="M3 13h18M12 8.5V20.5"/><path d="M12 8.5S10.5 4 8 4a2.2 2.2 0 000 4.5zM12 8.5S13.5 4 16 4a2.2 2.2 0 010 4.5z"/></svg>',
    bell: S + '<path d="M18 16V11a6 6 0 10-12 0v5l-1.5 2.5h15z"/><path d="M9.8 19.5a2.3 2.3 0 004.4 0"/></svg>',
    users: S + '<circle cx="9" cy="8.5" r="3.5"/><path d="M2.8 20a6.4 6.4 0 0112.4 0"/><path d="M16.5 5.4a3.5 3.5 0 010 6.6M18 20h3.3a5.6 5.6 0 00-3.4-5"/></svg>',
    award: S + '<circle cx="12" cy="9.5" r="5.5"/><path d="M8.6 14.4L7 21.5l5-2.6 5 2.6-1.6-7.1"/></svg>',
    thumb: S + '<path d="M7 21V10l4-7 1.2.7a2.5 2.5 0 011.1 2.8L12.5 9H19a2 2 0 012 2.4l-1.5 7.2A2.5 2.5 0 0117 21z"/><path d="M7 10H3v11h4"/></svg>',
    info: S + '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.1"/></svg>',
    alert: S + '<path d="M12 3.5l9 16H3z"/><path d="M12 9v4.5M12 16.8v.1"/></svg>',
    lock: S + '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 018 0v2.5"/></svg>',
    card: S + '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19"/></svg>',
    receipt: S + '<path d="M6 2.5h12v19l-3-1.8-3 1.8-3-1.8-3 1.8z"/><path d="M9 8h6M9 12h6"/></svg>',
    headset: S + '<path d="M4 14v-2a8 8 0 1116 0v2"/><path d="M4 14h2.5v5H5a1 1 0 01-1-1zM20 14h-2.5v5H19a1 1 0 001-1z"/><path d="M17.5 19v.5a2.5 2.5 0 01-2.5 2.5h-2"/></svg>',
    refresh: S + '<path d="M20.5 12a8.5 8.5 0 11-2.6-6.1"/><path d="M20.5 4v5h-5"/></svg>',
    drop: S + '<path d="M12 3s6 6.5 6 10.5a6 6 0 11-12 0C6 9.5 12 3 12 3z"/></svg>',
    wheat: S + '<path d="M12 21V9"/><path d="M12 9c0-2.5 1.8-4 4-4 0 2.5-1.8 4-4 4zM12 9c0-2.5-1.8-4-4-4 0 2.5 1.8 4 4 4zM12 14c0-2.5 1.8-4 4-4 0 2.5-1.8 4-4 4zM12 14c0-2.5-1.8-4-4-4 0 2.5 1.8 4 4 4z"/></svg>',
    flame: S + '<path d="M12 21a5.5 5.5 0 004-9.3C13.5 9 13 6 13 3c-3 2-7 5.5-7 11a5.5 5.5 0 006 7z"/></svg>',
    sun: S + '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M5 5l1.8 1.8M17.2 17.2L19 19M19 5l-1.8 1.8M6.8 17.2L5 19"/></svg>',
    mortar: S + '<path d="M4 9h16v1a8 8 0 01-16 0z"/><path d="M12 18v3M8 21h8"/><path d="M14 9L18 3"/></svg>',
    filter: S + '<path d="M3 6h18M6 12h12M10 18h4"/></svg>',
    arrowR: S + '<path d="M4 12h15M13 6l6 6-6 6"/></svg>',
    home: S + '<path d="M3.5 10.5L12 3.5l8.5 7"/><path d="M5.5 9.6V20h13V9.6"/><path d="M10 20v-5.5h4V20"/></svg>',
    pkg: S + '<path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M7.5 5.2l9 4.6v10.4M21 7.5l-9 4.6"/></svg>',
    scale: S + '<path d="M12 3v18M5 21h14"/><path d="M12 6l-7 2 3 5a3.5 3.5 0 01-7 0zM12 6l7 2-3 5a3.5 3.5 0 007 0z"/></svg>',
    handshake: S + '<path d="M8 12l3-3 2 2 3-3 4 4-5 5-2-2-3 3z"/><path d="M2 10l4-4 3 3M22 10l-4-4"/></svg>'
  };
  const ic = function (n, cls) {
    const raw = ICONS[n] || '';
    return cls ? raw.replace('<svg ', '<svg class="' + cls + '" ') : raw;
  };

  /* --------------------------------------------------------------- store --- */
  const K = { cart: 'so_cart_v1', wish: 'so_wish_v1', lang: 'so_lang_v1', recent: 'so_recent_v1', orders: 'so_orders_v1', news: 'so_news_v1', coupon: 'so_coupon_v1', addr: 'so_addr_v1' };
  const read = function (k, d) {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; }
  };
  const write = function (k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ }
  };

  /* ---------------------------------------------------------------- cart --- */
  const Cart = {
    all: function () { return read(K.cart, []); },
    save: function (items) { write(K.cart, items); Cart.sync(); },
    count: function () { return Cart.all().reduce(function (n, i) { return n + i.qty; }, 0); },
    find: function (slug, size) {
      return Cart.all().filter(function (i) { return i.slug === slug && i.size === size; })[0];
    },
    add: async function (slug, size, qty) {
      const p = SITE.byslug(slug);
      if (!p) return false;
      if (!p.stock) { Toast.show(p.name + ' is sold out', 'We press to order — usually back within a week.', 'err'); return false; }

      /* Require sign-in before adding to cart. Lazily load Supabase if needed. */
      try { await ensureSupabase(); } catch (e) { /* ignore load errors, fall through */ }
      if (window.Supabase && typeof window.Supabase.isAuthenticated === 'function') {
        let isAuth = false;
        try { isAuth = await window.Supabase.isAuthenticated(); } catch (e) { isAuth = false; }
        if (!isAuth) {
          const ret = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = 'signin.html?redirect=' + ret + '&message=signin';
          return false;
        }
      }

      size = size || p.sizes[0][0];
      qty = Math.max(1, qty || 1);
      const items = Cart.all();
      const hit = items.filter(function (i) { return i.slug === slug && i.size === size; })[0];
      if (hit) hit.qty = clamp(hit.qty + qty, 1, 99);
      else items.push({ slug: slug, size: size, qty: qty });
      Cart.save(items);
      Toast.show(p.name + ' added to cart', size + ' × ' + qty, 'ok');
      return true;
    },
    setQty: function (slug, size, qty) {
      const items = Cart.all();
      for (let i = 0; i < items.length; i++) {
        if (items[i].slug === slug && items[i].size === size) {
          if (qty <= 0) { items.splice(i, 1); } else { items[i].qty = clamp(qty, 1, 99); }
          break;
        }
      }
      Cart.save(items);
    },
    remove: function (slug, size) { Cart.setQty(slug, size, 0); },
    clear: function () { Cart.save([]); },
    /* Resolve stored rows into priced lines. */
    lines: function () {
      return Cart.all().map(function (i) {
        const p = SITE.byslug(i.slug);
        if (!p) return null;
        const sz = p.sizes.filter(function (s) { return s[0] === i.size; })[0] || p.sizes[0];
        const unitMrp = Math.round(sz[1] * (p.mrp / p.price));
        return {
          slug: p.slug, name: p.name, ta: p.ta, img: p.img, cat: p.cat, sku: p.sku,
          size: sz[0], price: sz[1], mrp: unitMrp, qty: i.qty,
          total: sz[1] * i.qty, saved: (unitMrp - sz[1]) * i.qty
        };
      }).filter(Boolean);
    },
    totals: function (opts) {
      opts = opts || {};
      const lines = Cart.lines();
      const sub = lines.reduce(function (n, l) { return n + l.total; }, 0);
      const mrp = lines.reduce(function (n, l) { return n + l.mrp * l.qty; }, 0);
      let discount = 0, freeShip = false;
      const code = opts.coupon !== undefined ? opts.coupon : read(K.coupon, '');
      const c = code ? SITE.coupons[code] : null;
      if (c && sub >= c.min) {
        if (c.type === 'pct') {
          const base = c.cat ? lines.filter(function (l) { return l.cat === c.cat; }).reduce(function (n, l) { return n + l.total; }, 0) : sub;
          discount = Math.round(base * c.value / 100);
        } else if (c.type === 'flat') { discount = Math.min(c.value, sub); }
        else if (c.type === 'ship') { freeShip = true; }
      }
      const after = sub - discount;
      let ship = 0;
      if (lines.length && !freeShip && after < SITE.shop.freeShipOver) {
        ship = opts.outsideTN ? SITE.shop.shipFlatIN : SITE.shop.shipFlatTN;
      }
      const cod = opts.cod ? SITE.shop.codFee : 0;
      return {
        lines: lines, count: lines.reduce(function (n, l) { return n + l.qty; }, 0),
        sub: sub, mrp: mrp, mrpSaved: mrp - sub, discount: discount, coupon: discount || freeShip ? code : '',
        ship: ship, cod: cod, freeShip: freeShip,
        total: Math.max(0, after + ship + cod),
        toFreeShip: Math.max(0, SITE.shop.freeShipOver - after)
      };
    },
    sync: function () {
      const n = Cart.count();
      $$('[data-cart-count]').forEach(function (el) { el.textContent = n; el.setAttribute('data-count', n); });
      if ($('[data-drawer-body]')) Drawer.render();
      document.dispatchEvent(new CustomEvent('cart:change'));
    }
  };

  /* ------------------------------------------------------------ wishlist --- */
  // The catalog is local/demo data (numeric product IDs), so keep wishlist
  // slugs in this browser, but never share them between Supabase accounts.
  let wishUserId = null;
  const wishKey = function () { return 'so_wish_v2_' + wishUserId; };
  const Wish = {
    all: function () {
      if (!wishUserId) return [];
      const items = read(wishKey(), []);
      return Array.isArray(items) ? items : [];
    },
    has: function (s) { return Wish.all().indexOf(s) > -1; },
    setUser: function (id) {
      if (wishUserId === (id || null)) return;
      wishUserId = id || null;
      Wish.sync();
      document.dispatchEvent(new CustomEvent('wish:change'));
    },
    toggle: async function (s) {
      const p = SITE.byslug(s);
      if (!p) return false;

      /* Fail closed if auth is unavailable or the current user cannot be verified. */
      try { await ensureSupabase(); } catch (e) { /* ignore load errors, fall through */ }
      let user = null;
      try {
        if (window.Supabase && typeof window.Supabase.getCurrentUser === 'function') {
          user = await window.Supabase.getCurrentUser();
        }
      } catch (e) { /* not authenticated */ }
      if (!user || !user.id) {
        Wish.setUser(null);
        const ret = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = 'signin.html?redirect=' + ret + '&message=signin';
        return false;
      }
      Wish.setUser(user.id);

      const a = Wish.all(), i = a.indexOf(s);
      if (i > -1) { a.splice(i, 1); Toast.show('Removed from wishlist', p ? p.name : '', 'warn'); }
      else { a.push(s); Toast.show('Saved to wishlist', p ? p.name : '', 'ok'); }
      write(wishKey(), a); Wish.sync();
      document.dispatchEvent(new CustomEvent('wish:change'));
      return i === -1;
    },
    remove: function (s) {
      const a = Wish.all(), i = a.indexOf(s);
      if (i > -1) { a.splice(i, 1); write(wishKey(), a); Wish.sync(); document.dispatchEvent(new CustomEvent('wish:change')); }
    },
    clear: function () {
      if (!wishUserId) return;
      write(wishKey(), []);
      Wish.sync();
      document.dispatchEvent(new CustomEvent('wish:change'));
    },
    sync: function () {
      const a = Wish.all();
      $$('[data-wish-count]').forEach(function (el) { el.textContent = a.length; el.setAttribute('data-count', a.length); });
      $$('[data-wish]').forEach(function (b) { b.classList.toggle('is-on', a.indexOf(b.getAttribute('data-wish')) > -1); });
    }
  };

  /* -------------------------------------------------------------- recent --- */
  const Recent = {
    push: function (slug) {
      const a = read(K.recent, []).filter(function (s) { return s !== slug; });
      a.unshift(slug); write(K.recent, a.slice(0, 12));
    },
    all: function () { return read(K.recent, []).map(SITE.byslug).filter(Boolean); }
  };

  /* -------------------------------------------------------------- orders --- */
  const Orders = {
    all: function () { return read(K.orders, []); },
    create: function (payload) {
      const list = Orders.all();
      const seq = 10480 + list.length + 1;
      const order = Object.assign({
        id: 'SO' + seq,
        placed: new Date().toISOString(),
        status: 'confirmed',
        steps: ['confirmed']
      }, payload);
      list.unshift(order); write(K.orders, list);
      return order;
    },
    find: function (id) {
      id = String(id || '').trim().toUpperCase();
      return Orders.all().filter(function (o) { return o.id.toUpperCase() === id; })[0] || null;
    }
  };

  /* --------------------------------------------------------------- toast --- */
  const Toast = {
    host: null,
    mount: function () {
      if (Toast.host) return;
      Toast.host = document.createElement('div');
      Toast.host.className = 'toasts';
      document.body.appendChild(Toast.host);
    },
    show: function (title, sub, kind) {
      Toast.mount();
      const icon = kind === 'err' ? 'alert' : kind === 'warn' ? 'info' : 'checkCircle';
      const el = document.createElement('div');
      el.className = 'toast' + (kind === 'warn' ? ' toast--warn' : kind === 'err' ? ' toast--err' : '');
      el.innerHTML = '<span class="toast__ic">' + ic(icon) + '</span><span><b>' + esc(title) + '</b>' +
        (sub ? '<span>' + esc(sub) + '</span>' : '') + '</span>';
      Toast.host.appendChild(el);
      setTimeout(function () {
        el.classList.add('is-out');
        setTimeout(function () { el.remove(); }, 240);
      }, 2900);
    }
  };

  /* --------------------------------------------------------------- scrim --- */
  const Scrim = {
    el: null,
    get: function () {
      if (!Scrim.el) {
        Scrim.el = document.createElement('div');
        Scrim.el.className = 'scrim';
        Scrim.el.addEventListener('click', function () { Drawer.close(); Modal.close(); });
        document.body.appendChild(Scrim.el);
      }
      return Scrim.el;
    },
    open: function () { Scrim.get().classList.add('is-open'); },
    close: function () { Scrim.get().classList.remove('is-open'); }
  };

  /* -------------------------------------------------------------- drawer --- */
  const Drawer = {
    el: null,
    mount: function () {
      if (Drawer.el) return;
      const d = document.createElement('aside');
      d.className = 'drawer';
      d.setAttribute('aria-label', 'Shopping cart');
      d.innerHTML =
        '<div class="drawer__head"><h4>Your Cart</h4><span class="count" data-drawer-count></span>' +
        '<button class="drawer__close" data-drawer-close aria-label="Close cart">' + ic('x') + '</button></div>' +
        '<div class="drawer__body" data-drawer-body></div>' +
        '<div class="drawer__foot" data-drawer-foot></div>';
      document.body.appendChild(d);
      Drawer.el = d;
      $('[data-drawer-close]', d).addEventListener('click', Drawer.close);
      d.addEventListener('click', function (e) {
        const rm = e.target.closest('[data-mini-rm]');
        if (rm) { const p = rm.getAttribute('data-mini-rm').split('|'); Cart.remove(p[0], p[1]); return; }
        const q = e.target.closest('[data-mini-q]');
        if (q) {
          const p = q.getAttribute('data-mini-q').split('|');
          Cart.setQty(p[0], p[1], parseInt(p[2], 10));
        }
      });
    },
    render: function () {
      Drawer.mount();
      const t = Cart.totals();
      const body = $('[data-drawer-body]'), foot = $('[data-drawer-foot]'), cnt = $('[data-drawer-count]');
      cnt.textContent = t.count ? t.count + (t.count === 1 ? ' item' : ' items') : '';
      if (!t.lines.length) {
        body.innerHTML = '<div class="empty"><div class="empty__ic">' + ic('cart') + '</div>' +
          '<h4>Your cart is empty</h4><p>Add a few honest, natural things to get started.</p>' +
          '<a class="btn btn--primary" href="products.html">Browse Products</a></div>';
        foot.innerHTML = '';
        return;
      }
      body.innerHTML = t.lines.map(function (l) {
        return '<div class="mini"><img src="' + l.img + '" alt="' + esc(l.name) + '">' +
          '<div class="mini__b"><a class="mini__nm" href="product.html?p=' + l.slug + '">' + esc(l.name) + '</a>' +
          '<span class="mini__ta ta">' + esc(l.ta) + '</span>' +
          '<div class="mini__ctl"><span class="qty">' +
          '<button data-mini-q="' + l.slug + '|' + l.size + '|' + (l.qty - 1) + '" aria-label="Decrease">−</button>' +
          '<input value="' + l.qty + '" readonly aria-label="Quantity">' +
          '<button data-mini-q="' + l.slug + '|' + l.size + '|' + (l.qty + 1) + '" aria-label="Increase">+</button></span>' +
          '<span class="mini__pr">' + money(l.total) + '</span>' +
          '<button class="mini__rm" data-mini-rm="' + l.slug + '|' + l.size + '" aria-label="Remove">' + ic('trash') + '</button>' +
          '</div><small class="muted small">' + esc(l.size) + '</small></div></div>';
      }).join('');
      foot.innerHTML =
        '<div class="drawer__row"><span>Subtotal</span><b>' + money(t.sub) + '</b></div>' +
        (t.mrpSaved ? '<div class="drawer__row"><span>You save</span><b style="color:var(--green-700)">− ' + money(t.mrpSaved) + '</b></div>' : '') +
        '<div class="drawer__row"><span>Delivery</span><b>' + (t.ship ? money(t.ship) : 'Free') + '</b></div>' +
        '<div class="drawer__row drawer__row--total"><span>Total</span><b>' + money(t.total) + '</b></div>' +
        (t.toFreeShip > 0 ? '<p class="drawer__note">Add ' + money(t.toFreeShip) + ' more for free delivery</p>' : '') +
        '<div class="row mt-14" style="gap:8px"><a class="btn btn--ghost" style="flex:1" href="cart.html">View Cart</a>' +
        '<a class="btn btn--primary" style="flex:1" href="checkout.html">Checkout</a></div>';
    },
    open: function () { Drawer.render(); Scrim.open(); Drawer.el.classList.add('is-open'); },
    close: function () { if (Drawer.el) Drawer.el.classList.remove('is-open'); Scrim.close(); }
  };

  /* --------------------------------------------------------------- modal --- */
  const Modal = {
    el: null,
    mount: function () {
      if (Modal.el) return;
      const m = document.createElement('div');
      m.className = 'modal';
      m.setAttribute('role', 'dialog');
      m.innerHTML = '<button class="modal__close" data-modal-close aria-label="Close">' + ic('x') + '</button><div data-modal-in></div>';
      document.body.appendChild(m);
      Modal.el = m;
      $('[data-modal-close]', m).addEventListener('click', Modal.close);
    },
    quick: function (slug) {
      const p = SITE.byslug(slug);
      if (!p) return;
      const mrpOf = function (sz, pr) {
        var row = p.sizes.filter(function (z) { return z[0] === sz; })[0];
        if (row && row[2] && row[2] > row[1]) return row[2];
        return Math.round(pr * p.mrp / p.price);
      };
      Modal.mount();
      let size = p.sizes[0][0], price = p.sizes[0][1];
      const render = function () {
        const mrp = mrpOf(size, price);
        const offPct = mrp > price ? Math.round((mrp - price) / mrp * 100) : 0;
        $('[data-modal-in]', Modal.el).innerHTML =
          '<div class="modal__in"><div>' +
          '<div class="gallery__main"><img src="' + p.img + '" alt="' + esc(p.name) + '"></div></div>' +
          '<div><span class="pcard__cat">' + esc(p.catName) + '</span>' +
          '<h2 class="pdp__title" style="font-size:23px">' + esc(p.name) + '</h2>' +
          '<div class="pdp__ta ta">' + esc(p.ta) + '</div>' +
          '<div class="pdp__meta">' + stars(p.rating) + '<span>' + p.rating.toFixed(1) + ' · ' + p.reviews + ' reviews</span><span>SKU ' + p.sku + '</span></div>' +
          '<div class="pdp__price"><b>' + money(price) + '</b>' + (mrp > price ? '<s>' + money(mrp) + '</s>' : '') +
          (offPct > 0 ? '<span class="chip chip--red">' + offPct + '% OFF</span>' : '') + '</div>' +
          '<p class="pdp__desc">' + esc(p.desc.split('. ').slice(0, 2).join('. ') + '.') + '</p>' +
          '<div class="pdp__opts">' + p.sizes.map(function (s) {
            return '<button class="optbtn' + (s[0] === size ? ' is-on' : '') + '" data-qv-size="' + esc(s[0]) + '">' + esc(s[0]) + '<small>' + money(s[1]) + '</small></button>';
          }).join('') + '</div>' +
          '<div class="pdp__buy"><span class="qty qty--lg"><button data-qv-minus>−</button>' +
          '<input data-qv-qty value="1" readonly><button data-qv-plus>+</button></span>' +
          (p.stock
            ? '<button class="btn btn--primary btn--lg" data-qv-add>' + ic('cart') + ' Add to Cart</button>'
            : '<button class="btn btn--ghost btn--lg" disabled>' + ic('bell') + ' Notify Me</button>') +
          '<button class="btn btn--ghost btn--lg" data-wish="' + p.slug + '" aria-label="Wishlist">' + ic('heart') + '</button></div>' +
          (p.stock ? '' : '<p class="small muted mt-8">Sold out for now — we press to order, so it is usually back within a week.</p>') +
          '<div class="pdp__ticks">' + (p.highlights || []).slice(0, 3).map(function (h) {
            return '<span class="tick">' + ic('check') + esc(h) + '</span>';
          }).join('') + '</div>' +
          '<a class="linkish" href="product.html?p=' + p.slug + '">View full details →</a></div></div>';
        Wish.sync();
      };
      render();
      const inEl = $('[data-modal-in]', Modal.el);
      inEl.onclick = function (e) {
        const s = e.target.closest('[data-qv-size]');
        if (s) { size = s.getAttribute('data-qv-size'); price = p.sizes.filter(function (z) { return z[0] === size; })[0][1]; render(); return; }
        const q = $('[data-qv-qty]', inEl);
        if (e.target.closest('[data-qv-minus]')) { q.value = Math.max(1, +q.value - 1); return; }
        if (e.target.closest('[data-qv-plus]')) { q.value = Math.min(99, +q.value + 1); return; }
        if (e.target.closest('[data-qv-add]')) {
          Cart.add(p.slug, size, +q.value).then(function (ok) {
            if (ok) { Modal.close(); Drawer.open(); }
          });
          return;
        }
        const w = e.target.closest('[data-wish]');
        if (w) { e.stopPropagation(); Wish.toggle(w.getAttribute('data-wish')).then(function () { render(); }); return; }
      };
      Scrim.open(); Modal.el.classList.add('is-open');
    },
    close: function () { if (Modal.el) Modal.el.classList.remove('is-open'); Scrim.close(); }
  };

  /* --------------------------------------------------------------- stars --- */
  function stars(v, cls) {
    let h = '<span class="stars ' + (cls || '') + '" aria-label="' + v + ' out of 5">';
    for (let i = 1; i <= 5; i++) h += ICONS.star.replace('<svg ', '<svg class="' + (i <= Math.round(v) ? '' : 'off') + '" ');
    return h + '</span>';
  }

  /* -------------------------------------------------------- product card --- */
  function card(p, opts) {
    opts = opts || {};
    const flags = [];
    if (p.badge) flags.push('<span class="flag' + (p.badge === 'New' ? ' flag--new' : '') + '">' + esc(p.badge) + '</span>');
    if (p.off >= 12) flags.push('<span class="flag flag--sale">' + p.off + '% OFF</span>');
    if (!p.stock) flags.push('<span class="flag flag--out">Out of stock</span>');
    return '<article class="pcard" data-slug="' + p.slug + '">' +
      '<div class="pcard__media">' +
      '<a href="product.html?p=' + p.slug + '"><img src="' + p.img + '" alt="' + esc(p.name) + '" loading="lazy"></a>' +
      (flags.length ? '<div class="pcard__flags">' + flags.join('') + '</div>' : '') +
      '<button class="pcard__wish" data-wish="' + p.slug + '" aria-label="Add ' + esc(p.name) + ' to wishlist">' + ic('heart') + '</button>' +
      '<button class="pcard__quick" data-quick="' + p.slug + '">' + ic('eye') + ' Quick View</button>' +
      '</div>' +
      '<div class="pcard__body">' +
      (opts.showCat ? '<span class="pcard__cat">' + esc(p.catName) + '</span>' : '') +
      '<a class="pcard__nm" href="product.html?p=' + p.slug + '">' + esc(p.name) + '</a>' +
      '<span class="pcard__ta ta">' + esc(p.ta) + '</span>' +
      '<span class="pcard__unit">' + esc(p.unit) + '</span>' +
      '<div class="pcard__price"><b>' + money(p.price) + '</b><s>' + money(p.mrp) + '</s></div>' +
      '<div class="pcard__rate">' + stars(p.rating) + '<small>(' + p.reviews + ')</small></div>' +
      (p.stock
        ? '<button class="btn btn--primary btn--sm btn--block" data-add="' + p.slug + '">Add to Cart</button>'
        : '<button class="btn btn--ghost btn--sm btn--block" disabled>Notify Me</button>') +
      '</div></article>';
  }

  /* ------------------------------------------------------------ carousel --- */
  function carousel(root) {
    const track = $('[data-car-track]', root);
    const prev = $('[data-car-prev]', root);
    const next = $('[data-car-next]', root);
    if (!track) return;
    const per = parseInt(root.getAttribute('data-per') || '8', 10);
    let page = 0;
    const pages = function () { return Math.max(1, Math.ceil(track.children.length / per)); };
    const apply = function () {
      page = clamp(page, 0, pages() - 1);
      track.style.transform = 'translateX(' + (-page * 100) + '%)';
      if (prev) prev.disabled = page === 0;
      if (next) next.disabled = page >= pages() - 1;
    };
    if (prev) prev.addEventListener('click', function () { page--; apply(); });
    if (next) next.addEventListener('click', function () { page++; apply(); });
    apply();
    return { apply: apply };
  }

  /* -------------------------------------------------------------- search --- */
  function searchIndex(q) {
    q = String(q || '').trim().toLowerCase();
    if (!q) return [];
    const terms = q.split(/\s+/);
    return SITE.products.map(function (p) {
      const hay = (p.name + ' ' + p.ta + ' ' + p.catName + ' ' + p.catTa + ' ' + p.tags.join(' ') + ' ' + p.desc).toLowerCase();
      let score = 0;
      terms.forEach(function (t) {
        if (p.name.toLowerCase().indexOf(t) === 0) score += 6;
        else if (p.name.toLowerCase().indexOf(t) > -1) score += 4;
        if (p.ta.indexOf(t) > -1) score += 4;
        if (p.catName.toLowerCase().indexOf(t) > -1) score += 2;
        if (hay.indexOf(t) > -1) score += 1;
      });
      return { p: p, score: score };
    }).filter(function (r) { return r.score > 0; })
      .sort(function (a, b) { return b.score - a.score || b.p.rating - a.p.rating; })
      .map(function (r) { return r.p; });
  }

  function wireSearch(form) {
    const input = $('input[type="search"], input[name="q"]', form);
    const box = $('[data-suggest]', form);
    if (!input || !box) return;
    let cursor = -1, items = [];
    const close = function () { box.classList.remove('is-open'); cursor = -1; };
    const draw = function () {
      const q = input.value.trim();
      if (q.length < 2) { close(); return; }
      items = searchIndex(q).slice(0, 7);
      if (!items.length) {
        box.innerHTML = '<div class="suggest__empty">No products match “' + esc(q) + '”.<br><a class="linkish" href="products.html">Browse all products</a></div>';
      } else {
        box.innerHTML = items.map(function (p, i) {
          return '<a class="suggest__item' + (i === cursor ? ' is-active' : '') + '" href="product.html?p=' + p.slug + '">' +
            '<img src="' + p.img + '" alt=""><span><span class="suggest__nm">' + esc(p.name) + '</span>' +
            '<span class="suggest__ta ta">' + esc(p.ta) + '</span></span>' +
            '<span class="suggest__pr">' + money(p.price) + '</span></a>';
        }).join('') + '<a class="suggest__item" href="products.html?q=' + encodeURIComponent(q) + '" style="justify-content:center;font-weight:600;color:var(--green-700)">See all results for “' + esc(q) + '”</a>';
      }
      box.classList.add('is-open');
    };
    input.addEventListener('input', draw);
    input.addEventListener('focus', function () { if (input.value.trim().length >= 2) draw(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); cursor = clamp(cursor + 1, 0, items.length - 1); draw(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); cursor = clamp(cursor - 1, -1, items.length - 1); draw(); }
      else if (e.key === 'Enter' && cursor > -1 && items[cursor]) { e.preventDefault(); location.href = 'product.html?p=' + items[cursor].slug; }
      else if (e.key === 'Escape') close();
    });
    document.addEventListener('click', function (e) { if (!form.contains(e.target)) close(); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const q = input.value.trim();
      location.href = 'products.html' + (q ? '?q=' + encodeURIComponent(q) : '');
    });
  }

  /* ----------------------------------------------------------- shell nav --- */
  const NAV = [
    { key: 'home', label: 'Home', ta: 'முகப்பு', href: 'index.html' },
    { key: 'about', label: 'About Us', ta: 'எங்களை பற்றி', href: 'about.html' },
    { key: 'products', label: 'Products', ta: 'பொருட்கள்', href: 'products.html', drop: 'products' },
    { key: 'contact', label: 'Contact Us', ta: 'தொடர்பு கொள்ள', href: 'contact.html' }
  ];

  function megaProducts() {
    const groups = [
      ['Shop by need', [['Bestsellers', 'products.html?tag=bestseller', 'அதிகம் விற்பனையானவை'], ['New Arrivals', 'products.html?tag=new', 'புதிய வரவுகள்'], ['Combo & Gift Packs', 'products.html?q=combo', 'காம்போ பேக்குகள்'], ['Under ₹150', 'products.html?max=150', '₹150க்கு கீழ்']]],
      ['Popular now', SITE.featured().slice(0, 5).map(function (p) { return [p.name, 'product.html?p=' + p.slug, p.ta]; })]
    ];
    return '<div class="mega">' + groups.map(function (g) {
      return '<div class="mega__col"><h5>' + g[0] + '</h5>' + g[1].map(function (r) {
        return '<a href="' + r[1] + '"><b>' + esc(r[0]) + '</b><span class="ta">' + esc(r[2]) + '</span></a>';
      }).join('') + '</div>';
    }).join('') + '</div>';
  }

  function megaCats() {
    const cols = [SITE.categories.slice(0, 4), SITE.categories.slice(4, 7), SITE.categories.slice(7)];
    return '<div class="mega">' + cols.map(function (col, i) {
      return '<div class="mega__col">' + (i === 0 ? '<h5>Food & Grains</h5>' : i === 1 ? '<h5>Mixes & Flours</h5>' : '<h5>Home & Body</h5>') +
        col.map(function (c) {
          return '<a href="products.html?cat=' + c.slug + '"><b>' + esc(c.name) + '</b><span class="ta">' + esc(c.ta) + '</span></a>';
        }).join('') + '</div>';
    }).join('') + '</div>';
  }

  function headerHTML(active) {
    const sh = SITE.shop;
    return '' +
      '<div class="topbar"><div class="container topbar__in">' +
      '<p class="topbar__promo">🌿 Free Shipping on Orders Above ₹999 <span class="sep">|</span> <span class="ta">₹999 மேல் ஆர்டர் செய்யும் போது இலவச டெலிவரி</span></p>' +
      '<div class="topbar__links">' +
      '<a href="track-order.html">Track Order</a><span class="sep">|</span>' +
      '<a href="bulk-enquiry.html">Bulk / Wholesale Enquiry</a><span class="sep">|</span>' +
      '<button class="lang-toggle" data-lang-toggle>தமிழ்</button>' +
      '<span class="topbar__social">' +
      '<a href="https://facebook.com" aria-label="Facebook" target="_blank" rel="noopener">' + ic('fb') + '</a>' +
      '<a href="https://instagram.com" aria-label="Instagram" target="_blank" rel="noopener">' + ic('ig') + '</a>' +
      '<a href="https://wa.me/916380040002" aria-label="WhatsApp" target="_blank" rel="noopener">' + ic('wa') + '</a>' +
      '</span></div></div></div>' +

      '<header class="masthead"><div class="container masthead__in">' +
      '<a class="brand" href="index.html">' +
      '<img class="brand__logo" src="assets/img/logo.png" alt="Shanmuga Organics"></a>' +

      '<nav class="mainnav" aria-label="Main"><div class="mainnav__in">' +
      NAV.map(function (n) {
        return '<div class="navitem' + (n.key === active ? ' is-active' : '') + (n.drop ? ' navitem--drop' : '') + '">' +
          '<a class="navlink" href="' + n.href + '"><b>' + n.label + '</b><span>' + n.ta + '</span></a>' +
          (n.drop === 'products' ? megaProducts() : n.drop === 'cats' ? megaCats() : '') + '</div>';
      }).join('') +
      '</div></nav>' +

      '<form class="searchbar" role="search" data-search>' +
      '<span class="searchbar__field">' + ic('search') +
      '<input type="search" name="q" placeholder="Search for rice, oils, millets, soaps…" autocomplete="off" aria-label="Search products"></span>' +
      '<button class="searchbar__btn" type="submit">Search</button>' +
      '<div class="suggest" data-suggest></div></form>' +

      '<div class="utilities">' +
      '<a class="util" href="store-locator.html"><span class="util__ic">' + ic('pin') + '</span>' +
      '<span class="util__tx"><b>Store Locator</b><span class="ta">அங்காடி உள்ளது</span></span></a>' +
      '<div class="auth-items">' +
      '<a class="util" href="wishlist.html" id="wishlistBtn"><span class="util__ic">' + ic('heart') +
      '<span class="util__badge" data-wish-count data-count="0">0</span></span>' +
      '<span class="util__tx"><b>Wishlist</b><span class="ta">விஷ்லிஸ்ட்</span></span></a>' +
      '<button class="util" data-open-cart id="cartBtn"><span class="util__ic">' + ic('cart') +
      '<span class="util__badge" data-cart-count data-count="0">0</span></span>' +
      '<span class="util__tx"><b>My Cart</b><span class="ta">என் வண்டி</span></span></button>' +
      '<a class="util" href="account.html" id="userAccountBtn">' +
        '<span class="util__ic">' +
          ic('user') +
          '<span class="util__avatar" data-user-avatar hidden><img alt="" data-user-avatar-img></span>' +
        '</span>' +
      '<span class="util__tx"><b data-user-name>My Account</b><span class="ta">என் கணக்கு</span></span></a>' +
      '<a class="util" href="signin.html" id="signInBtn"><span class="util__ic">' + ic('user') + '</span>' +
      '<span class="util__tx"><b>Sign In</b><span class="ta">உள்நுழை</span></span></a>' +
      '</div>' +
      '</div></div></header>';
  }

  function footerHTML() {
    const sh = SITE.shop;
    const col = function (title, links) {
      return '<div><h5>' + title + '</h5><ul class="footer__list">' + links.map(function (l) {
        return '<li><a href="' + l[1] + '">' + esc(l[0]) + '</a></li>';
      }).join('') + '</ul></div>';
    };
    return '' +
      '<footer class="footer"><div class="container footer__in">' +
      '<div class="footer__brand">' +
      '<img class="brand__logo" src="assets/img/logo.png" alt="' + sh.name + '">' +
      '<p class="small muted mt-8" style="max-width:230px">Traditional, chemical-free food and body care from Erode — pressed, ground and packed the way it has always been done.</p>' +
      '<div class="footer__social">' +
      '<a href="https://facebook.com" aria-label="Facebook" target="_blank" rel="noopener">' + ic('fb') + '</a>' +
      '<a href="https://instagram.com" aria-label="Instagram" target="_blank" rel="noopener">' + ic('ig') + '</a>' +
      '<a href="https://youtube.com" aria-label="YouTube" target="_blank" rel="noopener">' + ic('yt') + '</a>' +
      '<a href="https://wa.me/916380040002" aria-label="WhatsApp" target="_blank" rel="noopener">' + ic('wa') + '</a>' +
      '</div></div>' +

      col('Shop', [['All Products', 'products.html'], ['Oils', 'products.html?cat=cold-pressed-oils'],
        ['Rice & Millets', 'products.html?cat=traditional-rice'], ['Flours', 'products.html?cat=flour-varieties'],
        ['Health Mix', 'products.html?cat=health-mix'], ['Bath & Body Care', 'products.html?cat=bath-body-care'],
        ['Pickles & Powders', 'products.html?cat=pickles-powders']]) +

      col('Customer Service', [['My Account', 'account.html'], ['Track Order', 'track-order.html'],
        ['Shipping & Delivery', 'shipping.html'], ['Returns & Refunds', 'returns.html'],
        ['FAQs', 'faqs.html'], ['Bulk Enquiry', 'bulk-enquiry.html']]) +

      col('Information', [['About Us & Our Story', 'about.html'],
        ['Terms & Conditions', 'terms.html'],
        ['Privacy Policy', 'privacy.html'], ['Store Locator', 'store-locator.html']]) +

      '<div><h5>Contact Us</h5><ul class="footer__contact">' +
      '<li>' + ic('pin') + '<span><b>' + sh.name + '</b><br>' + sh.addr1 + '<br>' + sh.addr2 + '</span></li>' +
      '<li>' + ic('phone') + '<a href="tel:' + sh.phoneHref + '">' + sh.phone + '</a></li>' +
      '<li>' + ic('mail') + '<a href="mailto:' + sh.email + '">' + sh.email + '</a></li>' +
      '<li>' + ic('clock') + '<span>' + sh.hours + '</span></li>' +
      '</ul></div>' +

      '<div class="paycard"><h6>Secure Payments</h6><p>100% Secure Payments</p>' +
      '<div class="paycard__row">' +
      ['visa', 'mastercard', 'rupay', 'upi'].map(function (n) {
        return '<img src="assets/img/pay/' + n + '.svg" alt="' + n + '">';
      }).join('') + '</div>' +
      '<div class="paycard__ship"><span class="ic">' + ic('truck') + '</span>' +
      '<span><b>We Deliver All Over India</b><span>Fast &amp; Safe Delivery</span></span></div>' +
      '<p class="small muted mt-8">FSSAI Lic. ' + sh.fssai + '</p></div>' +

      '</div>' +
      '<div class="footbar"><div class="container footbar__in">' +
      '<span>© 2025 <b>' + sh.name + '</b>. All Rights Reserved.</span>' +
      '<span>Crafted with <span class="heart">♥</span> for Healthy Living</span>' +
      '</div></div></footer>';
  }

  /* ----------------------------------------------------------- language --- */
  function applyLang() {
    const lang = read(K.lang, 'en'); /* default = English */
    const isTa = lang === 'ta';
    document.documentElement.classList.toggle('lang-ta', isTa);
    document.documentElement.classList.toggle('lang-en', !isTa);
    /* Button label = the OTHER language (what clicking will switch to) */
    $$('[data-lang-toggle]').forEach(function (b) {
      b.textContent = isTa ? 'English' : 'தமிழ்';
    });
  }

  /* ------------------------------------------------------- form helpers --- */
  function validate(form) {
    let ok = true;
    $$('[data-req]', form).forEach(function (el) {
      const field = el.closest('.field') || el.parentElement;
      const v = (el.value || '').trim();
      let bad = !v;
      const type = el.getAttribute('data-req');
      if (!bad && type === 'email') bad = !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v);
      if (!bad && type === 'phone') bad = !/^(\+?91[\-\s]?)?[6-9]\d{9}$/.test(v.replace(/[\s\-]/g, ''));
      if (!bad && type === 'pin') bad = !/^\d{6}$/.test(v);
      if (!bad && el.type === 'checkbox') bad = !el.checked;
      field.classList.toggle('is-bad', bad);
      if (bad && ok) { el.focus(); }
      if (bad) ok = false;
    });
    return ok;
  }

  /* -------------------------------------------------------- delegation --- */
  function wireGlobal() {
    document.addEventListener('click', function (e) {
      const add = e.target.closest('[data-add]');
      if (add) {
        const slug = add.getAttribute('data-add');
        Cart.add(slug, add.getAttribute('data-size') || null, parseInt(add.getAttribute('data-qty') || '1', 10));
        return;
      }
      const w = e.target.closest('[data-wish]');
      if (w) { e.preventDefault(); Wish.toggle(w.getAttribute('data-wish')); return; }
      const q = e.target.closest('[data-quick]');
      if (q) { e.preventDefault(); Modal.quick(q.getAttribute('data-quick')); return; }
      if (e.target.closest('[data-open-cart]')) { e.preventDefault(); Drawer.open(); return; }
      const lt = e.target.closest('[data-lang-toggle]');
      if (lt) {
        const current = read(K.lang, 'en');
        const next = current === 'ta' ? 'en' : 'ta';
        write(K.lang, next);
        applyLang();
        Toast.show(
          next === 'ta' ? 'தமிழ் மட்டும்' : 'English Only',
          next === 'ta' ? 'Showing Tamil only' : 'Showing English only',
          'ok'
        );
        return;
      }
      const acc = e.target.closest('[data-acc-q]');
      if (acc) {
        const item = acc.closest('.acc__item');
        const open = item.classList.contains('is-open');
        if (!acc.hasAttribute('data-acc-multi')) {
          $$('.acc__item', item.parentElement).forEach(function (i) { i.classList.remove('is-open'); });
        }
        item.classList.toggle('is-open', !open);
        return;
      }
      const tab = e.target.closest('[data-tab]');
      if (tab) {
        const wrap = tab.closest('.tabs');
        $$('[data-tab]', wrap).forEach(function (b) { b.classList.toggle('is-on', b === tab); });
        $$('.tabs__panel', wrap).forEach(function (p) {
          p.classList.toggle('is-on', p.getAttribute('data-panel') === tab.getAttribute('data-tab'));
        });
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { Drawer.close(); Modal.close(); }
    });

    /* newsletter — every page has one in the footer area or a section */
    document.addEventListener('submit', function (e) {
      const f = e.target.closest('[data-newsletter]');
      if (!f) return;
      e.preventDefault();
      const input = $('input', f), v = (input.value || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v)) {
        Toast.show('Check that email', 'That address does not look right.', 'err');
        input.focus();
        return;
      }
      const list = read(K.news, []);
      if (list.indexOf(v) > -1) { Toast.show('Already subscribed', v, 'warn'); }
      else { list.push(v); write(K.news, list); Toast.show('You are on the list', 'Offers and recipes will reach ' + v, 'ok'); }
      f.reset();
    });
  }

  /* ------------------------------------------------------- hero slider --- */
  function heroSlider() {
    var root = document.getElementById('heroSlider');
    if (!root) return;

    /* ---- sync with admin banners from localStorage ---- */
    try {
      var raw = localStorage.getItem('so_admin_banners_v1');
      if (raw) {
        var banners = JSON.parse(raw);
        // Only show active hero-position banners
        var heroBanners = banners.filter(function (b) { return b.active && b.position === 'hero'; });
        heroBanners.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });

        if (heroBanners.length > 0) {
          var track = root.querySelector('.hero__track');
          var dotsWrap = root.querySelector('[data-hero-dots]');
          if (track && dotsWrap) {
            // Rebuild slides
            track.innerHTML = heroBanners.map(function (b, i) {
              var link = b.link || 'products.html';
              return '<div class="hero__slide' + (i === 0 ? ' is-active' : '') + '" data-slide="' + i + '">' +
                '<img class="hero__bg" src="' + b.image + '" alt="' + b.title + '" loading="' + (i === 0 ? 'eager' : 'lazy') + '">' +
                '<div class="hero__overlay"></div>' +
                '<div class="container hero__in">' +
                  '<div class="hero__copy">' +
                    '<span class="hero__badge">🌿 Shanmugi Organics</span>' +
                    '<h2 class="hero__title">' + b.title + '</h2>' +
                    '<div class="hero__cta">' +
                      '<a class="btn btn--primary btn--lg" href="' + link + '">Shop Now</a>' +
                      '<a class="btn btn--glass btn--lg" href="products.html">View All</a>' +
                    '</div>' +
                  '</div>' +
                '</div>' +
              '</div>';
            }).join('');

            // Rebuild dots
            dotsWrap.innerHTML = heroBanners.map(function (b, i) {
              return '<button class="hero__dot' + (i === 0 ? ' is-active' : '') + '" aria-label="Slide ' + (i + 1) + '" data-dot="' + i + '"></button>';
            }).join('');
          }
        }
      }
    } catch (e) { /* ignore */ }

    var slides = root.querySelectorAll('.hero__slide');
    var dots   = root.querySelectorAll('.hero__dot');
    var bar    = root.querySelector('[data-hero-bar]');
    var total  = slides.length;
    var cur    = 0;
    var AUTO   = 5500;        // ms per slide
    var timer  = null;
    var paused = false;

    function go(idx) {
      /* Live re-query: safe even if the DOM was rebuilt after init */
      slides = root.querySelectorAll('.hero__slide');
      dots = root.querySelectorAll('.hero__dot');
      var track = root.querySelector('.hero__track');
      total = slides.length;
      if (!total) return;
      if (idx < 0) idx = total - 1;
      if (idx >= total) idx = 0;
      if (slides[cur]) slides[cur].classList.remove('is-active');
      if (dots[cur]) dots[cur].classList.remove('is-active');
      cur = idx;
      slides[cur].classList.add('is-active');
      if (dots[cur]) dots[cur].classList.add('is-active');
      /* Bootstrap-style horizontal slide: translate the flex track */
      if (track) track.style.transform = 'translateX(' + (-cur * 100) + '%)';
      restartBar();
    }

    function next() { go(cur + 1); }
    function prev() { go(cur - 1); }

    // progress bar
    function restartBar() {
      if (!bar) return;
      bar.style.transition = 'none';
      bar.style.width = '0%';
      // force reflow
      void bar.offsetWidth;
      bar.style.transition = 'width ' + AUTO + 'ms linear';
      bar.style.width = '100%';
    }

    // auto-play
    function startAuto() {
      stopAuto();
      timer = setInterval(function () { if (!paused) next(); }, AUTO);
      restartBar();
    }
    function stopAuto() { clearInterval(timer); }

    /* Start the timer FIRST so the slideshow always runs, then attach
       the interactive controls — any error there can't stop playback. */
    if (root.querySelectorAll('.hero__slide').length) {
      startAuto();
      console.log('[hero] slideshow started');
    } else {
      console.warn('[hero] no .hero__slide elements found');
    }

    try {
      // pause on hover
      root.addEventListener('mouseenter', function () { paused = true; if (bar) bar.style.animationPlayState = 'paused'; });
      root.addEventListener('mouseleave', function () { paused = false; startAuto(); });

      // arrows
      var prevBtn = root.querySelector('[data-hero-prev]');
      var nextBtn = root.querySelector('[data-hero-next]');
      if (prevBtn) prevBtn.addEventListener('click', function () { prev(); startAuto(); });
      if (nextBtn) nextBtn.addEventListener('click', function () { next(); startAuto(); });

      // dots
      dots.forEach(function (d) {
        d.addEventListener('click', function () {
          go(parseInt(d.getAttribute('data-dot'), 10));
          startAuto();
        });
      });

      // keyboard
      document.addEventListener('keydown', function (e) {
        var rect = root.getBoundingClientRect();
        if (rect.top > window.innerHeight || rect.bottom < 0) return;
        if (e.key === 'ArrowLeft')  { prev(); startAuto(); }
        if (e.key === 'ArrowRight') { next(); startAuto(); }
      });

      // touch swipe
      var tx = 0;
      root.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
      root.addEventListener('touchend', function (e) {
        var dx = e.changedTouches[0].clientX - tx;
        if (Math.abs(dx) > 50) { dx < 0 ? next() : prev(); startAuto(); }
      }, { passive: true });
    } catch (e) {
      console.error('[hero] control wiring failed (slideshow continues):', e);
    }
  }

  /* ----------------------------------------------------------- bootstrap --- */
  function mount(active) {
    /* Each step is isolated so one failing feature (e.g. search, cart,
       auth) can never kill the rest of the page — most importantly the
       hero slider, which must always start its animation timer. */
    const safe = function (label, fn) {
      try { fn(); } catch (e) { console.error('[shell] ' + label + ' failed:', e); }
    };
    safe('header', function () {
      const h = $('[data-shell="header"]');
      if (h) h.innerHTML = headerHTML(active);
    });
    safe('footer', function () {
      const f = $('[data-shell="footer"]');
      if (f) f.innerHTML = footerHTML();
    });
    safe('search', function () { $$('[data-search]').forEach(wireSearch); });
    safe('lang', applyLang);
    safe('cart', function () { Cart.sync(); });
    safe('wish', function () { Wish.sync(); });
    safe('hero', heroSlider);
    safe('auth', function () { updateAuthUI(); });
  }

  /* Public helper: refresh the avatar in the top header (e.g. after
     the user uploads a new photo on the account page). Broadcasts a
     'so:avatar-changed' event so other tabs (and other JS on this page)
     can react. Safe to call when signed out — it's a no-op. */
  function refreshHeaderAvatar() {
    try { updateAuthUI(); } catch (e) { /* non-fatal */ }
    try { window.dispatchEvent(new CustomEvent('so:avatar-changed')); } catch (e) { /* ignore */ }
    try {
      // Cross-tab sync. sessionStorage fires 'storage' on OTHER tabs.
      sessionStorage.setItem('so_avatar_changed', String(Date.now()));
    } catch (e) { /* ignore */ }
  }

  // Listen for cross-tab avatar updates and re-run updateAuthUI.
  try {
    window.addEventListener('storage', function (e) {
      if (e.key === 'so_avatar_changed') refreshHeaderAvatar();
    });
  } catch (e) { /* ignore */ }

  let authUiRequest = 0;
  async function updateAuthUI() {
    const request = ++authUiRequest;
    const accountBtn = document.getElementById('userAccountBtn');
    const signInBtn = document.getElementById('signInBtn');
    const wishlistBtn = document.getElementById('wishlistBtn');
    const cartBtn = document.getElementById('cartBtn');
    let isAuth = false;
    let userName = '';
    let userId = null;
    let avatarUrl = '';
    try {
      await ensureSupabase();
      if (window.Supabase && typeof window.Supabase.isAuthenticated === 'function') {
        isAuth = await window.Supabase.isAuthenticated();
        if (isAuth && typeof window.Supabase.getCurrentUser === 'function') {
          const user = await window.Supabase.getCurrentUser();
          if (user) {
            userId = user.id;
            // Get full name from user metadata (set during sign-up)
            const meta = user.user_metadata || {};
            userName = meta.full_name || meta.name || (user.email ? user.email.split('@')[0] : 'User');
          }
        }
      }
    } catch (e) {
      isAuth = false;
    }

    if (request !== authUiRequest) return;

    // A session alone is not enough: only load hearts for a resolved user ID.
    Wish.setUser(isAuth ? userId : null);

    if (accountBtn) {
      accountBtn.style.display = isAuth ? 'flex' : 'none';
      // Update the user name in the account button
      const nameEl = accountBtn.querySelector('[data-user-name]');
      if (nameEl && isAuth && userName) {
        nameEl.textContent = userName;
      }
      // Update the avatar (round profile photo in the icon slot).
      const avSlot = accountBtn.querySelector('[data-user-avatar]');
      const avImg  = accountBtn.querySelector('[data-user-avatar-img]');
      const avIcs  = accountBtn.querySelectorAll('.util__ic > svg');
      if (avSlot && avImg) {
        if (isAuth) {
          // Fetch the profile so we can show the user's photo. If the
          // fetch fails or there is no avatar_url, fall back to the
          // generic user icon.
          try {
            if (window.Supabase && typeof window.Supabase.getProfile === 'function' && userId) {
              const { data } = await window.Supabase.getProfile(userId);
              if (data && data.avatar_url) avatarUrl = data.avatar_url;
            }
          } catch (e) { /* ignore - keep generic icon */ }
          if (avatarUrl) {
            avImg.src = avatarUrl;
            avSlot.hidden = false;
            avIcs.forEach(function (s) { s.style.display = 'none'; });
          } else {
            avSlot.hidden = true;
            avImg.removeAttribute('src');
            avIcs.forEach(function (s) { s.style.display = ''; });
          }
        } else {
          avSlot.hidden = true;
          avImg.removeAttribute('src');
          avIcs.forEach(function (s) { s.style.display = ''; });
        }
      }
    }
    if (signInBtn) signInBtn.style.display = isAuth ? 'none' : 'flex';
    if (wishlistBtn) wishlistBtn.style.display = isAuth ? 'flex' : 'none';
    if (cartBtn) cartBtn.style.display = isAuth ? 'flex' : 'none';

    // Re-sync cart and wishlist counts after auth state change
    Cart.sync();
    Wish.sync();
  }

  // Auth can change without navigating (and in another tab). Re-resolve the
  // account so a previous user's hearts disappear immediately after sign-out.
  let wishAuthListener = false;
  function listenForWishAuth() {
    if (wishAuthListener) return;
    wishAuthListener = true;
    ensureSupabase().then(function () {
      const auth = window.SupabaseClient && window.SupabaseClient.auth;
      if (auth && typeof auth.onAuthStateChange === 'function') {
        auth.onAuthStateChange(function (event) {
          if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
            if (event === 'SIGNED_OUT') { authUiRequest++; Wish.setUser(null); }
            // Supabase auth callbacks must not await other auth calls directly.
            setTimeout(updateAuthUI, 0);
          }
        });
      }
    }).catch(function () { Wish.setUser(null); });
  }

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  window.App = {
    $: $, $$: $$, esc: esc, money: money, clamp: clamp, ic: ic, stars: stars, card: card,
    carousel: carousel, searchIndex: searchIndex, validate: validate, ready: ready,
    Cart: Cart, Wish: Wish, Recent: Recent, Orders: Orders, Toast: Toast, Drawer: Drawer, Modal: Modal,
    keys: K, read: read, write: write,
    init: function (active) {
      ready(function () {
        mount(active);
        wireGlobal();
        listenForWishAuth();
        $$('[data-carousel]').forEach(carousel);
      });
    },
    refreshHeaderAvatar: refreshHeaderAvatar
  };
})();
