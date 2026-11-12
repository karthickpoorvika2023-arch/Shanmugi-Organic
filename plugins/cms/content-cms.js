/* ==========================================================================
   content-cms.js — Shanmuga Organics "Website Content" editor runtime
   --------------------------------------------------------------------------
   Loaded by every storefront page. Two jobs:

   1) VISITOR MODE (default): reads the saved content overrides and paints them
      onto the page (text, links, images, icons, backgrounds, hidden items and
      elements added from the admin panel "Add" tools).

   2) EDITOR MODE (page opened with ?cms=edit inside admin.html): adds the
      click-to-pick overlay and answers postMessage requests from the admin
      editor panel.

   Overrides live in localStorage (instant, same browser) and can be mirrored
   to Supabase (table `site_content`) so every visitor sees them — see
   supabase-content-schema.sql.
   ========================================================================== */
(function () {
  'use strict';

  var STORE_KEY = 'so_admin_content_v1';
  var CLOUD_FLAG = 'so_admin_content_cloud_v1';
  var CLOUD_FETCH = 'so_admin_content_fetch_v1';
  var CLOUD_TABLE = 'site_content';
  var CLOUD_ROW = 'global';
  /* Public storefront credentials (same pair already shipped in
     supabase-client.js). Used for read-only cloud pulls on pages that do not
     load the Supabase CDN; writes always go through the signed-in admin
     session instead. */
  var isLocal = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(location.origin);
  var local = window.__soSupabaseConfig;
  var validLocal = local && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(local.url) &&
    typeof local.publicKey === 'string' && local.publicKey.length > 10;
  var SB_URL = isLocal ? (validLocal ? local.url : null) : 'https://ufhlmdqkqdkcohpbzdux.supabase.co';
  var SB_KEY = isLocal ? (validLocal ? local.publicKey : null) : 'sb_publishable_vGSGtfcC4bX9jGtIWpAknQ_-c42WmiR';

  /* ------------------------------------------------------------ page list -- */
  var PAGES = [
    { file: 'index.html', name: 'Home', ta: 'முகப்பு', group: 'Main Pages', note: 'Hero slider, category strip, featured & bestseller rails, reviews, newsletter.' },
    { file: 'about.html', name: 'About Us', ta: 'எங்களைப் பற்றி', group: 'Main Pages', note: 'Story, farm photos, stats and values.' },
    { file: 'products.html', name: 'Products', ta: 'பொருட்கள்', group: 'Main Pages', note: 'Filter sidebar + product grid (cards come from the Products panel).' },
    { file: 'categories.html', name: 'Categories', ta: 'வகைகள்', group: 'Main Pages', note: 'Category cards.' },
    { file: 'product.html', name: 'Product Detail', ta: 'பொருள் விவரம்', group: 'Main Pages', note: 'Headings are editable; the product body is filled live from the Products panel.', dynamic: true },
    { file: 'recipes.html', name: 'Recipes', ta: 'சமையல் குறிப்புகள்', group: 'Main Pages', note: 'Intro + recipe grid (cards come from data.js).' },
    { file: 'contact.html', name: 'Contact Us', ta: 'தொடர்பு', group: 'Main Pages', note: 'Contact cards, form labels, map block.' },
    { file: 'faqs.html', name: 'FAQs', ta: 'கேள்வி பதில்', group: 'Main Pages', note: 'Question & answer accordion.' },
    { file: 'bulk-enquiry.html', name: 'Bulk Enquiry', ta: 'மொத்த விசாரணை', group: 'Main Pages', note: 'Wholesale enquiry form.' },
    { file: 'wholesale.html', name: 'Wholesale', ta: 'மொத்த விற்பனை', group: 'Main Pages', note: 'B2B pricing blocks and terms.' },
    { file: 'store-locator.html', name: 'Store Locator', ta: 'கடை இருப்பிடம்', group: 'Main Pages', note: 'Address, hours, stockists table.' },

    { file: 'cart.html', name: 'Cart', ta: 'கார்ட்', group: 'Shop Flow', note: 'Cart headings (items are live).', dynamic: true },
    { file: 'checkout.html', name: 'Checkout', ta: 'செக்அவுட்', group: 'Shop Flow', note: 'Checkout headings (form is live).', dynamic: true },
    { file: 'wishlist.html', name: 'Wishlist', ta: 'விருப்பப் பட்டியல்', group: 'Shop Flow', note: 'Wishlist headings.', dynamic: true },
    { file: 'track-order.html', name: 'Track Order', ta: 'ஆர்டர் கண்காணிப்பு', group: 'Shop Flow', note: 'Tracking form text.' },
    { file: 'account.html', name: 'My Account', ta: 'என் கணக்கு', group: 'Shop Flow', note: 'Account dashboard shell text.', dynamic: true },
    { file: 'account-settings.html', name: 'Account Settings', ta: 'கணக்கு அமைப்புகள்', group: 'Shop Flow', note: 'Profile / password screen text.' },

    { file: 'signin.html', name: 'Sign In', ta: 'உள்நுழை', group: 'Login Pages', note: 'Login form labels and side panel.' },
    { file: 'signup.html', name: 'Sign Up', ta: 'பதிவு செய்', group: 'Login Pages', note: 'Registration form labels.' },
    { file: 'forgot-password.html', name: 'Forgot Password', ta: 'கடவுச்சொல் மறந்தது', group: 'Login Pages', note: 'Reset request screen.' },
    { file: 'reset-password.html', name: 'Reset Password', ta: 'கடவுச்சொல் மாற்று', group: 'Login Pages', note: 'New password screen.' },
    { file: 'verify-email.html', name: 'Verify Email', ta: 'மின்னஞ்சல் சரிபார்ப்பு', group: 'Login Pages', note: 'Verification screen.' },
    { file: 'verify-otp.html', name: 'Verify OTP', ta: 'OTP சரிபார்ப்பு', group: 'Login Pages', note: 'OTP code screen shown right after sign up.' },

    { file: 'shipping.html', name: 'Shipping Policy', ta: 'டெலிவரி விதிகள்', group: 'Policy Pages', note: 'Delivery times and charges.' },
    { file: 'returns.html', name: 'Returns & Refunds', ta: 'திருப்பி அளித்தல்', group: 'Policy Pages', note: 'Return window and process.' },
    { file: 'privacy.html', name: 'Privacy Policy', ta: 'தனியுரிமை', group: 'Policy Pages', note: 'Data usage policy.' },
    { file: 'terms.html', name: 'Terms of Use', ta: 'பயன்பாட்டு விதிகள்', group: 'Policy Pages', note: 'Terms and conditions.' }
  ];

  /* Icon names available in app.js (window.App.ic) — the editor shows these
     with a live SVG preview rendered by the page itself. */
  var ICON_NAMES = ['search', 'pin', 'heart', 'cart', 'truck', 'leaf', 'sprout', 'shield', 'check',
    'checkCircle', 'box', 'store', 'chevL', 'chevR', 'chevD', 'x', 'plus', 'star', 'fb', 'ig', 'yt', 'wa',
    'phone', 'mail', 'clock', 'user', 'trash', 'eye', 'tag', 'gift', 'bell', 'users', 'award', 'thumb',
    'info', 'alert', 'lock', 'card', 'receipt', 'headset', 'refresh', 'drop', 'wheat', 'flame', 'sun',
    'mortar', 'filter', 'arrowR', 'home', 'pkg', 'scale', 'handshake'];

  /* Button styles offered by the "Add → Button" tool (site classes). */
  var BUTTON_STYLES = [
    { id: 'btn btn--primary', label: 'Primary (green)' },
    { id: 'btn btn--outline', label: 'Outline' },
    { id: 'btn btn--glass', label: 'Glass (on photos)' },
    { id: 'btn btn--primary btn--sm', label: 'Small primary' },
    { id: 'linkish', label: 'Text link' }
  ];

  /* Containers replaced at runtime by pages.js — their children get new keys
     on every render, so they are not offered for editing. Product / category
     content is managed from the Products & Categories panels instead. */
  var SKIP_SEL = '[data-rail],[data-catrail],[data-plist],[data-pdp],[data-related],[data-recentrail],' +
    '[data-recipes],[data-wishwrap],[data-cartwrap],[data-checkout],[data-account],[data-track],' +
    '[data-tmz],[data-filters],[data-activefilters],[data-cms-skip]';
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, LINK: 1, META: 1, TITLE: 1, NOSCRIPT: 1, TEMPLATE: 1, BR: 1, HR: 1,
    INPUT: 1, SELECT: 1, TEXTAREA: 1, IFRAME: 1, VIDEO: 1, AUDIO: 1, SOURCE: 1, OPTION: 1, CANVAS: 1,
    SVG: 1, PATH: 1, CIRCLE: 1, RECT: 1, POLYLINE: 1, POLYGON: 1, LINE: 1, G: 1, DEFS: 1, USE: 1 };
  var BLOCK_TAGS = { SECTION: 1, DIV: 1, ARTICLE: 1, HEADER: 1, FOOTER: 1, NAV: 1, MAIN: 1, UL: 1, OL: 1,
    LI: 1, TABLE: 1, TBODY: 1, THEAD: 1, TR: 1, TD: 1, TH: 1, FORM: 1, FIELDSET: 1, FIGURE: 1, ASIDE: 1,
    H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1, P: 1, DL: 1, DETAILS: 1, SUMMARY: 1 };
  var TA_RE = /[\u0B80-\u0BFF]/;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  /* ============================================================ store ====== */
  /* { v, updatedAt, nodes: { "<scope>::<sel>": {...patch} },
       inserts: { "<scope>": [ {id,type,parentSel,afterSel,...} ] } }           */
  function blank() { return { v: 1, updatedAt: 0, nodes: {}, inserts: {} }; }

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      var doc = raw ? JSON.parse(raw) : null;
      if (!doc || typeof doc !== 'object') return blank();
      doc.nodes = doc.nodes || {};
      doc.inserts = doc.inserts || {};
      return doc;
    } catch (e) { return blank(); }
  }

  function save(doc) {
    try {
      doc.v = 1;
      doc.updatedAt = doc.updatedAt || Date.now();
      localStorage.setItem(STORE_KEY, JSON.stringify(doc));
      return true;
    } catch (e) { return false; }
  }

  function scopeEdits(doc, scope) {
    var n = 0, k;
    for (k in doc.nodes) if (k.indexOf(scope + '::') === 0) n++;
    for (k in (doc.inserts || {})) if (k === scope) n += (doc.inserts[k] || []).length;
    return n;
  }

  function totalEdits(doc) {
    var n = 0, k;
    for (k in doc.nodes) n++;
    for (k in (doc.inserts || {})) n += (doc.inserts[k] || []).length;
    return n;
  }

  function resetScope(scope) {
    var doc = load(), k;
    for (k in doc.nodes) {
      if (k.slice(0, k.indexOf('::')) === scope) delete doc.nodes[k];
    }
    delete doc.inserts[scope];
    doc.updatedAt = Date.now();
    save(doc);
    return doc;
  }

  function resetAll() {
    var doc = blank();
    doc.updatedAt = Date.now();
    save(doc);
    return doc;
  }

  function docSize(doc) {
    try { return JSON.stringify(doc).length; } catch (e) { return 0; }
  }


  /* ======================================================= dom addressing == */
  /* A page is addressed as  <scope>::<selector>.  scope = the page file name
     (e.g. "index.html") or "shell:header" / "shell:footer" for the site-wide
     shell, so header/footer edits made on any page apply to every page. */
  function scopeOf(el) {
    if (!el || !el.closest) return 'page';
    var shell = el.closest('[data-shell]');
    if (shell) return 'shell:' + (shell.getAttribute('data-shell') || 'header');
    return pageFile();
  }

  function pageFile() {
    var last = (location.pathname || '/').split('/').pop() || 'index.html';
    if (!last || last.indexOf('.html') === -1) last = 'index.html';
    return last.toLowerCase();
  }

  function scopeRoot(scope) {
    if (scope && scope.indexOf('shell:') === 0) {
      return $('[data-shell="' + scope.slice(6) + '"]');
    }
    return document.body;
  }

  /* body-relative selector, stable across reloads of the same page markup */
  function selFor(el, root) {
    var segs = [], cur = el, guard = 0;
    while (cur && cur.nodeType === 1 && cur !== root && guard++ < 40) {
      var i = 1, sib = cur.previousElementSibling;
      while (sib) { if (sib.tagName === cur.tagName) i++; sib = sib.previousElementSibling; }
      segs.unshift(cur.tagName.toLowerCase() + ':nth-of-type(' + i + ')');
      cur = cur.parentElement;
    }
    return segs.join(' > ');
  }

  function findIn(root, sel) {
    if (!root || !sel) return null;
    try { return root.querySelector(sel); } catch (e) { return null; }
  }

  function splitKey(key) {
    var i = key.indexOf('::');
    return { scope: key.slice(0, i), sel: key.slice(i + 2) };
  }

  function keyOf(el) {
    var ins = el.getAttribute && el.getAttribute('data-cms-ins');
    if (ins) return '#ins:' + ins;
    var scope = scopeOf(el);
    var root = scopeRoot(scope);
    return scope + '::' + selFor(el, root || document.body);
  }

  /* The text node that carries the element's visible copy. Inline children
     (icon spans, <b>, <em>) are skipped so a button keeps its icon. */
  function mainTextNode(el) {
    var best = null, bestLen = 0;
    (function walk(node) {
      for (var c = node.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) {
          var t = (c.nodeValue || '').replace(/\s+/g, ' ').trim();
          if (t.length > bestLen) { bestLen = t.length; best = c; }
        } else if (c.nodeType === 1 && !SKIP_TAGS[c.tagName] && !c.hasAttribute('data-ic') &&
          !c.hasAttribute('data-cms-ins')) {
          walk(c);
        }
      }
    })(el);
    return best;
  }

  function textOf(el) {
    var n = mainTextNode(el);
    return n ? String(n.nodeValue || '').replace(/\s+/g, ' ').trim() : '';
  }

  /* Is this element a text holder (not a wrapper full of block children)? */
  function isTextEl(el) {
    if (!mainTextNode(el)) return false;
    for (var i = 0; i < el.children.length; i++) {
      var c = el.children[i];
      if (SKIP_TAGS[c.tagName] || c.hasAttribute('data-ic')) continue;
      if (BLOCK_TAGS[c.tagName] && mainTextNode(c)) return false;
    }
    return true;
  }

  function iconHost(el) {
    if (!el) return null;
    if (el.hasAttribute && el.hasAttribute('data-ic')) return el;
    return null;
  }

  function fillIcon(el, name) {
    if (!el || !name) return;
    var app = window.App;
    if (app && typeof app.ic === 'function') {
      var svg = app.ic(name);
      if (svg) el.innerHTML = svg;
    }
  }

  function className(el) {
    var c = el.getAttribute('class') || '';
    return c.split(/\s+/).filter(Boolean).slice(0, 3).join(' ');
  }

  function describe(el) {
    var parts = [], cur = el, guard = 0;
    while (cur && cur !== document.body && guard++ < 4) {
      parts.unshift(cur.tagName.toLowerCase() + (className(cur) ? '.' + className(cur).split(' ')[0] : ''));
      cur = cur.parentElement;
    }
    return parts.join(' > ');
  }

  function looksEditable(el) {
    if (!el || el.nodeType !== 1 || SKIP_TAGS[el.tagName]) return false;
    if (el.hasAttribute('data-cms-ins') || el.hasAttribute('data-ic')) return true;
    if (el.tagName === 'IMG' || el.tagName === 'A' || el.tagName === 'BUTTON') return true;
    return isTextEl(el);
  }

  function skipped(el) {
    if (!el.closest) return true;
    return !!(el.closest(SKIP_SEL) || el.closest('[data-cms-ui]'));
  }

  function typeOf(el) {
    if (el.hasAttribute('data-cms-ins')) return 'insert';
    if (el.tagName === 'IMG') return 'image';
    if (el.hasAttribute('data-ic')) return 'icon';
    if (el.tagName === 'A' || el.tagName === 'BUTTON') return 'link';
    if (isTextEl(el)) return 'text';
    return 'container';
  }



  /* ============================================================ applying == */
  function applyRecord(el, rec, editMode) {
    if (!el || !rec) return false;
    var changed = false;

    if (rec.text !== undefined && rec.text !== null) {
      var n = mainTextNode(el);
      if (n) {
        var cur = String(n.nodeValue || '').replace(/\s+/g, ' ').trim();
        var untouched = (rec.orig === undefined) || cur === rec.orig || cur === rec.text;
        if (untouched) {
          if (!el.hasAttribute('data-cms-o-text')) el.setAttribute('data-cms-o-text', String(n.nodeValue || ''));
          n.nodeValue = rec.text;
          changed = true;
        }
      }
    }

    if (rec.href !== undefined && el.setAttribute) {
      if (!el.hasAttribute('data-cms-o-href')) el.setAttribute('data-cms-o-href', el.getAttribute('href') || '');
      el.setAttribute('href', rec.href);
      changed = true;
    }

    if (rec.src !== undefined && el.setAttribute) {
      if (!el.hasAttribute('data-cms-o-src')) el.setAttribute('data-cms-o-src', el.getAttribute('src') || '');
      if (el.getAttribute('src') !== rec.src) el.setAttribute('src', rec.src);
      changed = true;
    }

    if (rec.alt !== undefined && el.setAttribute) {
      if (!el.hasAttribute('data-cms-o-alt')) el.setAttribute('data-cms-o-alt', el.getAttribute('alt') || '');
      el.setAttribute('alt', rec.alt);
      changed = true;
    }

    if (rec.icon !== undefined && el.setAttribute) {
      if (!el.hasAttribute('data-cms-o-icon')) el.setAttribute('data-cms-o-icon', el.getAttribute('data-ic') || '');
      el.setAttribute('data-ic', rec.icon);
      fillIcon(el, rec.icon);
      changed = true;
    }

    if (rec.bg !== undefined) {
      if (!el.hasAttribute('data-cms-o-bg')) el.setAttribute('data-cms-o-bg', el.style.backgroundImage || '');
      if (rec.bg) {
        el.style.backgroundImage = 'url("' + rec.bg + '")';
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
      } else {
        el.style.backgroundImage = '';
      }
      changed = true;
    }

    if (rec.hidden) {
      if (!el.hasAttribute('data-cms-o-disp')) el.setAttribute('data-cms-o-disp', el.style.display || '');
      if (editMode) { el.style.display = ''; el.classList.add('cms-hidden-el'); }
      else { el.classList.remove('cms-hidden-el'); el.style.display = 'none'; }
      changed = true;
    }
    return changed;
  }

  /* Undo everything this runtime painted, using the recorded originals, so a
     page can be reconciled with a freshly saved override set. */
  function restoreAll() {
    $$('[data-cms-o-text]').forEach(function (el) {
      var n = mainTextNode(el);
      if (n) n.nodeValue = el.getAttribute('data-cms-o-text');
      el.removeAttribute('data-cms-o-text');
    });
    $$('[data-cms-o-href]').forEach(function (el) {
      el.setAttribute('href', el.getAttribute('data-cms-o-href'));
      el.removeAttribute('data-cms-o-href');
    });
    $$('[data-cms-o-src]').forEach(function (el) {
      el.setAttribute('src', el.getAttribute('data-cms-o-src'));
      el.removeAttribute('data-cms-o-src');
    });
    $$('[data-cms-o-alt]').forEach(function (el) {
      el.setAttribute('alt', el.getAttribute('data-cms-o-alt'));
      el.removeAttribute('data-cms-o-alt');
    });
    $$('[data-cms-o-icon]').forEach(function (el) {
      el.setAttribute('data-ic', el.getAttribute('data-cms-o-icon'));
      fillIcon(el, el.getAttribute('data-ic'));
      el.removeAttribute('data-cms-o-icon');
    });
    $$('[data-cms-o-bg]').forEach(function (el) {
      el.style.backgroundImage = el.getAttribute('data-cms-o-bg');
      el.removeAttribute('data-cms-o-bg');
    });
    $$('[data-cms-o-disp]').forEach(function (el) {
      el.style.display = el.getAttribute('data-cms-o-disp');
      el.removeAttribute('data-cms-o-disp');
      el.classList.remove('cms-hidden-el');
    });
  }

  function reapply(editMode) {
    restoreAll();
    var doc = load(), n = 0, key;
    for (key in doc.nodes) {
      var parts = splitKey(key);
      var root = scopeRoot(parts.scope);
      if (!root) continue;
      var el = findIn(root, parts.sel);
      if (el && applyRecord(el, doc.nodes[key], editMode)) n++;
    }
    renderInserts(doc, editMode);
    return n;
  }

  /* ============================================================ inserts === */
  /* Elements added from the admin "Add" tools. Stored as structured records
     (never raw HTML) so the same node can be rebuilt on every page load. */
  function insId() {
    return 'i' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
  }

  function buildInsertEl(rec) {
    var el = null, span = null, lvl;
    if (rec.type === 'heading') {
      lvl = parseInt(rec.level || 3, 10);
      if (!(lvl >= 1 && lvl <= 6)) lvl = 3;
      el = document.createElement('h' + lvl);
      el.textContent = rec.text || 'New heading';
    } else if (rec.type === 'text') {
      el = document.createElement('p');
      el.textContent = rec.text || 'New text';
    } else if (rec.type === 'button') {
      el = document.createElement('a');
      el.setAttribute('href', rec.href || 'products.html');
      if (rec.icon) {
        span = document.createElement('span');
        span.setAttribute('data-ic', rec.icon);
        fillIcon(span, rec.icon);
        el.appendChild(span);
      }
      el.appendChild(document.createTextNode((rec.icon ? ' ' : '') + (rec.text || 'Shop Now')));
    } else if (rec.type === 'icon') {
      el = document.createElement('span');
      el.setAttribute('data-ic', rec.icon || 'leaf');
      fillIcon(el, rec.icon || 'leaf');
    } else if (rec.type === 'image') {
      el = document.createElement('img');
      el.setAttribute('alt', rec.alt || '');
      if (rec.src) el.setAttribute('src', rec.src);
      el.style.maxWidth = '100%';
      if (rec.height) el.style.height = rec.height + 'px';
      el.style.objectFit = 'contain';
    } else if (rec.type === 'spacer') {
      el = document.createElement('div');
      el.style.height = (rec.height || 24) + 'px';
    }
    if (!el) return null;
    if (rec.cls) el.className = rec.cls;
    if (rec.type === 'icon' && !rec.cls) el.className = 'icard__ic';
    el.setAttribute('data-cms-ins', rec.id);
    if (rec.margin) el.style.margin = rec.margin;
    return el;
  }

  function renderInserts(doc) {
    $$('[data-cms-ins]').forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
    var inserts = doc.inserts || {}, scope;
    for (scope in inserts) {
      var list = inserts[scope];
      if (!list || !list.length) continue;
      var root = scopeRoot(scope);
      if (!root) continue;
      var lastParent = null, lastNode = null;
      list.forEach(function (rec) {
        var node = buildInsertEl(rec);
        if (!node) return;
        var parent = findIn(root, rec.parentSel) || root;
        var anchor = null;
        if (parent === lastParent && lastNode && lastNode.parentNode === parent) {
          anchor = lastNode.nextSibling;
        } else if (rec.afterSel) {
          var ref = findIn(parent, rec.afterSel);
          if (ref) anchor = ref.nextSibling;
        }
        if (anchor) parent.insertBefore(node, anchor);
        else parent.appendChild(node);
        lastParent = parent;
        lastNode = node;
      });
    }
    return true;
  }

  /* ====================================================== selection info == */
  function domState(el) {
    var rec = null, insId2 = el.getAttribute('data-cms-ins');
    var key = insId2 ? ('#ins:' + insId2) : keyOf(el);
    if (!insId2) rec = load().nodes[key] || null;
    var txt = textOf(el);
    return {
      key: key,
      scope: scopeOf(el),
      sel: insId2 ? '' : selFor(el, scopeRoot(scopeOf(el)) || document.body),
      ins: insId2 || '',
      tag: el.tagName.toLowerCase(),
      cls: el.getAttribute('class') || '',
      type: typeOf(el),
      where: describe(el),
      text: txt,
      origText: rec && rec.text !== undefined ? rec.orig : txt,
      isTamil: TA_RE.test(txt),
      href: el.getAttribute('href') || '',
      src: el.getAttribute('src') || '',
      alt: el.getAttribute('alt') || '',
      icon: el.getAttribute('data-ic') || '',
      bg: (el.style.backgroundImage || '').replace(/^url\(["']?/, '').replace(/["']?\)$/, ''),
      hidden: !!(rec && rec.hidden),
      hasOverride: !!(rec && Object.keys(rec).length),
      can: {
        text: typeOf(el) === 'text' || typeOf(el) === 'link' || typeOf(el) === 'insert' || typeOf(el) === 'container',
        href: el.tagName === 'A',
        image: el.tagName === 'IMG',
        icon: el.hasAttribute('data-ic'),
        addIcon: !el.hasAttribute('data-ic'),
        bg: typeOf(el) === 'container' || el.tagName === 'SECTION' || el.tagName === 'DIV',
        hide: true,
        ins: !!insId2
      }
    };
  }

  function collect() {
    var out = [], doc = load(), key, parts, root, list;
    /* saved overrides first: they may point at elements that are otherwise
       hard to click (hidden items, tiny icons) */
    for (key in doc.nodes) {
      parts = splitKey(key);
      root = scopeRoot(parts.scope);
      var el = findIn(root, parts.sel);
      if (el && !out.some(function (o) { return o.key === key; })) {
        out.push(domState(el));
      }
    }
    var scopes = [pageFile(), 'shell:header', 'shell:footer'];
    scopes.forEach(function (scope) {
      var rt = scopeRoot(scope);
      if (!rt) return;
      $$('*', rt).forEach(function (el) {
        if (out.length > 900) return;
        if (skipped(el) || !looksEditable(el)) return;
        if (el.closest('[data-cms-ins]')) return;
        var st = domState(el);
        if (out.some(function (o) { return o.key === st.key; })) return;
        if (st.type === 'text' && !st.text) return;
        out.push(st);
      });
    });
    list = out;
    return list;
  }

  /* ============================================================== picker == */
  var editMode = /[?&]cms=edit/.test(location.search) || window.name === 'cms-frame';
  var pickerOn = false, hoverEl = null, selEl = null, selInfo = null;
  var hovBox = null, hovTag = null, selBox = null, selTag = null;

  function mkUi(id) {
    var d = document.createElement('div');
    d.id = id;
    d.setAttribute('data-cms-ui', '1');
    document.documentElement.appendChild(d);
    return d;
  }

  function ensureUI() {
    if (hovBox) return;
    hovBox = mkUi('cms-hover-box');
    hovTag = mkUi('cms-hover-tag');
    selBox = mkUi('cms-sel-box');
    selTag = mkUi('cms-sel-tag');
    hovBox.style.display = 'none';
    hovTag.style.display = 'none';
    selBox.style.display = 'none';
    selTag.style.display = 'none';
  }

  function place(box, el) {
    if (!box || !el || !el.getBoundingClientRect) return;
    var r = el.getBoundingClientRect();
    box.style.left = Math.round(r.left + window.pageXOffset) + 'px';
    box.style.top = Math.round(r.top + window.pageYOffset) + 'px';
    box.style.width = Math.max(Math.round(r.width), 2) + 'px';
    box.style.height = Math.max(Math.round(r.height), 2) + 'px';
    box.style.display = 'block';
  }

  function label(el, withText) {
    var s = el.tagName.toLowerCase() + (className(el) ? '.' + className(el) : '');
    if (withText) {
      var t = textOf(el) || el.getAttribute('src') || el.getAttribute('data-ic') || '';
      if (t) s += '  ›  ' + t.slice(0, 60);
    }
    return s;
  }

  function pickFrom(t) {
    var el = t;
    while (el && el !== document.documentElement) {
      if (el.nodeType === 1 && !skipped(el) && looksEditable(el)) return el;
      el = el.parentElement;
    }
    if (t && t.closest) {
      return t.closest('section, .sec, article, .card, .panel, main, footer, header, form, ul, .container') || null;
    }
    return null;
  }

  function onMove(e) {
    if (!pickerOn || busy) return;
    var el = pickFrom(e.target);
    if (el === hoverEl) return;
    hoverEl = el;
    if (!el) {
      hovBox.style.display = 'none';
      hovTag.style.display = 'none';
      return;
    }
    place(hovBox, el);
    place(hovTag, el);
    hovTag.textContent = label(el, false);
    hovTag.style.top = Math.max(0, parseInt(hovBox.style.top, 10) - 19) + 'px';
    hovTag.style.left = hovBox.style.left;
    hovTag.style.display = 'block';
  }

  function onClick(e) {
    if (!pickerOn) return;
    // The signup preview still needs working password visibility controls.
    // Do not consume their clicks before the button's own handler can run.
    if (e.target && e.target.closest && e.target.closest('.password-toggle[data-toggle-password]')) return;
    if (e.target && e.target.closest && e.target.closest('[data-cms-ui]')) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    var el = pickFrom(e.target);
    if (el) selectEl(el); else clearSel();
  }

  function selectEl(el) {
    ensureUI();
    selEl = el;
    place(selBox, el);
    place(selTag, el);
    selTag.textContent = '✎ ' + label(el, true);
    selTag.style.top = Math.max(0, parseInt(selBox.style.top, 10) - 19) + 'px';
    selTag.style.left = selBox.style.left;
    selInfo = domState(el);
    toParent({ t: 'select', info: selInfo });
    return selInfo;
  }

  function clearSel() {
    selEl = null;
    selInfo = null;
    if (selBox) { selBox.style.display = 'none'; selTag.style.display = 'none'; }
    toParent({ t: 'select', info: null });
  }

  function setPicker(on) {
    pickerOn = !!on;
    document.documentElement.classList.toggle('cms-edit-mode', pickerOn);
    ensureUI();
    if (!pickerOn) {
      hovBox.style.display = 'none';
      hovTag.style.display = 'none';
    }
    return pickerOn;
  }

  document.addEventListener('mousemove', onMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', function (e) {
    if (pickerOn && e.key === 'Escape') clearSel();
  }, true);
  window.addEventListener('resize', function () {
    if (selEl) { place(selBox, selEl); place(selTag, selEl); }
  });



  /* ============================================================ messaging == */
  function toParent(msg) {
    if (!editMode && !(window.parent && window.parent !== window)) return;
    msg.__cms = true;
    try { if (window.parent && window.parent !== window) window.parent.postMessage(msg, '*'); } catch (e) { /* ignore */ }
  }

  function addPlan() {
    var el = selEl || document.body;
    var scope = scopeOf(el);
    var root = scopeRoot(scope) || document.body;
    var isBox = el === document.body || !looksEditable(el) || typeOf(el) === 'container';
    if (isBox) {
      return { scope: scope, parentSel: el === document.body ? '' : selFor(el, root), afterSel: '' };
    }
    var parent = el.parentElement;
    if (!parent || parent === document.body) {
      return { scope: scope, parentSel: selFor(el, root), afterSel: '' };
    }
    return {
      scope: scopeOf(parent),
      parentSel: selFor(parent, scopeRoot(scopeOf(parent)) || document.body),
      afterSel: selFor(el, parent)
    };
  }

  function findByKey(key) {
    if (!key) return null;
    if (key.indexOf('#ins:') === 0) {
      return $('[data-cms-ins="' + key.slice(5) + '"]');
    }
    var parts = splitKey(key);
    return findIn(scopeRoot(parts.scope), parts.sel);
  }

  function iconList() {
    var app = window.App;
    return ICON_NAMES.map(function (n) {
      return { name: n, svg: (app && typeof app.ic === 'function') ? app.ic(n) : '' };
    });
  }

  function handle(type, p) {
    p = p || {};
    switch (type) {
      case 'hello':
        var doc0 = load();
        return {
          editMode: editMode,
          page: pageFile(),
          url: location.pathname + location.search,
          title: (document.title || ''),
          edits: totalEdits(doc0),
          updatedAt: doc0.updatedAt || 0,
          editable: collect().length,
          cloud: cloudEnabled()
        };
      case 'list':
        return collect();
      case 'icons':
        return iconList();
      case 'pick':
        return { on: setPicker(p.on) };
      case 'select':
        var el = findByKey(p.key);
        if (!el) { clearSel(); return null; }
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return selectEl(el);
      case 'scroll':
        var el2 = findByKey(p.key);
        if (!el2) return null;
        el2.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el2.classList.add('cms-flash');
        setTimeout(function () { el2.classList.remove('cms-flash'); }, 1400);
        return selectEl(el2);
      case 'clear':
        clearSel();
        return null;
      case 'reapply':
        var n = reapply(editMode);
        if (selEl && !document.contains(selEl)) clearSel();
        else if (selEl) { place(selBox, selEl); place(selTag, selEl); }
        return { applied: n, sel: selEl ? domState(selEl) : null };
      case 'addPlan':
        return addPlan();
      default:
        return null;
    }
  }

  window.addEventListener('message', function (ev) {
    var d = ev.data;
    if (!d || d.__cms !== true || !d.type) return;
    var out;
    try { out = handle(d.type, d.payload); } catch (e) { out = { error: (e && e.message) || String(e) }; }
    try {
      ev.source.postMessage({ __cms: true, id: d.id, type: d.type, data: out }, '*');
    } catch (e2) { /* ignore */ }
  });



  /* =============================================================== cloud == */
  function cloudEnabled() { return localStorage.getItem(CLOUD_FLAG) === '1'; }
  function setCloud(on) {
    try { localStorage.setItem(CLOUD_FLAG, on ? '1' : '0'); } catch (e) { /* ignore */ }
  }

  function cloudPull() {
    if (!SB_URL || !SB_KEY) return Promise.resolve(null);
    var client = window.SupabaseClient;
    if (client && client.from) {
      return client.from(CLOUD_TABLE).select('payload').eq('id', CLOUD_ROW).maybeSingle()
        .then(function (res) {
          if (res && res.error) return null;
          return (res && res.data && res.data.payload) || null;
        })
        .catch(function () { return null; });
    }
    try {
      return fetch(SB_URL + '/rest/v1/' + CLOUD_TABLE + '?id=eq.' + CLOUD_ROW + '&select=payload', {
        headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
      })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (rows) { return (rows && rows[0] && rows[0].payload) || null; })
        .catch(function () { return null; });
    } catch (e) { return Promise.resolve(null); }
  }

  function cloudPush(doc) {
    var client = window.SupabaseClient;
    if (!client || !client.from) {
      return Promise.resolve({ ok: false, error: 'Supabase client not available on this page.' });
    }
    return client.from(CLOUD_TABLE)
      .upsert({ id: CLOUD_ROW, payload: doc, updated_at: new Date().toISOString() })
      .then(function (res) {
        if (res && res.error) {
          return { ok: false, error: res.error.message || res.error.hint || String(res.error.code || 'error') };
        }
        return { ok: true };
      })
      .catch(function (e) { return { ok: false, error: (e && e.message) || String(e) }; });
  }

  function markFetched() {
    try { localStorage.setItem(CLOUD_FETCH, JSON.stringify({ t: Date.now() })); } catch (e) { /* ignore */ }
  }

  function maybeCloudPull(then) {
    if (!cloudEnabled()) { if (then) then(null); return; }
    var last = 0;
    try { last = (JSON.parse(localStorage.getItem(CLOUD_FETCH) || '{}') || {}).t || 0; } catch (e) { last = 0; }
    if (Date.now() - last < 60000) { if (then) then(null); return; }
    cloudPull().then(function (remote) {
      markFetched();
      if (!remote || !remote.nodes) { if (then) then(null); return; }
      var local = load();
      if ((remote.updatedAt || 0) > (local.updatedAt || 0)) {
        save(remote);
        if (!editMode) applySoon();
      }
      if (then) then(remote);
    });
  }

  /* ================================================================ boot == */
  var busy = false, pendingApply = false, applies = 0, obs = null;

  function applySoon() {
    if (busy) { pendingApply = true; return; }
    clearTimeout(applySoon._t);
    applySoon._t = setTimeout(function () {
      busy = true;
      try { reapply(editMode); } catch (e) { /* keep the page alive */ }
      busy = false;
      if (selEl && !document.contains(selEl)) clearSel();
      if (pendingApply) { pendingApply = false; applySoon(); }
    }, 110);
  }

  function isOurs(node) {
    return !node || (node.nodeType === 1 && node.hasAttribute && node.hasAttribute('data-cms-ins'));
  }

  function watch() {
    if (obs || !window.MutationObserver || !document.body) return;
    obs = new MutationObserver(function (records) {
      if (busy || applies > 300) return;
      var interesting = false;
      records.forEach(function (r) {
        if (r.type !== 'childList') return;
        var add = [].slice.call(r.addedNodes || []), rem = [].slice.call(r.removedNodes || []);
        var allOurs = add.every(isOurs) && rem.every(isOurs) && (add.length + rem.length) > 0;
        if (!allOurs) interesting = true;
      });
      if (interesting) { applies++; applySoon(); }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  /* The picker stylesheet is only needed while editing, so visitors never pay
     for it — it is injected the moment a page opens in the editor. */
  function injectCss() {
    if ($('#cmsCss')) return;
    var l = document.createElement('link');
    l.id = 'cmsCss';
    l.rel = 'stylesheet';
    l.href = 'plugins/cms/content-cms.css?v=1';
    document.head.appendChild(l);
  }

  /* Apply saved content as early as possible, then again once every asset and
     the injected shell (header/footer) are in place. */
  function boot() {
    busy = true;
    try { reapply(editMode); } catch (e) { /* ignore */ }
    busy = false;
    watch();
    if (editMode) {
      injectCss();
      setPicker(true);
      toParent({ t: 'ready', page: pageFile(), url: location.pathname + location.search });
    }
    maybeCloudPull(function () {
      if (selEl) { place(selBox, selEl); place(selTag, selEl); }
    });
    setTimeout(applySoon, 400);
    setTimeout(applySoon, 1600);
  }

  window.addEventListener('load', function () { setTimeout(applySoon, 60); });
  window.addEventListener('storage', function (ev) {
    if (ev && ev.key === STORE_KEY) applySoon();
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* ================================================================ api === */
  window.ContentCMS = {
    STORE_KEY: STORE_KEY,
    CLOUD_TABLE: CLOUD_TABLE,
    PAGES: PAGES,
    ICON_NAMES: ICON_NAMES,
    BUTTON_STYLES: BUTTON_STYLES,
    editMode: editMode,
    pageFile: pageFile,
    load: load,
    save: save,
    blank: blank,
    totalEdits: totalEdits,
    scopeEdits: scopeEdits,
    resetScope: resetScope,
    resetAll: resetAll,
    docSize: docSize,
    reapply: reapply,
    cloudEnabled: cloudEnabled,
    setCloud: setCloud,
    cloudPull: cloudPull,
    cloudPush: cloudPush,
    markFetched: markFetched,
    insId: insId,
    insertTypes: ['heading', 'text', 'button', 'icon', 'image', 'spacer']
  };
})();
