/* ==========================================================================
   admin.js — Shanmuga Organics Admin Dashboard
   Fully functional SPA with dashboard, products, orders, customers,
   coupons, banners, reviews, reports, and settings management.
   ========================================================================== */
(function () {
  'use strict';

  var SITE = window.SITE;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var money = function (n) { return '₹' + Number(n).toLocaleString('en-IN'); };

  /* ---------------------------------------------------------------- storage */
  var AK = {
    orders: 'so_admin_orders_v1',
    customers: 'so_admin_customers_v1',
    coupons: 'so_admin_coupons_v1',
    banners: 'so_admin_banners_v1',
    reviews: 'so_admin_reviews_v1',
    settings: 'so_admin_settings_v1',
    products: 'so_admin_products_v1',
    categories: 'so_admin_categories_v1',
    deletedCategories: 'so_admin_deleted_categories_v1'
  };
  function read(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { toast('⚠️ Storage full! Try using a smaller image or clear data in Settings.', 'error'); return false; } }

  /* --------------------------------------------------------- seed demo data */
  function seedOrders() {
    var existing = read(AK.orders, null);
    /* Force re-seed if orders don't have productItems yet */
    if (existing && existing.length && existing[0].productItems) return existing;
    /* Clear old cache */
    localStorage.removeItem(AK.orders);

    var names = ['Karthik S.', 'Meena R.', 'Suresh Kumar', 'Lavanya V.', 'Arun Prakash', 'Divya M.', 'Rajan K.', 'Priya S.', 'Ganesh R.', 'Nithya L.', 'Senthil P.', 'Uma D.'];
    var emails = ['karthiks', 'meenar', 'sureshkumar', 'lavanyav', 'arunprakash', 'divyam', 'rajank', 'priyas', 'ganeshr', 'nithyal', 'senthilp', 'umad'];
    var statuses = ['Delivered', 'Shipped', 'Processing', 'Delivered', 'Shipped', 'Processing', 'Cancelled', 'Delivered', 'Delivered', 'Shipped', 'Returned', 'Processing'];

    /* Use SITE products if available, else fall back to a built-in list */
    var catalog = (SITE && SITE.products && SITE.products.length)
      ? SITE.products.map(function (p) {
        return { name: p.name, price: p.price || p.mrp || Math.round(300 + Math.random() * 800) };
      })
      : [
        { name: 'Groundnut Oil 1L', price: 320 },
        { name: 'Sesame Oil 500ml', price: 280 },
        { name: 'Coconut Oil 1L', price: 350 },
        { name: 'Cold-pressed Mustard Oil', price: 299 },
        { name: 'Mappillai Samba Rice 1kg', price: 180 },
        { name: 'Health Mix Powder', price: 250 },
        { name: 'Herbal Bath Soap', price: 120 },
        { name: 'Turmeric Powder 100g', price: 95 },
        { name: 'Ragi Flour 1kg', price: 160 },
        { name: 'Mango Pickle 300g', price: 145 }
      ];

    var orders = [];
    for (var i = 0; i < 40; i++) {
      var d = new Date(); d.setDate(d.getDate() - Math.floor(Math.random() * 30));
      var numItems = Math.floor(1 + Math.random() * 4);
      /* Pick unique products for this order */
      var shuffled = catalog.slice().sort(function () { return Math.random() - 0.5; });
      var productItems = shuffled.slice(0, numItems).map(function (p) {
        var qty = Math.floor(1 + Math.random() * 3);
        return { name: p.name, qty: qty, price: p.price, total: p.price * qty };
      });
      var amount = productItems.reduce(function (s, pi) { return s + pi.total; }, 0);
      var ei = i % emails.length;
      orders.push({
        id: '#ORD' + (1250 - i),
        customer: names[i % names.length],
        email: emails[ei] + '@gmail.com',
        date: d.toISOString().slice(0, 10),
        amount: amount,
        status: statuses[i % statuses.length],
        items: numItems,
        productItems: productItems,
        phone: '+91 ' + (6380040000 + i)
      });
    }
    write(AK.orders, orders);
    return orders;
  }

  function seedCustomers() {
    var existing = read(AK.customers, null);
    /* Re-seed if no address field yet */
    if (existing && existing.length && existing[0].address) return existing;
    localStorage.removeItem(AK.customers);
    var custs = [
      {
        id: 'C001', name: 'Karthik Subramanian', email: 'karthik.s@gmail.com', phone: '+91 9876543210', city: 'Erode', orders: 12, total: 14520, joined: '2024-08-15',
        address: { door: '12/3', street: 'Gandhi Nagar 2nd Cross', area: 'Perundurai Road', city: 'Erode', state: 'Tamil Nadu', pin: '638002' }
      },
      {
        id: 'C002', name: 'Meena Rajagopal', email: 'meena.r@gmail.com', phone: '+91 9876543211', city: 'Chennai', orders: 8, total: 9850, joined: '2024-09-20',
        address: { door: '45', street: 'Anna Salai', area: 'Teynampet', city: 'Chennai', state: 'Tamil Nadu', pin: '600018' }
      },
      {
        id: 'C003', name: 'Suresh Kumar', email: 'suresh.k@gmail.com', phone: '+91 9876543212', city: 'Coimbatore', orders: 15, total: 22340, joined: '2024-07-10',
        address: { door: '7B', street: 'Avinashi Road', area: 'Peelamedu', city: 'Coimbatore', state: 'Tamil Nadu', pin: '641004' }
      },
      {
        id: 'C004', name: 'Lavanya Venkatesh', email: 'lavanya.v@gmail.com', phone: '+91 9876543213', city: 'Madurai', orders: 6, total: 5670, joined: '2024-11-05',
        address: { door: '21', street: 'KK Nagar Main Road', area: 'KK Nagar', city: 'Madurai', state: 'Tamil Nadu', pin: '625020' }
      },
      {
        id: 'C005', name: 'Arun Prakash', email: 'arun.p@gmail.com', phone: '+91 9876543214', city: 'Salem', orders: 10, total: 12890, joined: '2024-10-18',
        address: { door: '9/2', street: 'Omalur Road', area: 'Ammapet', city: 'Salem', state: 'Tamil Nadu', pin: '636005' }
      },
      {
        id: 'C006', name: 'Divya Moorthy', email: 'divya.m@gmail.com', phone: '+91 9876543215', city: 'Tirupur', orders: 4, total: 3450, joined: '2025-01-12',
        address: { door: '34', street: 'Kumaran Road', area: 'Palladam Road', city: 'Tirupur', state: 'Tamil Nadu', pin: '641604' }
      },
      {
        id: 'C007', name: 'Rajan Krishnan', email: 'rajan.k@gmail.com', phone: '+91 9876543216', city: 'Thanjavur', orders: 7, total: 8920, joined: '2024-12-01',
        address: { door: '6', street: 'Srinivasa Nagar', area: 'Medical College Road', city: 'Thanjavur', state: 'Tamil Nadu', pin: '613005' }
      },
      {
        id: 'C008', name: 'Priya Shankar', email: 'priya.s@gmail.com', phone: '+91 9876543217', city: 'Trichy', orders: 9, total: 11230, joined: '2024-06-22',
        address: { door: '88', street: 'Bharathi Nagar', area: 'Thillai Nagar', city: 'Trichy', state: 'Tamil Nadu', pin: '620018' }
      },
      {
        id: 'C009', name: 'Ganesh Ramamurthy', email: 'ganesh.r@gmail.com', phone: '+91 9876543218', city: 'Erode', orders: 20, total: 34560, joined: '2024-05-10',
        address: { door: '3/5', street: 'Raja Street', area: 'Chithode', city: 'Erode', state: 'Tamil Nadu', pin: '638101' }
      },
      {
        id: 'C010', name: 'Nithya Lakshmi', email: 'nithya.l@gmail.com', phone: '+91 9876543219', city: 'Bangalore', orders: 3, total: 2890, joined: '2025-02-14',
        address: { door: '201', street: '2nd Main', area: 'Indiranagar', city: 'Bengaluru', state: 'Karnataka', pin: '560038' }
      },
      {
        id: 'C011', name: 'Senthil Pandian', email: 'senthil.p@gmail.com', phone: '+91 9876543220', city: 'Namakkal', orders: 11, total: 16780, joined: '2024-09-08',
        address: { door: '15', street: 'Mohanur Road', area: 'Tholipatti', city: 'Namakkal', state: 'Tamil Nadu', pin: '637001' }
      },
      {
        id: 'C012', name: 'Uma Devi', email: 'uma.d@gmail.com', phone: '+91 9876543221', city: 'Karur', orders: 5, total: 4560, joined: '2025-03-20',
        address: { door: '4/1', street: 'Kovai Road', area: 'Jawahar Nagar', city: 'Karur', state: 'Tamil Nadu', pin: '639002' }
      }
    ];
    write(AK.customers, custs);
    return custs;
  }

  function seedCoupons() {
    var existing = read(AK.coupons, null);
    if (existing) return existing;
    var coupons = [
      { id: 'CP01', code: 'WELCOME10', type: 'percent', value: 10, minOrder: 500, maxDiscount: 200, uses: 145, maxUses: 500, active: true, expiry: '2025-12-31' },
      { id: 'CP02', code: 'FLAT50', type: 'flat', value: 50, minOrder: 300, maxDiscount: 50, uses: 89, maxUses: 200, active: true, expiry: '2025-09-30' },
      { id: 'CP03', code: 'OIL15', type: 'percent', value: 15, minOrder: 800, maxDiscount: 300, uses: 67, maxUses: 150, active: true, expiry: '2025-08-31' },
      { id: 'CP04', code: 'DIWALI20', type: 'percent', value: 20, minOrder: 1000, maxDiscount: 500, uses: 212, maxUses: 300, active: false, expiry: '2024-11-15' },
      { id: 'CP05', code: 'FIRST100', type: 'flat', value: 100, minOrder: 600, maxDiscount: 100, uses: 56, maxUses: 100, active: true, expiry: '2025-06-30' }
    ];
    write(AK.coupons, coupons);
    return coupons;
  }

  function seedReviews() {
    var existing = read(AK.reviews, null);
    if (existing) return existing;
    var reviews = [
      { id: 'R01', product: 'Groundnut Oil', customer: 'Karthik S.', rating: 5, text: 'Best quality cold pressed oil! Authentic marachekku taste.', date: '2025-05-15', status: 'approved' },
      { id: 'R02', product: 'Sesame Oil', customer: 'Meena R.', rating: 4, text: 'Very good nallennai. Perfect for oil bath and cooking.', date: '2025-05-14', status: 'approved' },
      { id: 'R03', product: 'Mappillai Samba Rice', customer: 'Suresh K.', rating: 5, text: 'Traditional rice with amazing flavour. My family loves it!', date: '2025-05-13', status: 'approved' },
      { id: 'R04', product: 'Herbal Bath Soap', customer: 'Divya M.', rating: 3, text: 'Good soap but packaging could be better.', date: '2025-05-12', status: 'pending' },
      { id: 'R05', product: 'Health Mix Powder', customer: 'Priya S.', rating: 5, text: 'Excellent sathu maavu for kids. Very nutritious.', date: '2025-05-11', status: 'approved' },
      { id: 'R06', product: 'Coconut Oil', customer: 'Rajan K.', rating: 4, text: 'Pure aroma, good quality. Slightly expensive.', date: '2025-05-10', status: 'pending' },
      { id: 'R07', product: 'Mango Pickle', customer: 'Ganesh R.', rating: 5, text: 'Tastes exactly like homemade. No preservatives. Love it!', date: '2025-05-09', status: 'approved' },
      { id: 'R08', product: 'Ragi Flour', customer: 'Uma D.', rating: 2, text: 'Received expired product. Need replacement.', date: '2025-05-08', status: 'flagged' }
    ];
    write(AK.reviews, reviews);
    return reviews;
  }

  function seedBanners() {
    var existing = read(AK.banners, null);
    if (existing) return existing;
    var banners = [
      { id: 'B01', title: 'Cold Pressed Oils', link: 'products.html?cat=cold-pressed-oils', image: 'assets/img/scenes/hero-slide-1.jpg', position: 'hero', active: true, order: 1 },
      { id: 'B02', title: 'Heritage Rice', link: 'products.html?cat=traditional-rice', image: 'assets/img/scenes/hero-slide-2.jpg', position: 'hero', active: true, order: 2 },
      { id: 'B03', title: 'Bath & Body Care', link: 'products.html?cat=bath-body-care', image: 'assets/img/scenes/hero-slide-3.jpg', position: 'hero', active: true, order: 3 },
      { id: 'B04', title: 'Pickles & Powders', link: 'products.html?cat=pickles-powders', image: 'assets/img/scenes/hero-slide-4.jpg', position: 'hero', active: true, order: 4 },
      { id: 'B05', title: 'Health Mix', link: 'products.html?cat=health-mix', image: 'assets/img/scenes/hero-slide-5.jpg', position: 'hero', active: true, order: 5 }
    ];
    write(AK.banners, banners);
    return banners;
  }

  /* ------------------------------------------------------------ data access */
  var data = {
    orders: seedOrders,
    customers: seedCustomers,
    coupons: seedCoupons,
    reviews: seedReviews,
    banners: seedBanners,
    products: function () {
      var custom = read(AK.products, []);
      var base = SITE ? SITE.products : [];
      // Custom products first (newest on top), then catalog
      // Deduplicate: if a custom product overrides a catalog one (same slug), keep only custom
      var customSlugs = {};
      custom.forEach(function (p) { customSlugs[p.slug] = true; });
      var filtered = base.filter(function (p) { return !customSlugs[p.slug]; });
      // Reverse custom so newest additions appear first
      return custom.slice().reverse().concat(filtered);
    }
  };

  /* ============================================================ NAVIGATION */
  var sidebar = $('#sidebar');
  var overlay = $('#sidebarOverlay');
  var toggle = $('#toggleSidebar');
  var pageTitle = $('#pageTitle');
  var content = $('#pageContent');
  var dateText = $('#dateText');

  /* ========================================================= DATE PICKER */
  function fmtDate(d) {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function fmtDateISO(d) {
    return d.toISOString().slice(0, 10);
  }

  var datePicker = (function () {
    var rangeStart = null, rangeEnd = null;
    var _ready = false;  /* prevents re-render during init */
    var panel = $('#datePickPanel');
    var btn = $('#dateRange');
    var wrap = $('#datePickWrap');
    var custRow = $('#dateCustomRow');
    var fromIn = $('#dateFrom');
    var toIn = $('#dateTo');

    function setRange(from, to) {
      rangeStart = from; rangeEnd = to;
      if (dateText) dateText.textContent = fmtDate(from) + ' – ' + fmtDate(to);
      /* Re-render dashboard if already initialised */
      if (_ready) renderDashboard();
    }

    function applyPreset(p) {
      var t = new Date(); t.setHours(23, 59, 59, 999);
      var f = new Date(); f.setHours(0, 0, 0, 0);
      if (p === '0') { /* today */ }
      else if (p === 'month') { f = new Date(f.getFullYear(), f.getMonth(), 1); }
      else { f.setDate(f.getDate() - parseInt(p, 10)); }
      setRange(f, t);
      $$('.tr-preset').forEach(function (b) {
        b.classList.toggle('is-active', b.getAttribute('data-preset') === p);
      });
    }

    /* Init with last 7 days — _ready stays false so no premature re-render */
    applyPreset('7');
    _ready = true;   /* from here, setRange will trigger renderDashboard */

    /* Toggle panel */
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = panel.classList.toggle('is-open');
      btn.classList.toggle('is-open', open);
    });

    /* Preset clicks */
    $$('.tr-preset').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = b.getAttribute('data-preset');
        if (p === 'custom') {
          $$('.tr-preset').forEach(function (x) { x.classList.remove('is-active'); });
          b.classList.add('is-active');
          custRow.style.display = 'flex';
          fromIn.value = rangeStart ? fmtDateISO(rangeStart) : '';
          toIn.value = rangeEnd ? fmtDateISO(rangeEnd) : '';
        } else {
          custRow.style.display = 'none';
          applyPreset(p);
          panel.classList.remove('is-open');
          btn.classList.remove('is-open');
        }
      });
    });

    /* Apply custom date */
    var applyBtn = $('#applyCustomDate');
    if (applyBtn) applyBtn.addEventListener('click', function () {
      var f = fromIn.value, t2 = toIn.value;
      if (!f || !t2) { toast('Please select both dates', 'warn'); return; }
      var fd = new Date(f), td = new Date(t2);
      if (fd > td) { toast('Start date must be before end date', 'warn'); return; }
      setRange(fd, td);
      panel.classList.remove('is-open');
      btn.classList.remove('is-open');
    });

    /* Close on outside click */
    document.addEventListener('click', function (e) {
      if (wrap && !wrap.contains(e.target)) {
        panel.classList.remove('is-open');
        btn.classList.remove('is-open');
      }
    });

    return { getRange: function () { return { start: rangeStart, end: rangeEnd }; } };
  })();

  /* ======================================================== NOTIFICATIONS */
  var Notif = (function () {
    var NKEY = 'so_admin_notif_v2'; /* v2: drops old fake demo notifications */
    var panel = $('#notifPanel');
    var notifBtn = $('#notifBtn');
    var wrap = $('#notifWrap');
    var badge = $('#notifBadge');
    var list = $('#notifList');

    function load() {
      try {
        var saved = JSON.parse(localStorage.getItem(NKEY));
        return Array.isArray(saved) ? saved : defaultNotifs();
      } catch (e) { return defaultNotifs(); }
    }
    function save(items) { localStorage.setItem(NKEY, JSON.stringify(items)); }

    function defaultNotifs() {
      /* No fake seed data — the bell only shows REAL orders, pushed live by
         pollNewOrders() when an order actually arrives from Supabase. */
      return [];
    }

    var items = load();

    function timeAgo(ts) {
      var diff = Math.floor((Date.now() - ts) / 1000);
      if (diff < 60) return 'Just now';
      if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
      if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
      return Math.floor(diff / 86400) + 'd ago';
    }

    function icon(type) {
      var icons = {
        order: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2.5h12v19l-3-1.8-3 1.8-3-1.8-3 1.8z"/><path d="M9 8h6M9 12h6"/></svg>',
        review: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5 6.1 20.6l1.2-6.5L2.5 9.5l6.6-.9z"/></svg>',
        stock: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>',
        system: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>'
      };
      return icons[type] || icons.system;
    }

    function render() {
      var unread = items.filter(function (n) { return n.unread; }).length;
      if (badge) {
        badge.textContent = unread;
        badge.style.display = unread > 0 ? 'grid' : 'none';
      }
      if (!list) return;
      if (items.length === 0) { list.innerHTML = ''; return; }
      list.innerHTML = items.map(function (n) {
        return '<div class="notif-item' + (n.unread ? ' is-unread' : '') + '" data-notif-id="' + n.id + '">' +
          '<div class="notif-item__icon notif-item__icon--' + n.type + '">' + icon(n.type) + '</div>' +
          '<div class="notif-item__body">' +
          '<div class="notif-item__text">' + n.text + '</div>' +
          '<div class="notif-item__time">' + timeAgo(n.time) + '</div>' +
          '</div></div>';
      }).join('');
    }

    /* Toggle panel */
    if (notifBtn) notifBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      panel.classList.toggle('is-open');
      render();
    });

    /* Close on outside click */
    document.addEventListener('click', function (e) {
      if (wrap && !wrap.contains(e.target)) {
        panel.classList.remove('is-open');
      }
    });

    /* Click notif item → mark as read */
    if (list) list.addEventListener('click', function (e) {
      var item = e.target.closest('.notif-item');
      if (!item) return;
      var id = item.getAttribute('data-notif-id');
      items = items.map(function (n) { return n.id === id ? Object.assign({}, n, { unread: false }) : n; });
      save(items); render();
    });

    /* Mark all read */
    var markAll = $('#markAllRead');
    if (markAll) markAll.addEventListener('click', function () {
      items = items.map(function (n) { return Object.assign({}, n, { unread: false }); });
      save(items); render();
    });

    /* Clear all */
    var clearAll = $('#clearAllNotif');
    if (clearAll) clearAll.addEventListener('click', function () {
      items = []; save(items); render();
    });

    /* View all orders link */
    var viewAll = $('#viewAllOrders');
    if (viewAll) viewAll.addEventListener('click', function () {
      panel.classList.remove('is-open');
      navigate('orders');
      $$('.nav-link[data-page]', sidebar).forEach(function (n) {
        n.classList.toggle('is-active', n.getAttribute('data-page') === 'orders');
      });
    });

    /* Public: push a new notification */
    function push(type, text) {
      var n = { id: 'n' + Date.now(), type: type, text: text, time: Date.now(), unread: true };
      items.unshift(n);
      if (items.length > 20) items = items.slice(0, 20);
      save(items); render();
      /* Flash bell */
      if (notifBtn) { notifBtn.classList.add('notif-ring'); setTimeout(function () { notifBtn.classList.remove('notif-ring'); }, 600); }
    }

    render();
    return { push: push };
  })();

  // Sidebar toggle
  if (toggle) toggle.addEventListener('click', function () {
    sidebar.classList.toggle('is-open');
    overlay.classList.toggle('is-open');
  });
  if (overlay) overlay.addEventListener('click', function () {
    sidebar.classList.remove('is-open');
    overlay.classList.remove('is-open');
  });

  // Nav click
  var navLinks = $$('.nav-link[data-page]', sidebar);
  navLinks.forEach(function (a) {
    a.addEventListener('click', function () {
      navLinks.forEach(function (n) { n.classList.remove('is-active'); });
      a.classList.add('is-active');
      navigate(a.getAttribute('data-page'));
      sidebar.classList.remove('is-open');
      overlay.classList.remove('is-open');
    });
  });

  function navigate(page) {
    if (page !== 'payments' && typeof paymentLoadId === 'number') paymentLoadId++;
    var titles = {
      dashboard: 'Dashboard', products: 'Products', categories: 'Categories',
      orders: 'Orders', payments: 'Payment Gateway', customers: 'Customers', reviews: 'Reviews',
      coupons: 'Coupons', banners: 'Banners', reports: 'Reports', settings: 'Settings'
    };
    pageTitle.textContent = titles[page] || 'Dashboard';
    var renderers = {
      dashboard: renderDashboard, products: renderProducts, categories: renderCategories,
      orders: renderOrders, payments: renderPayments, customers: renderCustomers, reviews: renderReviews,
      coupons: renderCoupons, banners: renderBanners, reports: renderReports, settings: renderSettings
    };
    (renderers[page] || renderDashboard)();
    window.scrollTo(0, 0);
  }

  function demoAdminRequest(action, payload) {
    var client = window.SupabaseClient;
    if (!client) return Promise.reject(new Error('Supabase unavailable'));
    return client.auth.getSession().then(function (result) {
      var token = result.data && result.data.session && result.data.session.access_token;
      if (!token) throw new Error('Sign in as an approved admin.');
      var local = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(location.origin);
      var config = local ? window.__soSupabaseConfig : { url: client.supabaseUrl, publicKey: client.supabaseKey };
      if (!config || !config.publicKey || local && !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(config.url) ||
          !local && !/^https:\/\/[^/]+\.supabase\.co$/.test(config.url))
        throw new Error(local ? 'Local Supabase is not configured. Start Docker Supabase and the local preview server.' : 'Supabase is not configured.');
      return fetch(config.url + '/functions/v1/demo-payment-kit/' + action, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token,
          apikey: config.publicKey }, body: JSON.stringify(payload || {})
      }).catch(function () {
        throw new Error('Cannot reach the admin backend. Check your connection and browser Network tab; if the DEMO function is not deployed, validate it on staging first.');
      });
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (res.status === 404) throw new Error('Admin backend not deployed. Validate the DEMO migration and function on staging before enabling admin access.');
        if (!res.ok) throw new Error(body.error || 'Admin backend unavailable (HTTP ' + res.status + ').');
        return body;
      });
    });
  }

  /* ============================================================ TOAST */
  function toast(msg, type) {
    var old = $('.toast'); if (old) old.remove();
    var t = document.createElement('div');
    t.className = 'toast' + (type === 'error' ? ' error' : type === 'warn' ? ' warn' : '');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('is-show'); }, 10);
    setTimeout(function () { t.classList.remove('is-show'); setTimeout(function () { t.remove(); }, 300); }, 3000);
  }

  /* ============================================================ MODAL */
  function openModal(title, bodyHTML, onSave, saveLabel) {
    var old = $('.modal-overlay'); if (old) old.remove();
    var wrap = document.createElement('div');
    wrap.className = 'modal-overlay is-open';
    var btnLabel = saveLabel || 'Save';
    var btnClass = (btnLabel === 'Delete') ? 'btn-sm btn-sm--danger' : 'btn-sm btn-sm--primary';
    wrap.innerHTML =
      '<div class="modal">' +
      '<div class="modal__head"><h3>' + title + '</h3>' +
      '<button class="modal__close" data-close>&times;</button></div>' +
      '<div class="modal__body">' + bodyHTML + '</div>' +
      (onSave ? '<div class="modal__foot">' +
        '<button class="btn-sm" data-close>Cancel</button>' +
        '<button class="' + btnClass + '" data-save>' + btnLabel + '</button>' +
        '</div>' : '') +
      '</div>';
    document.body.appendChild(wrap);
    wrap.querySelectorAll('[data-close]').forEach(function (b) {
      b.addEventListener('click', function () { wrap.remove(); });
    });
    wrap.addEventListener('click', function (e) { if (e.target === wrap) wrap.remove(); });
    if (onSave) {
      wrap.querySelector('[data-save]').addEventListener('click', function () {
        var result = onSave(wrap);
        if (result !== false) wrap.remove();
      });
    }
    return wrap;
  }


  /* ============================================================ DASHBOARD */
  var dashboardRequestId = 0;
  function fetchCustomerCount() {
    return demoAdminRequest('admin-customers').then(function (res) {
        return Array.isArray(res.customers) ? res.customers.length : null;
      })
      .catch(function () { return null; });
  }

  function renderDashboard() {
    /* Only backend-authorized orders and customer counts; never seeded demo revenue. */
    var dashboardLoadId = ++dashboardRequestId;
    content.innerHTML = '<p role="status">Loading dashboard from the admin backend…</p>';
    Promise.all([fetchSupabaseOrders(), fetchCustomerCount()]).then(function (results) {
      if (pageTitle.textContent !== 'Dashboard' || dashboardLoadId !== dashboardRequestId || document.getElementById('adminGate')?.style.display !== 'none') return;
      var result = results[0];
      var customerCount = results[1];
      var banner = '';
      var allOrders;

      if (result && !result.failed) {
        allOrders = result.orders || [];
        if (!allOrders.length) {
          banner =
            '<div style="background:#eef6fb;border:1px solid #bcd9ec;color:#1c5d8c;border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:13px">' +
             'ℹ️ Connected to Supabase — no real orders were returned. Demo attempts are shown only under Payment Gateway — DEMO.' +
            '</div>';
        }
      } else {
        allOrders = [];
        banner =
          '<div style="background:#fff7e6;border:1px solid #f5c66b;color:#8a6100;border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:13px">' +
          '⚠️ <b>Admin backend unavailable</b> — no orders are displayed. Reason: ' + escHtml((result && result.message) || 'unknown') +
          '</div>';
      }
      if (customerCount == null) banner += '<p class="small muted">Customer count unavailable (admin customer API did not respond).</p>';
      renderDashboardWithData(allOrders, banner, customerCount);
    });
  }

  function renderDashboardWithData(allOrders, bannerHtml, customerCount) {
    var products = data.products();

    /* ── filter by selected date range ──────────────────── */
    var range = datePicker.getRange();
    var rs = range.start, re = range.end;
    var orders = rs && re
      ? allOrders.filter(function (o) {
        var d = new Date(o.date);
        return d >= rs && d <= re;
      })
      : allOrders;

    /* ── previous period (same span) for % change ────────── */
    var prevOrders = [];
    if (rs && re) {
      var span = re.getTime() - rs.getTime();
      var prevEnd = new Date(rs.getTime() - 1);
      var prevStart = new Date(prevEnd.getTime() - span);
      prevOrders = allOrders.filter(function (o) {
        var d = new Date(o.date);
        return d >= prevStart && d <= prevEnd;
      });
    }

    function pct(curr, prev) {
      if (!prev) return curr > 0 ? '+100%' : '+0.0%';
      var ch = ((curr - prev) / prev * 100).toFixed(1);
      return (ch >= 0 ? '+' : '') + ch + '%';
    }
    function dir(curr, prev) { return curr >= prev ? 'up' : 'down'; }

    var totalSales = orders.reduce(function (s, o) { return s + o.amount; }, 0);
    var prevSales = prevOrders.reduce(function (s, o) { return s + o.amount; }, 0);
    var delivered = orders.filter(function (o) { return o.status === 'Delivered'; }).length;
    var shipped = orders.filter(function (o) { return o.status === 'Shipped'; }).length;
    var processing = orders.filter(function (o) { return o.status === 'Processing'; }).length;
    var cancelled = orders.filter(function (o) { return o.status === 'Cancelled'; }).length;
    var returned = orders.filter(function (o) { return o.status === 'Returned'; }).length;

    content.innerHTML =
      (bannerHtml || '') +
      '<div class="welcome"><h2>Vanakkam! Welcome back, Admin. 🌿</h2>' +
      '<p>Here\'s what\'s happening with your store today.</p></div>' +

      '<div class="stats-grid">' +
      statCard('Recent real orders (max 200)', orders.length, pct(orders.length, prevOrders.length), dir(orders.length, prevOrders.length), 'orders') +
      statCard('Customers (first 200)', customerCount != null ? customerCount : '—', null, 'up', 'customers') +
      statCard('Products (local catalog)', products.length, null, 'up', 'products') +
      statCard('Recent order value (not revenue)', money(totalSales), pct(totalSales, prevSales), dir(totalSales, prevSales), 'sales') +
      '</div>' +

      '<div class="charts-row">' +
      '<div class="card">' +
      '<div class="card__head"><h3>Recent real order value (not verified revenue)</h3><div class="card__head-actions">' +
      '<button class="btn-sm" data-export>📊 Export</button></div></div>' +
      '<div class="card__body"><div class="chart-wrap"><canvas id="salesChart"></canvas></div></div>' +
      '</div>' +
      '<div class="card">' +
      '<div class="card__head"><h3>Top Selling Products</h3></div>' +
      '<div class="card__body" id="topProducts"></div>' +
      '<a class="view-all-link" data-page="products" style="cursor:pointer">View All Products →</a>' +
      '</div>' +
      '</div>' +

      '<div class="bottom-row">' +
      '<div class="card">' +
      '<div class="card__head"><h3>Recent Orders' +
      (rs ? ' <span style="font-size:11px;font-weight:400;color:#92a096">(' + orders.length + ' in range)</span>' : '') +
      '</h3>' +
      '<button class="btn-sm" data-page="orders" style="cursor:pointer">View All Orders</button></div>' +
      '<div class="card__body" style="padding:0;overflow-x:auto">' +
      '<table class="admin-table"><thead><tr><th>Order ID</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>' +
      '<tbody>' + (orders.length ? orders.slice(0, 6).map(function (o) {
        return '<tr><td><b>' + o.id + '</b></td><td>' + o.customer + '</td><td>' + formatDate(o.date) + '</td><td>' + money(o.amount) + '</td><td><span class="status status--' + o.status.toLowerCase() + '">' + o.status + '</span></td></tr>';
      }).join('') : '<tr><td colspan="5" style="text-align:center;color:#92a096;padding:24px">No orders in this date range</td></tr>') +
      '</tbody></table></div>' +
      '</div>' +
      '<div class="card">' +
      '<div class="card__head"><h3>Orders by Status</h3></div>' +
      '<div class="card__body">' +
      '<div class="donut-wrap">' +
      '<div class="donut-canvas"><canvas id="donutChart"></canvas></div>' +
      '<div class="donut-legend">' +
      donutLegend('Delivered', '#16a34a', delivered) +
      donutLegend('Processing', '#f59e0b', processing) +
      donutLegend('Shipped', '#3b82f6', shipped) +
      donutLegend('Cancelled', '#ef4444', cancelled) +
      donutLegend('Returned', '#8b5cf6', returned) +
      '</div>' +
      '</div>' +
      '</div>' +
      '<a class="view-all-link" data-page="reports" style="cursor:pointer">View Full Report →</a>' +
      '</div>' +
      '</div>';

    /* bind nav links inside content */
    $$('[data-page]', content).forEach(function (a) {
      a.addEventListener('click', function () {
        var pg = a.getAttribute('data-page');
        navLinks.forEach(function (n) { n.classList.remove('is-active'); });
        var target = $$('.nav-link[data-page="' + pg + '"]', sidebar)[0];
        if (target) target.classList.add('is-active');
        navigate(pg);
      });
    });

    var exportBtn = $('[data-export]', content);
    if (exportBtn) exportBtn.addEventListener('click', function () {
      /* Build CSV from currently filtered orders */
      var rows = [['Order ID', 'Customer', 'Date', 'Amount (INR)', 'Status']];
      orders.forEach(function (o) {
        rows.push([o.id, o.customer, o.date, o.amount, o.status]);
      });
      var csv = rows.map(function (r) {
        return r.map(function (cell) {
          var s = String(cell == null ? '' : cell).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
          if (/^[\s\u0000-\u001f]*[=+@\-]/.test(s)) s = "'" + s;
          /* Quote cells that contain commas, quotes, or newlines */
          if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
          return s;
        }).join(',');
      }).join('\n');

      /* Add BOM for Excel UTF-8 compatibility */
      var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      var fromStr = rs ? rs.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/ /g, '-') : 'all';
      var toStr = re ? re.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/ /g, '-') : 'all';
      a.href = url;
      a.download = 'shanmugi_report_' + fromStr + '_to_' + toStr + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('Report downloaded — ' + orders.length + ' orders exported ✓');
    });


    renderTopProducts(orders);
    drawSalesChart(orders, rs, re);
    drawDonutChart(delivered, processing, shipped, cancelled, returned);
  }

  function statCard(label, val, trend, dir, type) {
    var icons = {
      orders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2.5h12v19l-3-1.8-3 1.8-3-1.8-3 1.8z"/><path d="M9 8h6M9 12h6"/></svg>',
      customers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8.5" r="3.5"/><path d="M2.8 20a6.4 6.4 0 0112.4 0"/><path d="M16.5 5.4a3.5 3.5 0 010 6.6"/></svg>',
      products: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M12 12V21M3 7.5l9 4.5 9-4.5"/></svg>',
      sales: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>'
    };
    return '<div class="stat-card">' +
      '<div class="stat-card__head"><div class="stat-card__icon stat-card__icon--' + type + '">' + icons[type] + '</div>' +
      '<span class="stat-card__label">' + label + '</span></div>' +
      '<div class="stat-card__val">' + val + '</div>' +
      (trend == null ? '' : '<div class="stat-card__trend ' + dir + '">' +
      (dir === 'up' ? '↑' : '↓') + ' ' + trend +
      '<span class="stat-card__sub"> vs last period</span>' +
      '</div>') + '</div>';
  }

  function donutLegend(label, color, count) {
    return '<div class="donut-legend__item"><span class="donut-legend__dot" style="background:' + color + '"></span>' +
      '<span>' + label + '</span><span class="donut-legend__count">' + count + '</span></div>';
  }

  function renderTopProducts(orders) {
    var container = $('#topProducts');
    if (!container || !SITE) return;

    /* Aggregate REAL sales from the order items in the selected range */
    var totals = {};   // product name → { qty }
    (orders || []).forEach(function (o) {
      (o.productItems || []).forEach(function (pi) {
        var name = pi.name || 'Product';
        if (!totals[name]) totals[name] = { qty: 0 };
        totals[name].qty += Number(pi.qty) || 0;
      });
    });
    var names = Object.keys(totals).sort(function (a, b) {
      return totals[b].qty - totals[a].qty;
    }).slice(0, 5);

    if (!names.length) {
      container.innerHTML = '<p class="small muted" style="padding:14px">No product sales in this period yet. Your best sellers will appear here as orders come in.</p>';
      return;
    }

    var maxQty = totals[names[0]].qty || 1;
    container.innerHTML = names.map(function (name) {
      var t = totals[name];
      var p = SITE.products.filter(function (pp) { return pp.name === name; })[0];
      var img = (p && p.img) || '';
      var unit = (p && p.unit) || '';
      var share = Math.round(t.qty / maxQty * 100);
      return '<div class="top-product">' +
        '<div class="top-product__img">' + (img ? '<img src="' + img + '" alt="' + escHtml(name) + '" onerror="this.style.display=\'none\'">' : '') + '</div>' +
        '<div class="top-product__info"><div class="top-product__name">' + escHtml(name) + '</div>' +
        '<div class="top-product__sub">' + escHtml(unit) + '</div></div>' +
        '<div><div class="top-product__count">' + t.qty.toLocaleString() + ' sold</div>' +
        '<div class="top-product__growth">' + share + '% of top seller</div></div></div>';
    }).join('');
  }

  /* ============================================================ CHARTS */
  function drawSalesChart(filteredOrders, rangeStart, rangeEnd) {
    var canvas = $('#salesChart');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.parentElement.offsetWidth;
    var H = 280;
    canvas.width = W * 2; canvas.height = H * 2;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.scale(2, 2);

    var vals = [], labels = [];

    if (rangeStart && rangeEnd) {
      /* Build day-by-day totals across the range */
      var orders = filteredOrders || [];
      var cur = new Date(rangeStart); cur.setHours(0, 0, 0, 0);
      var end = new Date(rangeEnd); end.setHours(23, 59, 59, 999);
      var maxDays = 60, dayCount = 0;
      while (cur <= end && dayCount < maxDays) {
        var dayStr = cur.toISOString().slice(0, 10);
        labels.push(cur.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
        var dayTotal = orders.reduce(function (s, o) {
          return (o.date && o.date.slice(0, 10) === dayStr) ? s + o.amount : s;
        }, 0);
        /* REAL totals — zero days stay zero (no fake baseline) */
        vals.push(dayTotal);
        cur.setDate(cur.getDate() + 1);
        dayCount++;
      }
      /* Collapse to ≤12 points for wide ranges */
      if (vals.length > 12) {
        var step = Math.ceil(vals.length / 12);
        var nv = [], nl = [];
        for (var k = 0; k < vals.length; k += step) {
          nv.push(vals.slice(k, k + step).reduce(function (a, b) { return a + b; }, 0));
          nl.push(labels[k]);
        }
        vals = nv; labels = nl;
      }
    } else {
      /* Default: last 7 days demo */
      vals = [28400, 35200, 42100, 58700, 67300, 85420, 72800];
      for (var i = 6; i >= 0; i--) {
        var d = new Date(); d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
      }
    }

    /* A single-day range still draws a line (duplicated point) */
    if (vals.length === 1) { vals.push(vals[0]); labels.push(labels[0]); }
    if (vals.length < 2) {
      ctx.fillStyle = '#92a096'; ctx.font = '13px Inter'; ctx.textAlign = 'center';
      ctx.fillText('No data for this period', W / 2, H / 2);
      return;
    }

    var max = Math.max.apply(null, vals) * 1.2;
    if (max <= 0) max = 1000;   /* all-zero period still renders axes */
    var padL = 65, padR = 20, padT = 20, padB = 40;
    var cW = W - padL - padR, cH = H - padT - padB;

    // Grid
    ctx.strokeStyle = '#f0f2ee'; ctx.lineWidth = 0.5;
    for (var g = 0; g <= 4; g++) {
      var gy = padT + cH * (1 - g / 4);
      ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(W - padR, gy); ctx.stroke();
      ctx.fillStyle = '#92a096'; ctx.font = '11px Inter'; ctx.textAlign = 'right';
      ctx.fillText(money(Math.round(max * g / 4)), padL - 10, gy + 4);
    }

    // X labels
    ctx.fillStyle = '#92a096'; ctx.font = '11px Inter'; ctx.textAlign = 'center';
    labels.forEach(function (l, i) {
      ctx.fillText(l, padL + cW * i / (labels.length - 1), H - 10);
    });

    // Line
    ctx.beginPath(); ctx.strokeStyle = '#2f8f43'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    var pts = vals.map(function (v, i) {
      return { x: padL + cW * i / (vals.length - 1), y: padT + cH * (1 - v / max) };
    });
    pts.forEach(function (p, i) { i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); });
    ctx.stroke();

    // Gradient fill
    var grad = ctx.createLinearGradient(0, padT, 0, H - padB);
    grad.addColorStop(0, 'rgba(47,143,67,.15)'); grad.addColorStop(1, 'rgba(47,143,67,0)');
    ctx.lineTo(pts[pts.length - 1].x, H - padB); ctx.lineTo(pts[0].x, H - padB);
    ctx.fillStyle = grad; ctx.fill();

    // Dots
    pts.forEach(function (p) {
      ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.strokeStyle = '#2f8f43'; ctx.lineWidth = 2.5; ctx.stroke();
    });

    // Tooltip on last point
    var last = pts[pts.length - 1];
    ctx.fillStyle = '#1a3d23'; ctx.font = 'bold 12px Inter';
    var tip = labels[labels.length - 1] + '  ' + money(vals[vals.length - 1]);
    var tw = ctx.measureText(tip).width + 20;
    drawRoundRect(ctx, last.x - tw / 2, last.y - 38, tw, 26, 6);
    ctx.fillStyle = '#1a3d23'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText(tip, last.x, last.y - 22);
  }

  function drawRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawDonutChart(del, proc, ship, canc, ret) {
    var canvas = $('#donutChart');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var S = 160;
    canvas.width = S * 2; canvas.height = S * 2;
    canvas.style.width = S + 'px'; canvas.style.height = S + 'px';
    ctx.scale(2, 2);

    var total = del + proc + ship + canc + ret;
    if (total === 0) return;
    var slices = [
      { val: del, color: '#16a34a' },
      { val: proc, color: '#f59e0b' },
      { val: ship, color: '#3b82f6' },
      { val: canc, color: '#ef4444' },
      { val: ret, color: '#8b5cf6' }
    ];
    var cx = S / 2, cy = S / 2, r = 60, inner = 40;
    var start = -Math.PI / 2;
    slices.forEach(function (s) {
      var angle = (s.val / total) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, start + angle);
      ctx.fillStyle = s.color; ctx.fill();
      start += angle;
    });
    // Inner circle
    ctx.beginPath(); ctx.arc(cx, cy, inner, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
    // Center text
    ctx.fillStyle = '#22302a'; ctx.font = 'bold 18px Inter'; ctx.textAlign = 'center';
    ctx.fillText(total, cx, cy + 2);
    ctx.fillStyle = '#92a096'; ctx.font = '10px Inter';
    ctx.fillText('Total', cx, cy + 14);
  }

  /* One image slot — used by getProductFormHTML and by "+ Add Image" */
  function pImageSlotHTML(v) {
    v = v || '';
    return '<div class="p-img-slot">' +
      '<div class="p-img-label" style="font-size:11px;font-weight:600;color:#6f7d72;margin-bottom:4px">Image</div>' +
      '<input type="hidden" class="p-img-value" value="' + v + '">' +
      '<input type="file" class="p-img-file" accept="image/*" style="display:none">' +
      '<div class="p-img-dropzone" style="border:2px dashed #ccd5cc;border-radius:10px;padding:18px 8px;text-align:center;cursor:pointer;transition:border-color .2s,background .2s;' + (v ? 'display:none' : '') + '">' +
      '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#92a096" stroke-width="1.5" style="margin:0 auto 6px;display:block"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 15l5-4 4 3 4-5 5 6"/><circle cx="8.5" cy="9.5" r="1.5"/></svg>' +
      '<div style="font-size:12px;font-weight:600;color:#3f5045">Click / drag &amp; drop</div>' +
      '<div style="font-size:10px;color:#92a096;margin-top:2px">PNG / JPG / WebP up to 5MB<br><b>Best: 1200×1200 px</b> on white</div>' +
      '</div>' +
      '<div class="p-img-preview" style="display:' + (v ? 'block' : 'none') + ';position:relative;border-radius:10px;overflow:hidden;border:1px solid #e2e8e0">' +
      /* white canvas behind the preview — a transparent PNG must never show a page/dark colour */
      '<img class="p-img-thumb" src="' + v + '" style="width:100%;height:110px;object-fit:cover;background:#ffffff;display:block" alt="Preview">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;padding:6px 8px;background:#f8f9f6">' +
      '<span class="p-img-info" style="flex:1;min-width:0;font-size:10px;color:#6f7d72;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Image loaded</span>' +
      '<span style="display:flex;align-items:center;gap:4px;flex:none">' +
      '<button type="button" class="p-img-white" style="font-size:10.5px;font-weight:600;color:#2f8f43;background:#eef7ea;border:1px solid #cfe6c4;border-radius:6px;cursor:pointer;padding:3px 7px;white-space:nowrap" title="Replace a black background with white">White BG</button>' +
      '<button type="button" class="p-img-remove" style="font-size:11px;font-weight:600;color:#dc3545;background:none;border:none;cursor:pointer;padding:2px 4px" title="Remove image">✕</button>' +
      '</span>' +
      '</div></div></div>';
  }

  /* ============================================================ PRODUCTS */
  function getProductFormHTML(p) {
    var cats = SITE ? SITE.categories : [];
    var isEdit = !!p;
    p = p || {};
    /* Image slots — dynamic (like size variants): saved images pre-filled,
       "+ Add Image" appends more, ✕ on a slot removes it */
    var existingImgs = (p.images && p.images.length) ? p.images.filter(Boolean).slice(0, 5) : [];
    if (!existingImgs.length && p.img) existingImgs = [p.img];
    if (!existingImgs.length) existingImgs = [''];
    var imageSlotsHTML = existingImgs.map(function (v) { return pImageSlotHTML(v); }).join('');

    /* Build existing sizes rows for Edit, or one blank row for Add */
    var existingSizes = (p.sizes && p.sizes.length) ? p.sizes : [['', '', '']];
    var sizeRowsHTML =
      '<div style="display:flex;gap:8px;margin-bottom:4px">' +
      '<div style="flex:1;font-size:11px;font-weight:600;color:#6f7d72;text-transform:uppercase">Label</div>' +
      '<div style="flex:1;font-size:11px;font-weight:600;color:#6f7d72;text-transform:uppercase">Price (₹)</div>' +
      '<div style="flex:1;font-size:11px;font-weight:600;color:#6f7d72;text-transform:uppercase">MRP (₹)</div>' +
      '<div style="width:40px"></div>' +
      '</div>' +
      existingSizes.map(function (s) {
        return '<div class="size-row" style="display:flex;gap:8px;align-items:center;margin-bottom:8px">' +
          '<input class="form-control pSizeUnit" placeholder="e.g. 500g" value="' + (s[0] || '') + '" style="flex:1">' +
          '<input class="form-control pSizePrice" type="number" placeholder="e.g. 55" value="' + (s[1] || '') + '" style="flex:1">' +
          '<input class="form-control pSizeMrp" type="number" placeholder="e.g. 63" value="' + (s[2] || '') + '" style="flex:1">' +
          '<button type="button" class="size-row-remove" style="width:32px;flex-shrink:0;background:none;border:1px solid #e2e8e0;border-radius:6px;padding:5px;cursor:pointer;color:#dc3545;font-size:13px;font-weight:700" title="Remove">✕</button>' +
          '</div>';
      }).join('');

    return '<div class="form-group"><label>Product Name *</label><input class="form-control" id="pName" placeholder="e.g. Groundnut Oil" value="' + (p.name || '') + '"></div>' +
      '<div class="form-group"><label>Tamil Name</label><input class="form-control" id="pTa" placeholder="e.g. கடலை எண்ணெய்" value="' + (p.ta || '') + '"></div>' +
      '<div class="form-row">' +
      '<div class="form-group"><label>Category *</label><select class="form-control" id="pCat">' +
      '<option value="">Select category</option>' +
      cats.map(function (c) {
        return '<option value="' + c.slug + '"' + (p.cat === c.slug ? ' selected' : '') + '>' + c.name + '</option>';
      }).join('') +
      '</select></div>' +
      '<div class="form-group"><label>Rating (1-5)</label><input class="form-control" id="pRating" type="number" min="1" max="5" step="0.1" placeholder="4.5" value="' + (p.rating || '') + '"></div>' +
      '</div>' +
      '<div class="form-row">' +
      '<div class="form-group"><label>Badge Label</label><input class="form-control" id="pBadge" placeholder="e.g. Bestseller, New" value="' + (p.badge || '') + '"></div>' +
      '</div>' +
      /* Size Variants */
      '<div class="form-group">' +
      '<label style="display:flex;align-items:center;justify-content:space-between">' +
      '<span>Size Variants * <span style="font-weight:400;font-size:11px;color:#92a096">(label, price &amp; MRP per size)</span></span>' +
      '<button type="button" id="pAddSize" style="font-size:12px;font-weight:600;color:#2f8f43;background:none;border:1px solid #2f8f43;border-radius:6px;padding:3px 10px;cursor:pointer">+ Add Size</button>' +
      '</label>' +
      '<div id="pSizesContainer" style="margin-top:8px">' + sizeRowsHTML + '</div>' +
      '<div style="font-size:11px;color:#92a096;margin-top:4px">e.g. &nbsp;<b>500g</b> ₹55 / MRP ₹63 &nbsp;|&nbsp; <b>1kg</b> ₹100 / MRP ₹115</div>' +
      '</div>' +
      /* Product Images — dynamic add / remove (like size variants) */
      '<div class="form-group">' +
      '<label style="display:flex;align-items:center;justify-content:space-between">' +
      '<span>Product Images <span style="font-weight:400;font-size:11px;color:#92a096">(first one is the main image)</span></span>' +
      '<button type="button" id="pAddImage" style="font-size:12px;font-weight:600;color:#2f8f43;background:none;border:1px solid #2f8f43;border-radius:6px;padding:3px 10px;cursor:pointer">+ Add Image</button>' +
      '</label>' +
      '<div id="pImagesContainer" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:8px">' + imageSlotsHTML + '</div>' +
      '</div>' +
      '<div class="form-group"><label>Description</label><textarea class="form-control" id="pDesc" placeholder="Product description...">' + (p.desc || '') + '</textarea></div>' +
      /* Key Highlights */
      '<div class="form-group"><label style="display:flex;align-items:center;gap:6px"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#2f8f43" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Key Highlights <span style="font-weight:400;font-size:11px;color:#92a096">(shown as tick bullets on product page)</span></label>' +
      '<div style="display:flex;flex-direction:column;gap:6px">' +
      '<input class="form-control" id="pH1" placeholder="e.g. Cold-pressed, no refining" value="' + ((p.highlights && p.highlights[0]) || '') + '">' +
      '<input class="form-control" id="pH2" placeholder="e.g. Rich in nutrients" value="' + ((p.highlights && p.highlights[1]) || '') + '">' +
      '<input class="form-control" id="pH3" placeholder="e.g. No additives or preservatives" value="' + ((p.highlights && p.highlights[2]) || '') + '">' +
      '</div></div>' +
      '<div class="form-group"><div class="switch"><input type="checkbox" id="pStock"' + (p.stock !== false ? ' checked' : '') + '><label class="switch__track" for="pStock"></label><span class="switch__label">In Stock</span></div></div>';
  }

  /* ------------------------------------------------ shared image encoding --
     Every upload path (product / category / banner) ends with the same job:
     turn a canvas into the smallest data URL that still looks sharp.

     The old code hard-coded JPEG 0.7 with a 300x300 cap, so even a big crisp
     upload came out soft on the storefront — the product gallery draws the
     main image 420px tall (about 840px on a retina screen), so a 300px file
     is stretched ~3x. Now the canvas keeps up to 1200px and, instead of
     throwing away resolution, quality is stepped down only until the encoded
     string fits a byte budget. WebP is used when the browser can encode it
     (smaller file, cleaner edges), JPEG otherwise. */
  var IMG_KB = { product: 300, category: 200, banner: 300 };

  /* Some browsers silently return PNG when asked for an unknown codec. */
  function canEncode(type) {
    var probe = document.createElement('canvas');
    probe.width = probe.height = 1;
    return probe.toDataURL(type).indexOf('data:' + type + ';') === 0;
  }

  function encodeImage(canvas, maxKB) {
    var plan = canEncode('image/webp')
      ? [['image/webp', 0.92], ['image/webp', 0.85], ['image/webp', 0.78], ['image/webp', 0.7],
         ['image/jpeg', 0.9], ['image/jpeg', 0.82], ['image/jpeg', 0.74]]
      : [['image/jpeg', 0.94], ['image/jpeg', 0.88], ['image/jpeg', 0.82], ['image/jpeg', 0.74]];
    var out = '';
    for (var i = 0; i < plan.length; i++) {
      var url = canvas.toDataURL(plan[i][0], plan[i][1]);
      if (url.indexOf('data:' + plan[i][0] + ';') !== 0) continue;  /* codec unavailable */
      out = url;
      if (url.length <= maxKB * 1024) break;                       /* inside the budget */
    }
    return out || canvas.toDataURL('image/jpeg', 0.7);
  }

  function initImageUpload(modal) {
    var container = modal.querySelector('#pImagesContainer');
    var addBtn = modal.querySelector('#pAddImage');
    if (!container) return;

    /* Source of truth: array of image data-URLs ('' = empty slot).
       EVERY change re-renders all slots from this array — labels,
       previews and the + Add Image button can never go out of sync. */
    var imgState = [];
    container.querySelectorAll('.p-img-value').forEach(function (el) {
      imgState.push(el.value || '');
    });
    if (!imgState.length) imgState.push('');

    function compressImage(file, maxW, maxH, maxKB, callback) {
      var img = new Image();
      img.onload = function () {
        var w = img.width, h = img.height;
        if (w > maxW || h > maxH) {
          var ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        var ctx = canvas.getContext('2d');
        /* White backdrop first — transparent PNG areas would turn BLACK in JPEG */
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        /* Encode at the best quality that fits the byte budget, and hand the
           source pixel size back so a low-res upload can be flagged. */
        callback(encodeImage(canvas, maxKB), { w: img.width, h: img.height });
      };
      img.onerror = function () { toast('Failed to load image', 'error'); };
      img.src = URL.createObjectURL(file);
    }

    /* ---- black backdrop → white -------------------------------------------
       Older uploads were converted to JPEG while the canvas was still clear,
       so every transparent pixel came back BLACK (JPEG has no alpha).
       This walks in from the image border and paints only the *connected*
       black area white, so dark details inside the pack (text, shadows) are
       never touched, and images that already have a light border are returned
       unchanged. Nothing is stored until "Save Product" is pressed. */
    var BLACK_LEVEL = 48;                       /* 0-255 luminance seen as black */

    function whiteBackdrop(src, callback) {
      var img = new Image();
      img.onload = function () {
        var w = img.width, h = img.height;
        if (!w || !h) { callback(src); return; }
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        var ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        var frame;
        try { frame = ctx.getImageData(0, 0, w, h); } catch (err) { callback(src); return; }
        var px = frame.data;
        var lum = function (i) { return 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]; };

        /* Every pixel along the four edges */
        var edge = [], i;
        for (i = 0; i < w; i++) { edge.push(i * 4); edge.push(((h - 1) * w + i) * 4); }
        for (i = 0; i < h; i++) { edge.push(i * w * 4); edge.push((i * w + w - 1) * 4); }

        var black = 0;
        edge.forEach(function (p) { if (lum(p) < BLACK_LEVEL) black++; });
        /* Only images framed entirely in black are "flattened transparency" */
        if (black / edge.length < 0.6) { callback(src); return; }

        var queue = edge.filter(function (p) { return lum(p) < BLACK_LEVEL; });
        var seen = new Uint8Array(w * h);
        while (queue.length) {
          var p = queue.pop(), cell = p >> 2;
          if (seen[cell]) continue;
          seen[cell] = 1;
          if (lum(p) >= BLACK_LEVEL) continue;       /* edge of the product body */
          px[p] = 255; px[p + 1] = 255; px[p + 2] = 255; px[p + 3] = 255;
          var x = cell % w, y = (cell - x) / w;
          if (x > 0) queue.push(p - 4);
          if (x < w - 1) queue.push(p + 4);
          if (y > 0) queue.push(p - w * 4);
          if (y < h - 1) queue.push(p + w * 4);
        }
        ctx.putImageData(frame, 0, 0);
        callback(encodeImage(canvas, IMG_KB.product));
      };
      img.onerror = function () { callback(src); };
      img.src = src;
    }

    /* Repair saved images that still carry a black backdrop. Preview only —
       the product keeps the old bytes until the form is saved. */
    function repairBlackBackdrops() {
      var pending = 0, repaired = 0;
      imgState.forEach(function (src, i) {
        if (!src) return;
        pending++;
        whiteBackdrop(src, function (out) {
          pending--;
          if (out !== src) { imgState[i] = out; repaired++; render(); }
          if (!pending && repaired) {
            toast('Black background changed to white — press Save Product to keep it');
          }
        });
      });
    }

    function render() {
      container.innerHTML = imgState.map(function (v) { return pImageSlotHTML(v); }).join('');
      var slots = container.querySelectorAll('.p-img-slot');
      slots.forEach(function (slot, i) {
        var lbl = slot.querySelector('.p-img-label');
        if (lbl) lbl.textContent = i === 0 ? 'Main image' : 'Image ' + (i + 1);
      });
    }

    function handleFile(idx, file) {
      if (!file || !file.type.startsWith('image/')) {
        toast('Please select a valid image file', 'error');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast('Image must be under 5MB', 'error');
        return;
      }
      /* Keep up to 1200px and let the encoder trade quality (never resolution)
         for the byte budget — the storefront draws this image 420px tall. */
      compressImage(file, 1200, 1200, IMG_KB.product, function (dataUrl, meta) {
        imgState[idx] = dataUrl;
        render();
        if (meta && Math.max(meta.w, meta.h) < 900) {
          toast('⚠️ That file is only ' + meta.w + '×' + meta.h + 'px — upload 1200×1200 or larger for a sharp product photo', 'warn');
        }
      });
    }

    function slotIndex(node) {
      var slot = node.closest ? node.closest('.p-img-slot') : null;
      if (!slot) return -1;
      var slots = Array.prototype.slice.call(container.querySelectorAll('.p-img-slot'));
      return slots.indexOf(slot);
    }

    // "+ Add Image" — add as many images as you want (no limit)
    addBtn.addEventListener('click', function () {
      imgState.push('');
      render();
      var slots = container.querySelectorAll('.p-img-slot');
      var last = slots[slots.length - 1];
      if (last && last.scrollIntoView) last.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    // Delegated clicks — remove ✕ / open file picker
    container.addEventListener('click', function (e) {
      var idx = slotIndex(e.target);
      if (idx < 0) return;
      if (e.target.closest('.p-img-remove')) {
        imgState.splice(idx, 1);
        if (!imgState.length) imgState.push('');
        render();
        return;
      }
      if (e.target.closest('.p-img-white')) {
        if (!imgState[idx]) return;
        var wBtn = e.target.closest('.p-img-white');
        wBtn.textContent = '…';
        whiteBackdrop(imgState[idx], function (out) {
          if (out === imgState[idx]) {
            render();
            toast('This image already has a light background — nothing to change');
            return;
          }
          imgState[idx] = out;
          render();
          toast('Background changed to white — press Save Product to keep it');
        });
        return;
      }
      if (e.target.closest('.p-img-dropzone')) {
        var fileInput = container.querySelectorAll('.p-img-file')[idx];
        if (fileInput) fileInput.click();
      }
    });

    container.addEventListener('change', function (e) {
      if (!e.target.classList.contains('p-img-file')) return;
      var idx = slotIndex(e.target);
      if (idx < 0) return;
      if (e.target.files && e.target.files[0]) {
        handleFile(idx, e.target.files[0]);
        e.target.value = '';
      }
    });

    // Drag & drop
    container.addEventListener('dragover', function (e) {
      var idx = slotIndex(e.target);
      if (idx < 0) return;
      e.preventDefault(); e.stopPropagation();
      var dz = container.querySelectorAll('.p-img-dropzone')[idx];
      if (dz) { dz.style.borderColor = '#2f8f43'; dz.style.background = '#f1f7ec'; }
    });
    container.addEventListener('dragleave', function (e) {
      var idx = slotIndex(e.target);
      if (idx < 0) return;
      e.preventDefault(); e.stopPropagation();
      var dz = container.querySelectorAll('.p-img-dropzone')[idx];
      if (dz) { dz.style.borderColor = '#ccd5cc'; dz.style.background = ''; }
    });
    container.addEventListener('drop', function (e) {
      var idx = slotIndex(e.target);
      if (idx < 0) return;
      e.preventDefault(); e.stopPropagation();
      var dz = container.querySelectorAll('.p-img-dropzone')[idx];
      if (dz) { dz.style.borderColor = '#ccd5cc'; dz.style.background = ''; }
      if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(idx, e.dataTransfer.files[0]);
    });

    render();
    repairBlackBackdrops();
  }

  function initSizeVariants(modal) {
    var container = modal.querySelector('#pSizesContainer');
    var addBtn = modal.querySelector('#pAddSize');

    function makeRow() {
      var row = document.createElement('div');
      row.className = 'size-row';
      row.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:8px';
      row.innerHTML =
        '<input class="form-control pSizeUnit" placeholder="e.g. 1kg" style="flex:1">' +
        '<input class="form-control pSizePrice" type="number" placeholder="Price ₹" style="flex:1">' +
        '<input class="form-control pSizeMrp" type="number" placeholder="MRP ₹" style="flex:1">' +
        '<button type="button" class="size-row-remove" style="width:32px;flex-shrink:0;background:none;border:1px solid #e2e8e0;border-radius:6px;padding:5px;cursor:pointer;color:#dc3545;font-size:13px;font-weight:700" title="Remove">✕</button>';
      return row;
    }

    function addRemoveListeners() {
      container.querySelectorAll('.size-row-remove').forEach(function (btn) {
        btn.onclick = function () {
          var rows = container.querySelectorAll('.size-row');
          if (rows.length <= 1) { toast('At least one size variant is required', 'warn'); return; }
          btn.closest('.size-row').remove();
        };
      });
    }

    addBtn.addEventListener('click', function () {
      var row = makeRow();
      container.appendChild(row);
      addRemoveListeners();
      row.querySelector('.pSizeUnit').focus();
    });

    addRemoveListeners();
  }

  function readProductForm(modal) {
    var name = modal.querySelector('#pName').value.trim();
    var cat = modal.querySelector('#pCat').value;
    if (!name) { toast('Product name is required', 'error'); return null; }
    if (!cat) { toast('Please select a category', 'error'); return null; }

    /* Read all size variant rows — each has label, price, MRP */
    var sizeRows = modal.querySelectorAll('#pSizesContainer .size-row');
    var sizes = [];
    var valid = true;
    sizeRows.forEach(function (row) {
      var unit = row.querySelector('.pSizeUnit').value.trim();
      var pr = parseFloat(row.querySelector('.pSizePrice').value);
      var mrpV = parseFloat(row.querySelector('.pSizeMrp').value);
      if (!unit || !pr || pr <= 0) { valid = false; return; }
      /* MRP defaults to price if not entered */
      sizes.push([unit, pr, mrpV > 0 ? mrpV : pr]);
    });
    if (!valid || sizes.length === 0) { toast('Each size needs a label and a valid price', 'error'); return null; }

    var firstPrice = sizes[0][1];
    var firstMrp = sizes[0][2];
    var firstUnit = sizes[0][0];

    /* Read highlights — filter out blanks */
    var h1 = (modal.querySelector('#pH1') || {}).value || '';
    var h2 = (modal.querySelector('#pH2') || {}).value || '';
    var h3 = (modal.querySelector('#pH3') || {}).value || '';
    var highlights = [h1.trim(), h2.trim(), h3.trim()].filter(Boolean);

    /* Gallery — read all image slots in order */
    var imgs = [];
    modal.querySelectorAll('.p-img-value').forEach(function (el) {
      if (el.value) imgs.push(el.value);
    });

    return {
      name: name,
      ta: modal.querySelector('#pTa').value.trim() || '',
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, ''),
      cat: cat,
      price: firstPrice,
      mrp: firstMrp,
      unit: firstUnit,
      rating: parseFloat(modal.querySelector('#pRating').value) || 4.5,
      reviews: 0,
      badge: modal.querySelector('#pBadge').value.trim() || '',
      img: imgs[0] || '',
      images: imgs,
      desc: modal.querySelector('#pDesc').value.trim() || '',
      stock: modal.querySelector('#pStock').checked,
      sizes: sizes,
      highlights: highlights,
      custom: true
    };
  }

  /* Product edits are local-only until an approved backend writer is available. */
  function upsertProductToSupabase(p) {
    toast('⚠️ Product saved locally only. Supabase sync requires an approved-admin backend.', 'warn');
  }
  function deleteProductFromSupabase(p) {
    toast('⚠️ Product removed locally only. Supabase sync requires an approved-admin backend.', 'warn');
  }

  /* ---- Supabase error → human hint (RLS / missing table etc.) ---- */
  function syncErrorHint(err) {
    var msg = (err && (err.message || err.msg)) || String(err);
    var code = String((err && (err.code || err.status)) || '');
    if (code === '42501' || /row-level security|permission denied|unauthorized/i.test(msg)) {
      /* Never recommend restoring public write policies. */
      openRlsFixModal();
      return msg + ' — Catalog writes require a server-side approved-admin endpoint. Do not restore public write policies.';
    }
    if (code === 'PGRST205' || /schema cache|does not exist|Could not find the table/i.test(msg)) {
      return msg + ' — Ask an administrator to review the backend schema; do not run legacy public-write schema scripts.';
    }
    return msg;
  }

  /* Category edits are local-only until an approved backend writer exists. */
  function upsertCategoryToSupabase(c) {
    toast('⚠️ Category saved locally only. Supabase sync requires an approved-admin backend.', 'warn');
  }
  /* Local category removal does not change the Supabase catalog. */
  function deleteCategoryFromSupabase(slug) {
    toast('⚠️ Category removed locally only. Supabase sync requires an approved-admin backend.', 'warn');
  }
  /* Legacy RLS fix SQL is deliberately not offered to admins. */
  var _rlsFixShown = false;

  function openRlsFixModal() {
    // The legacy popup offered public-write SQL; do not expose that path.
    if (_rlsFixShown || document.querySelector('.modal-overlay')) return;
    _rlsFixShown = true;
    openModal('Catalog sync unavailable',
      '<p>Public catalog writes must remain disabled. Do not restore legacy write policies.</p>' +
      '<p>Product sync needs a server-side approved-admin endpoint, tested on staging first.</p>', null);
  }

  /* Disabled: the old full-catalog push used public-table browser writes. */
  function syncCatalogToSupabase(btn) {
    toast('⚠️ Product sync is disabled until an approved-admin backend is staged and tested.', 'warn');
  }
  function renderProducts() {
    var allProducts = data.products();

    // Build category counts
    var catCounts = {};
    allProducts.forEach(function (p) {
      catCounts[p.cat] = (catCounts[p.cat] || 0) + 1;
    });
    var cats = SITE && SITE.categories ? SITE.categories : [];

    // Category pills HTML
    var catPills = '<button class="cat-pill is-active" data-cat-filter="all">All <span class="cat-pill__count">' + allProducts.length + '</span></button>';
    cats.forEach(function (c) {
      var count = catCounts[c.slug] || 0;
      if (count > 0) {
        catPills += '<button class="cat-pill" data-cat-filter="' + c.slug + '">' + c.name + ' <span class="cat-pill__count">' + count + '</span></button>';
      }
    });
    // Check for custom products not in any standard category
    var customCount = allProducts.filter(function (p) { return p.custom; }).length;
    if (customCount > 0) {
      catPills += '<button class="cat-pill" data-cat-filter="__custom__">Custom <span class="cat-pill__count">' + customCount + '</span></button>';
    }

    content.innerHTML =
      '<div class="page-toolbar">' +
      '<div class="search-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' +
      '<input type="text" id="prodSearch" placeholder="Search products..."></div>' +
      '<button class="btn-sm" id="syncSupabaseBtn" disabled title="Requires an approved server-side catalog writer">☁️ Sync unavailable</button>' +
      '<button class="btn-sm btn-sm--primary" id="addProductBtn">+ Add Product</button>' +
      '</div>' +
      '<p role="status" class="small muted">Catalog editor changes are local to this browser only. Supabase product sync is disabled until an approved-admin backend is staged and tested.</p>' +
      '<div class="cat-pills-bar" id="catPillsBar">' + catPills + '</div>' +
      '<div class="product-grid" id="productGrid"></div>';

    var activeCat = 'all';
    var activeQ = '';

    function applyFilters() {
      var list = allProducts;
      if (activeCat !== 'all') {
        if (activeCat === '__custom__') {
          list = list.filter(function (p) { return p.custom; });
        } else {
          list = list.filter(function (p) { return p.cat === activeCat; });
        }
      }
      if (activeQ) {
        list = list.filter(function (p) {
          return p.name.toLowerCase().indexOf(activeQ) > -1 || p.cat.toLowerCase().indexOf(activeQ) > -1;
        });
      }
      renderProductGrid(list);
    }

    renderProductGrid(allProducts);

    // Search filter
    var searchInput = $('#prodSearch');
    searchInput.addEventListener('input', function () {
      activeQ = searchInput.value.toLowerCase();
      applyFilters();
    });

    // Category pills
    $$('[data-cat-filter]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('[data-cat-filter]').forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        activeCat = btn.getAttribute('data-cat-filter');
        applyFilters();
      });
    });


    $('#addProductBtn').addEventListener('click', function () {
      var modal = openModal('Add New Product', getProductFormHTML(), function (m) {
        var product = readProductForm(m);
        if (!product) return false;
        // Check duplicate
        var existing = data.products();
        var dup = existing.filter(function (p) { return p.slug === product.slug; });
        if (dup.length > 0) {
          product.slug = product.slug + '-' + Date.now();
        }
        var customProds = read(AK.products, []);
        customProds.push(product);
        var saved = write(AK.products, customProds);
        if (!saved) {
          // Storage full — try saving without images
          product.img = '';
          product.images = [];
          customProds[customProds.length - 1] = product;
          var retry = write(AK.products, customProds);
          if (!retry) { toast('❌ Could not save product. Storage is full.', 'error'); return false; }
          toast('⚠️ Product saved without image (storage nearly full).', 'warn');
        } else {
          toast('✅ Product "' + product.name + '" saved locally only.');
        }
        upsertProductToSupabase(product);
        renderProducts();
      });
      initImageUpload(modal);
      initSizeVariants(modal);
    });
  }

  function renderProductGrid(products) {
    var grid = $('#productGrid');
    if (!grid) return;
    if (products.length === 0) {
      grid.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z"/></svg><h4>No products found</h4><p>Try a different search term or add a new product.</p></div>';
      return;
    }
    grid.innerHTML = products.map(function (p, idx) {
      var imgSrc = p.img || 'assets/img/products/' + p.slug + '.jpg';
      var isCustom = p.custom === true;
      var uid = p.slug + '__' + idx;
      return '<div class="product-admin-card" data-slug="' + p.slug + '" data-uid="' + uid + '" data-custom="' + (isCustom ? '1' : '0') + '">' +
        '<div class="product-admin-card__img">' +
        '<img src="' + imgSrc + '" alt="' + p.name + '" onerror="this.parentElement.style.background=\'#e6f0e0\';this.style.display=\'none\'">' +
        (p.badge ? '<span class="product-admin-card__badge">' + p.badge + '</span>' : '') +
        (isCustom ? '<span class="product-admin-card__badge" style="background:#3b82f6;right:8px;left:auto">Custom</span>' : '') +
        '</div>' +
        '<div class="product-admin-card__body">' +
        '<div class="product-admin-card__name">' + p.name + '</div>' +
        '<div class="product-admin-card__cat">' + p.cat + '</div>' +
        '<div class="product-admin-card__price"><b>' + money(p.price) + '</b>' +
        (p.mrp > p.price ? '<s>' + money(p.mrp) + '</s>' : '') +
        '</div>' +
        '<div class="product-admin-card__meta">' +
        '<span class="product-admin-card__rating">★ ' + p.rating + ' (' + (p.reviews || 0) + ')</span>' +
        '<span class="product-admin-card__stock ' + (p.stock !== false ? 'in' : 'out') + '">' +
        (p.stock !== false ? '● In Stock' : '● Out of Stock') + '</span>' +
        '</div>' +
        '<div class="product-admin-card__actions">' +
        '<button class="btn-sm" data-edit-uid="' + uid + '">✏️ Edit</button>' +
        '<button class="btn-sm btn-sm--danger" data-del-uid="' + uid + '">🗑️ Delete</button>' +
        '</div>' +
        '</div></div>';
    }).join('');

    // Build a lookup from uid to product
    var productsByUid = {};
    products.forEach(function (p, idx) {
      productsByUid[p.slug + '__' + idx] = p;
    });

    // Bind Edit buttons
    $$('[data-edit-uid]', grid).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var uid = btn.getAttribute('data-edit-uid');
        var product = productsByUid[uid];
        if (!product) return;
        var slug = product.slug;

        var editModal = openModal('Edit Product — ' + product.name, getProductFormHTML(product), function (modal) {
          var updated = readProductForm(modal);
          if (!updated) return false;

          if (product.custom) {
            // Update custom product in localStorage
            var customProds = read(AK.products, []);
            for (var i = 0; i < customProds.length; i++) {
              if (customProds[i].slug === slug) {
                updated.slug = slug;
                updated.custom = true;
                updated.reviews = customProds[i].reviews || 0;
                customProds[i] = updated;
                break;
              }
            }
            write(AK.products, customProds);
            upsertProductToSupabase(updated);
            toast('✅ Product "' + updated.name + '" updated locally only.');
          } else {
            // Catalog product — save edits as custom override
            updated.slug = slug;
            updated.custom = true;
            updated.reviews = product.reviews || 0;
            var customProds = read(AK.products, []);
            customProds = customProds.filter(function (p) { return p.slug !== slug; });
            customProds.push(updated);
            write(AK.products, customProds);
            upsertProductToSupabase(updated);
            toast('✅ Product "' + updated.name + '" updated locally only.');
          }
          renderProducts();
        });
        initImageUpload(editModal);
        initSizeVariants(editModal);
      });
    });

    // Bind Delete buttons
    $$('[data-del-uid]', grid).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var uid = btn.getAttribute('data-del-uid');
        var product = productsByUid[uid];
        if (!product) return;
        var slug = product.slug;

        openModal('Delete Product',
          '<div style="text-align:center;padding:10px 0">' +
          '<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#dc3545" stroke-width="1.5" style="margin:0 auto 12px"><path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.9 12.4h9.2L17.5 7"/></svg>' +
          '<h4 style="font-size:16px;margin-bottom:6px">Delete "' + product.name + '"?</h4>' +
          '<p style="color:#6f7d72;font-size:13px">This action cannot be undone.</p>' +
          '</div>',
          function () {
            if (product.custom) {
              var customProds = read(AK.products, []);
              customProds = customProds.filter(function (p) { return p.slug !== slug; });
              write(AK.products, customProds);
              deleteProductFromSupabase(product);
              toast('🗑️ Product "' + product.name + '" removed locally only.');
              renderProducts();
            } else {
              toast('Catalog products cannot be deleted.', 'warn');
            }
          },
          'Delete'
        );
      });
    });
  }


  /* ============================================================ CATEGORIES */

  function getCategoryFormHTML(c) {
    c = c || {};
    var hasImg = c.img && c.img.length > 0;
    var previewStyle = hasImg ? 'display:block' : 'display:none';
    var dropzoneHidden = hasImg ? ' style="display:none"' : '';
    return '<div class="form-group"><label>Category Name *</label><input class="form-control" id="catName" placeholder="e.g. Spices" value="' + (c.name || '') + '"></div>' +
      '<div class="form-group"><label>Tamil Name</label><input class="form-control" id="catTa" placeholder="e.g. மசாலா பொருட்கள்" value="' + (c.ta || '') + '"></div>' +
      '<div class="form-group"><label>Description</label><textarea class="form-control" id="catDesc" placeholder="Brief description...">' + (c.blurb || '') + '</textarea></div>' +
      /* Image upload */
      '<div class="form-group"><label>Category Image</label>' +
      '<input type="hidden" id="catImg" value="' + (c.img || '') + '">' +
      '<input type="file" id="catImgFile" accept="image/*" style="display:none">' +
      '<div id="catImgDropzone"' + dropzoneHidden + ' style="border:2px dashed #ccd5cc;border-radius:10px;padding:28px 16px;text-align:center;cursor:pointer;transition:border-color .2s,background .2s">' +
      '<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#92a096" stroke-width="1.5" style="margin:0 auto 8px;display:block"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 15l5-4 4 3 4-5 5 6"/><circle cx="8.5" cy="9.5" r="1.5"/></svg>' +
      '<div style="font-size:13px;font-weight:600;color:#3f5045">Click to upload or drag &amp; drop</div>' +
      '<div style="font-size:11px;color:#92a096;margin-top:4px">PNG / JPG / WebP up to 5MB · best 800×600 px</div>' +
      '</div>' +
      '<div id="catImgPreview" style="' + previewStyle + ';position:relative;border-radius:10px;overflow:hidden;border:1px solid #e2e8e0;margin-top:6px">' +
      '<img id="catImgThumb" src="' + (c.img || '') + '" style="width:100%;height:180px;object-fit:cover;display:block" alt="Preview">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#f8f9f6">' +
      '<span id="catImgInfo" style="font-size:11px;color:#6f7d72">Image loaded</span>' +
      '<button type="button" id="catImgRemove" style="font-size:11px;font-weight:600;color:#dc3545;background:none;border:none;cursor:pointer;padding:2px 6px">✕ Remove</button>' +
      '</div>' +
      '</div>' +
      '</div>';
  }

  function initCategoryImageUpload(modal) {
    var fileInput = modal.querySelector('#catImgFile');
    var dropzone = modal.querySelector('#catImgDropzone');
    var preview = modal.querySelector('#catImgPreview');
    var thumb = modal.querySelector('#catImgThumb');
    var info = modal.querySelector('#catImgInfo');
    var removeBtn = modal.querySelector('#catImgRemove');
    var hiddenInput = modal.querySelector('#catImg');

    function compressCatImage(file, maxW, maxH, maxKB, callback) {
      var img = new Image();
      img.onload = function () {
        var w = img.width, h = img.height;
        if (w > maxW || h > maxH) {
          var ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio); h = Math.round(h * ratio);
        }
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        var cctx = canvas.getContext('2d');
        /* White backdrop first — transparent PNG areas would turn BLACK in JPEG */
        cctx.fillStyle = '#ffffff';
        cctx.fillRect(0, 0, w, h);
        cctx.drawImage(img, 0, 0, w, h);
        callback(encodeImage(canvas, maxKB));
      };
      img.onerror = function () { toast('Failed to load image', 'error'); };
      img.src = URL.createObjectURL(file);
    }

    function handleCatFile(file) {
      if (!file || !file.type.startsWith('image/')) { toast('Please select a valid image file', 'error'); return; }
      if (file.size > 5 * 1024 * 1024) { toast('Image must be under 5MB', 'error'); return; }
      compressCatImage(file, 800, 600, IMG_KB.category, function (dataUrl) {
        hiddenInput.value = dataUrl;
        thumb.src = dataUrl;
        info.textContent = file.name + ' (~' + (dataUrl.length / 1024).toFixed(1) + ' KB compressed)';
        dropzone.style.display = 'none';
        preview.style.display = 'block';
      });
    }

    dropzone.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files[0]) handleCatFile(fileInput.files[0]);
    });
    dropzone.addEventListener('dragover', function (e) {
      e.preventDefault(); e.stopPropagation();
      dropzone.style.borderColor = '#2f8f43'; dropzone.style.background = '#f1f7ec';
    });
    dropzone.addEventListener('dragleave', function (e) {
      e.preventDefault(); e.stopPropagation();
      dropzone.style.borderColor = '#ccd5cc'; dropzone.style.background = '';
    });
    dropzone.addEventListener('drop', function (e) {
      e.preventDefault(); e.stopPropagation();
      dropzone.style.borderColor = '#ccd5cc'; dropzone.style.background = '';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) handleCatFile(e.dataTransfer.files[0]);
    });
    removeBtn.addEventListener('click', function () {
      hiddenInput.value = ''; thumb.src = ''; fileInput.value = '';
      preview.style.display = 'none'; dropzone.style.display = '';
    });
  }
  function renderCategories() {
    var cats = SITE ? SITE.categories : [];
    content.innerHTML =
      '<div class="page-toolbar">' +
      '<h3 style="font-size:15px;font-weight:600">Manage ' + cats.length + ' categories</h3>' +
      '<button class="btn-sm" id="syncCatsBtn" disabled title="Requires an approved server-side catalog writer">☁️ Sync unavailable</button>' +
      '<button class="btn-sm btn-sm--primary" id="addCatBtn">+ Add Category</button>' +
      '</div>' +
      '<p role="status" class="small muted">Category edits are local to this browser only. Supabase sync is disabled until an approved-admin backend is staged and tested.</p>' +
      '<div class="card"><div class="card__body" style="padding:0;overflow-x:auto">' +
      '<table class="admin-table"><thead><tr><th>#</th><th>Image</th><th>Category</th><th>Tamil Name</th><th>Slug</th><th>Products</th><th>Actions</th></tr></thead>' +
      '<tbody>' + cats.map(function (c, i) {
        var count = SITE.products.filter(function (p) { return p.cat === c.slug; }).length;
        var imgCell = c.img
          ? '<img src="' + c.img + '" alt="' + c.name + '" style="width:40px;height:40px;object-fit:cover;border-radius:8px;border:1px solid #e2e8e0;display:block">'
          : '<div style="width:40px;height:40px;border-radius:8px;background:#f0f4ee;border:1px solid #e2e8e0;display:flex;align-items:center;justify-content:center"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#b0bdb4" stroke-width="1.5"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 15l5-4 4 3 4-5 5 6"/><circle cx="8.5" cy="9.5" r="1.5"/></svg></div>';
        return '<tr><td>' + (i + 1) + '</td><td>' + imgCell + '</td><td><b>' + c.name + '</b></td><td>' + c.ta + '</td><td><code>' + c.slug + '</code></td><td>' + count + '</td>' +
          '<td><button class="btn-sm" data-edit-cat="' + c.slug + '">✏️ Edit</button> <button class="btn-sm btn-sm--danger" data-delete-cat="' + c.slug + '">🗑️</button></td></tr>';
      }).join('') +
      '</tbody></table></div></div>';


    $('#addCatBtn').addEventListener('click', function () {
      var modal = openModal('Add Category', getCategoryFormHTML(), function (m) {
        var name = m.querySelector('#catName').value.trim();
        var ta = m.querySelector('#catTa').value.trim();
        var desc = m.querySelector('#catDesc').value.trim();
        var img = m.querySelector('#catImg').value || '';
        if (!name) { toast('Category name is required', 'error'); return false; }
        var slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
        var exists = (SITE ? SITE.categories : []).some(function (c) { return c.slug === slug; });
        if (exists) { toast('A category with this name already exists.', 'error'); return false; }
        var newCat = { slug: slug, name: name, ta: ta, blurb: desc, img: img };
        var customCats = read(AK.categories, []);
        customCats.push(newCat);
        var saved = write(AK.categories, customCats);
        if (!saved) {
          newCat.img = '';
          customCats[customCats.length - 1] = newCat;
          write(AK.categories, customCats);
          toast('⚠️ Category saved without image (storage nearly full).', 'warn');
        } else {
          toast('Category "' + name + '" added successfully!');
        }
        if (SITE) SITE.categories.push(newCat);
        /* Keep the browser-only edit visibly separate from Supabase. */
        upsertCategoryToSupabase(newCat);
        renderCategories();
      }
      );
      initCategoryImageUpload(modal);
    });

    // Edit category handler
    $$('[data-edit-cat]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var slug = btn.getAttribute('data-edit-cat');
        var cat = cats.filter(function (c) { return c.slug === slug; })[0];
        if (!cat) return;

        var editModal = openModal('Edit Category', getCategoryFormHTML(cat), function (m) {
          var name = m.querySelector('#catName').value.trim();
          var ta = m.querySelector('#catTa').value.trim();
          var desc = m.querySelector('#catDesc').value.trim();
          var img = m.querySelector('#catImg').value || '';
          if (!name) { toast('Category name is required', 'error'); return false; }

          // Update in-memory category
          cat.name = name; cat.ta = ta; cat.blurb = desc; cat.img = img;

          // Save to localStorage
          var customCats = read(AK.categories, []);
          var found = false;
          for (var i = 0; i < customCats.length; i++) {
            if (customCats[i].slug === slug) {
              customCats[i].name = name; customCats[i].ta = ta;
              customCats[i].blurb = desc; customCats[i].img = img;
              found = true; break;
            }
          }
          if (!found) {
            customCats.push({ slug: slug, name: name, ta: ta, blurb: desc, img: img });
          }
          var saved = write(AK.categories, customCats);
          if (!saved) {
            // retry without image
            for (var j = 0; j < customCats.length; j++) {
              if (customCats[j].slug === slug) { customCats[j].img = ''; break; }
            }
            write(AK.categories, customCats);
            toast('⚠️ Category saved without image (storage nearly full).', 'warn');
          } else {
            toast('Category updated!');
          }
          renderCategories();
          /* Backend catalog sync is unavailable. */
          upsertCategoryToSupabase(cat);
        }
        );
        initCategoryImageUpload(editModal);
      });
    });

    // Delete category handler
    $$('[data-delete-cat]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var slug = btn.getAttribute('data-delete-cat');
        var cat = cats.filter(function (c) { return c.slug === slug; })[0];
        if (!cat) return;

        var count = SITE.products.filter(function (p) { return p.cat === slug; }).length;
        if (count > 0) {
          toast('Cannot delete category. There are ' + count + ' products assigned to it.', 'error');
          return;
        }

        openModal('Delete Category',
          '<p>Are you sure you want to delete the category <b>' + cat.name + '</b>?</p>',
          function () {
            // Remove from custom categories list in localStorage
            var customCats = read(AK.categories, []);
            customCats = customCats.filter(function (c) { return c.slug !== slug; });
            write(AK.categories, customCats);

            // Add to deleted categories list
            var deletedCats = read(AK.deletedCategories, []);
            if (deletedCats.indexOf(slug) === -1) {
              deletedCats.push(slug);
              write(AK.deletedCategories, deletedCats);
            }

            // Remove from in-memory categories
            if (SITE) {
              SITE.categories = SITE.categories.filter(function (c) { return c.slug !== slug; });
            }

            /* Backend catalog sync is unavailable. */
            deleteCategoryFromSupabase(slug);

            toast('Category "' + cat.name + '" removed locally only.');
            renderCategories();
          },
          'Delete'
        );
      });
    });
  }

  /* ============================================================ ORDERS */
  var ORD_EMBED = '*, order_items(product_name, quantity, price, subtotal)';

  function mapSupabaseStatus(s) {
    s = String(s || '').toLowerCase();
    if (s === 'pending' || s === 'confirmed' || s === 'processing') return 'Processing';
    if (s === 'shipped') return 'Shipped';
    if (s === 'delivered') return 'Delivered';
    if (s === 'cancelled') return 'Cancelled';
    if (s === 'returned') return 'Returned';
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Processing';
  }

  function mapSupabaseOrder(row) {
    var items = (row.order_items || []).map(function (oi) {
      return {
        name: escHtml(oi.product_name || 'Product'),
        qty: Number(oi.quantity) || 1,
        price: Number(oi.price) || 0,
        total: Number(oi.subtotal) || 0
      };
    });
    return {
      id: escHtml(row.order_number || ('SB-' + String(row.id || '').slice(0, 8))),
      customer: escHtml((row.customer_name || '').trim() || 'Guest'),
      email: escHtml(row.customer_email || ''),
      phone: escHtml((row.customer_phone || '').trim()),
      date: (row.created_at || '').slice(0, 10),
      createdAt: row.created_at || '',
      items: items.length,
      amount: Number(row.total) || 0,
      status: mapSupabaseStatus(row.status),
      productItems: items,
      supabaseId: row.id,
      payMethod: row.payment_method || '',
      address: row.shipping_address ? {
        door: escHtml(row.shipping_address),
        street: '',
        area: '',
        city: escHtml(row.shipping_city || ''),
        state: escHtml(row.shipping_state || ''),
        pin: escHtml(row.shipping_pincode || '')
      } : null
    };
  }

  function fetchSupabaseOrders() {
    return demoAdminRequest('admin-orders').then(function (result) {
        if (!Array.isArray(result.orders)) throw new Error('Invalid admin orders response');
        return { orders: result.orders.map(mapSupabaseOrder), failed: false, message: '' };
      })
      .catch(function (e) {
        return { orders: [], failed: true, message: (e && e.message) || String(e) };
      });
  }

  /* ------------------------------------------------------- orders badge --- */
  /* The sidebar "Orders" badge is a LIVE indicator: it shows how many NEW
     orders arrived since the admin last opened the Orders page. It polls
     Supabase every 60s, pops a toast when new orders land, and clears when
     the Orders page is viewed. */
  var SEEN_KEY = 'so_admin_orders_seen_v1';
  var NOTIFIED_KEY = 'so_admin_orders_notified_v1';
  var latestOrders = [];

  function readSeenTs() { return read(SEEN_KEY, null); }
  function writeSeenTs(v) { write(SEEN_KEY, v); }
  function readNotified() { return read(NOTIFIED_KEY, {}); }
  function writeNotified(map) {
    /* Hygiene: keep the notified-id map from growing forever */
    var keys = Object.keys(map);
    if (keys.length > 200) {
      keys.slice(0, keys.length - 100).forEach(function (k) { delete map[k]; });
    }
    write(NOTIFIED_KEY, map);
  }

  function countUnseenOrders(orders) {
    var seen = readSeenTs();
    if (!seen) return 0;
    var t = new Date(seen).getTime();
    return orders.filter(function (o) {
      return o.createdAt && new Date(o.createdAt).getTime() > t;
    }).length;
  }

  function updateOrdersBadge() {
    var badge = $('#ordersBadge');
    if (!badge) return;
    var n = countUnseenOrders(latestOrders);
    badge.textContent = n > 99 ? '99+' : String(n);
    badge.style.display = n > 0 ? '' : 'none';
  }

  function markOrdersSeen() {
    writeSeenTs(new Date().toISOString());
    updateOrdersBadge();
  }

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* Admin-only demo ledger; no real gateway is connected. */
  var paymentLoadId = 0;
  function renderPayments(page) {
    page = page || 0;
    var loadId = ++paymentLoadId;
    content.innerHTML = '<div class="payments-header"><div><h2>Payment Gateway — DEMO</h2><p>Test records only. No money collected and no real order placed.</p></div>' +
      '<button class="btn-sm" id="paymentsRefresh">Refresh</button></div><div id="paymentResults" aria-live="polite">Loading payment records…</div>';
    $('#paymentsRefresh').addEventListener('click', function () { renderPayments(page); });
    demoAdminRequest('admin-payments', { page: page }).then(function (result) {
      if (loadId !== paymentLoadId || pageTitle.textContent !== 'Payment Gateway' || document.getElementById('adminGate')?.style.display !== 'none' || !$('#paymentResults')) return;
      var records = Array.isArray(result.payments) ? result.payments : [];
      var html = '<div class="payments-summary"><div><span>Demo attempts on this page</span><strong>' + records.length + '</strong></div>' +
        '<div><span>Demo payments collected</span><strong>₹0</strong></div></div>' +
        '<p class="payments-note"><b>ADMIN DEMO ONLY:</b> Showing ' + records.length + ' of ' + Number(result.total || 0) + ' demo attempts. No real payments or confirmed orders.</p>';
      if (!records.length) html += '<p class="payments-empty">No demo attempts recorded yet.</p>';
      else html += '<div class="payments-scroll"><table class="admin-table payments-table"><thead><tr><th>Created</th><th>Test contact</th><th>Demo reference</th><th>Test amount</th><th>Status</th><th>Items</th></tr></thead><tbody>' +
        records.map(function (r) {
          var customer = r.customer || {};
          var items = Array.isArray(r.items) ? r.items : [];
          return '<tr><td>' + escHtml(r.createdAt ? new Date(r.createdAt).toLocaleString('en-IN') : '—') +
            '</td><td><b>' + escHtml(customer.name || 'Unknown') + '</b><br>' + escHtml(customer.email || '') + '<br>' + escHtml(customer.phone || '') + '</td><td>' + escHtml(r.reference || '—') +
            '</td><td>' + money(r.amount) + ' ' + escHtml(r.currency || 'INR') + '</td><td><span class="payment-status payment-status--pending">DEMO — not paid' +
            '</span></td><td>' + (items.length ? items.map(function (item) {
              return '<div>' + escHtml(item.name || 'Product') + ' · ' + escHtml(item.size || '') + ' × ' + escHtml(item.qty || 0) + ' (' + money(item.total) + ')</div>';
            }).join('') : '—') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      html += '<div class="payments-pager">' + (page > 0 ? '<button class="btn-sm" id="paymentsPrevious">Previous</button>' : '') +
        '<span>Page ' + (page + 1) + '</span>' + ((page + 1) * 50 < Number(result.total || 0) ? '<button class="btn-sm" id="paymentsNext">Next</button>' : '') + '</div>';
      $('#paymentResults').innerHTML = html;
      if ($('#paymentsPrevious')) $('#paymentsPrevious').addEventListener('click', function () { renderPayments(page - 1); });
      if ($('#paymentsNext')) $('#paymentsNext').addEventListener('click', function () { renderPayments(page + 1); });
    }).catch(function (err) {
      if (loadId === paymentLoadId && pageTitle.textContent === 'Payment Gateway' && document.getElementById('adminGate')?.style.display === 'none' && $('#paymentResults')) $('#paymentResults').textContent = (err && err.message) || 'Payment records unavailable. Check the Edge Function, admin access, and your connection.';
    });
  }

  function pollNewOrders() {
    fetchSupabaseOrders().then(function (result) {
      if (!result || result.failed) return;   /* offline — keep current badge */
      var fresh = result.orders || [];

      /* 1. Live arrivals — orders that appeared since the previous poll */
      var prevIds = {};
      latestOrders.forEach(function (o) { prevIds[o.id] = true; });
      var arrivals = latestOrders.length
        ? fresh.filter(function (o) { return !prevIds[o.id]; })
        : [];

      /* 2. Unseen orders — arrived since the admin last OPENED the Orders
            page. Covers orders placed while this panel was CLOSED: the first
            poll after reopening still rings the bell for them. */
      var seen = readSeenTs();
      var seenT = seen ? new Date(seen).getTime() : 0;
      var notified = readNotified();
      var unseen = fresh.filter(function (o) {
        return o.createdAt &&
               new Date(o.createdAt).getTime() > seenT &&
               !notified[o.id];
      });

      latestOrders = fresh;

      /* Ring the bell once per order id (merge both lists) */
      var toNotify = {};
      arrivals.forEach(function (o) { toNotify[o.id] = o; });
      unseen.forEach(function (o) { toNotify[o.id] = o; });
      var list = Object.keys(toNotify).map(function (k) { return toNotify[k]; });

      if (list.length) {
        list.forEach(function (o) {
          Notif.push('order', 'New order <b>#' + o.id + '</b> received from ' +
            o.customer + ' — ₹' + money(o.amount));
          notified[o.id] = true;
        });
        writeNotified(notified);
        toast('🛒 ' + list.length + ' new order' + (list.length > 1 ? 's' : '') + ' received!');
      }
      updateOrdersBadge();
      /* If the Orders table is on screen, pull the new rows in right away */
      if (list.length && $('#ordersBody')) renderOrders();
    });
  }

  var ordersRequestId = 0;
  function renderOrders() {
    var orderLoadId = ++ordersRequestId;
    content.innerHTML = '<p role="status">Loading real orders from the admin backend…</p>';
    fetchSupabaseOrders().then(function (result) {
      if (pageTitle.textContent !== 'Orders' || orderLoadId !== ordersRequestId || document.getElementById('adminGate')?.style.display !== 'none') return;
      latestOrders = (result && !result.failed) ? (result.orders || []).slice() : [];
      renderOrdersWithData(result);
      markOrdersSeen();
    });
  }

  function renderOrdersWithData(result) {
    var fromSupabase = !!(result && !result.failed);
    var allOrders = fromSupabase ? (result.orders || []).slice() : [];

    /* Info / failure banner; never replace real orders with seeded records. */
    var banner = '';
    if (result && result.failed) {
      banner =
        '<div style="background:#fff7e6;border:1px solid #f5c66b;color:#8a6100;border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:13px">' +
        '⚠️ <b>Orders unavailable</b> — no demo orders are shown as real orders. If secure checkout was enabled, an authenticated admin orders API is required. Reason: ' + escHtml(result.message || 'unknown') +
        '</div>';
    } else if (!allOrders.length) {
      banner =
        '<div style="background:#eef6fb;border:1px solid #bcd9ec;color:#1c5d8c;border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:13px">' +
        'ℹ️ Connected to Supabase, but no real orders are visible. Demo attempts appear only on Payment Gateway — DEMO. Do not enable public order read policies.' +
        '</div>';
    }

    /* ── 1. Sort newest first ─────────────────────────────── */
    allOrders = allOrders.slice().sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    });

    /* ── 2. Apply topbar date range filter ───────────────── */
    var range = datePicker.getRange();
    var rs = range.start, re = range.end;
    var orders = (rs && re)
      ? allOrders.filter(function (o) {
        var d = new Date(o.date);
        return d >= rs && d <= re;
      })
      : allOrders;

    var filterStatus = 'all';

    function applyFilters() {
      return filterStatus === 'all'
        ? orders
        : orders.filter(function (o) { return o.status === filterStatus; });
    }

    function render(filtered) {
      var tbody = $('#ordersBody');
      if (!tbody) return;

      /* update tab counts */
      ['all', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned'].forEach(function (s) {
        var btn = $('.filter-btn[data-filter="' + s + '"]', content);
        if (btn) {
          var c = s === 'all' ? orders.length : orders.filter(function (o) { return o.status === s; }).length;
          var sp = btn.querySelector('.count');
          if (sp) sp.textContent = '(' + c + ')';
        }
      });

      if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#92a096;padding:32px">No orders found for this date range</td></tr>';
        return;
      }

      tbody.innerHTML = filtered.map(function (o) {
        return '<tr class="ord-main-row" data-ord="' + o.id + '">' +
          '<td><b>' + o.id + '</b></td>' +
          '<td>' + o.customer + '</td>' +
          '<td>' + o.email + '</td>' +
          '<td style="white-space:nowrap">' + (o.phone || '\u2014') + '</td>' +
          '<td>' + formatDate(o.date) + '</td>' +
          '<td>' +
          '<button class="items-toggle" data-toggle-ord="' + o.id + '" title="View items">' +
          '<span class="items-count">' + o.items + '</span>' +
          '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-left:3px"><polyline points="6 9 12 15 18 9"/></svg>' +
          '</button>' +
          '</td>' +
          '<td>' + money(o.amount) + '</td>' +
          '<td><span class="status status--' + o.status.toLowerCase() + '">' + o.status + '</span></td>' +
          '<td>' +
          '<button class="btn-sm" data-view="' + o.id + '">👁️</button> ' +
          '<select class="form-control" style="width:120px;display:inline-block;padding:4px 8px;font-size:11px" data-status="' + o.id + '"' + (o.supabaseId ? ' disabled title="Read-only in demo mode"' : '') + '>' +
          ['Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned'].map(function (s) {
            return '<option' + (s === o.status ? ' selected' : '') + '>' + s + '</option>';
          }).join('') +
          '</select>' +
          '</td>' +
          '</tr>' +
          '<tr class="ord-items-row" id="items-' + o.id.replace('#', '') + '" style="display:none">' +
          '<td colspan="9" style="padding:0 0 0 48px;background:#f8faf7">' +
          '<div class="ord-items-inner">' +
          '<table class="ord-items-table">' +
          '<thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th></tr></thead>' +
          '<tbody>' +
          (o.productItems && o.productItems.length
            ? o.productItems.map(function (pi) {
              return '<tr>' +
                '<td>' + pi.name + '</td>' +
                '<td>' + pi.qty + '</td>' +
                '<td>' + money(pi.price) + '</td>' +
                '<td><b>' + money(pi.total) + '</b></td>' +
                '</tr>';
            }).join('')
            : '<tr><td colspan="4" style="color:#92a096">No item details available</td></tr>'
          ) +
          '</tbody>' +
          '<tfoot><tr>' +
          '<td colspan="3" style="text-align:right;font-weight:600;padding-right:12px">Total</td>' +
          '<td style="font-weight:700;color:#16a34a">' + money(o.amount) + '</td>' +
          '</tr></tfoot>' +
          '</table>' +
          '</div>' +
          '</td>' +
          '</tr>';
      }).join('');

      /* Toggle items row */
      $$('[data-toggle-ord]', tbody).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var oid = btn.getAttribute('data-toggle-ord').replace('#', '');
          var row = $('#items-' + oid);
          var chevron = btn.querySelector('svg');
          if (!row) return;
          var open = row.style.display === 'none';
          row.style.display = open ? 'table-row' : 'none';
          btn.classList.toggle('is-open', open);
          if (chevron) chevron.style.transform = open ? 'rotate(180deg)' : '';
        });
      });

      /* Status change */
      $$('[data-status]', tbody).forEach(function (sel) {
        sel.addEventListener('change', function () {
          var orderId = sel.getAttribute('data-status');
          var match = allOrders.filter(function (o) { return o.id === orderId; })[0];
          if (!match) return;
          match.status = sel.value;
          if (match.supabaseId) {
            toast('Real order changes are disabled in demo mode.', 'warn');
            return;
          } else {
            /* Demo/local order — persist to localStorage as before */
            var all = data.orders();
            all.forEach(function (o) { if (o.id === orderId) o.status = sel.value; });
            write(AK.orders, all);
            toast('Order ' + orderId + ' updated to ' + sel.value);
          }
          renderOrdersWithData({ orders: allOrders, failed: false });
        });
      });

      /* View modal */
      $$('[data-view]', tbody).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var o = allOrders.filter(function (x) { return x.id === btn.getAttribute('data-view'); })[0];
          if (!o) return;
          var itemsHtml = (o.productItems && o.productItems.length)
            ? '<table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:13px">' +
            '<thead><tr style="background:#f0f4ee">' +
            '<th style="padding:6px 10px;text-align:left">Product</th>' +
            '<th style="padding:6px 10px;text-align:center">Qty</th>' +
            '<th style="padding:6px 10px;text-align:right">Price</th>' +
            '<th style="padding:6px 10px;text-align:right">Subtotal</th>' +
            '</tr></thead><tbody>' +
            o.productItems.map(function (pi) {
              return '<tr style="border-bottom:1px solid #f0f0f0">' +
                '<td style="padding:8px 10px">' + pi.name + '</td>' +
                '<td style="padding:8px 10px;text-align:center">× ' + pi.qty + '</td>' +
                '<td style="padding:8px 10px;text-align:right">' + money(pi.price) + '</td>' +
                '<td style="padding:8px 10px;text-align:right;font-weight:600">' + money(pi.total) + '</td>' +
                '</tr>';
            }).join('') +
            '</tbody><tfoot><tr>' +
            '<td colspan="3" style="padding:10px;text-align:right;font-weight:700">Total</td>' +
            '<td style="padding:10px;text-align:right;font-weight:700;color:#16a34a">' + money(o.amount) + '</td>' +
            '</tr></tfoot></table>'
            : '<p style="color:#92a096">No item details recorded.</p>';

          openModal('Order ' + o.id,
            '<div style="display:flex;flex-direction:column;gap:6px;font-size:13px">' +
            '<p><b>Customer:</b> ' + o.customer + '</p>' +
            '<p><b>Email:</b> ' + o.email + '</p>' +
            '<p><b>Phone:</b> ' + (o.phone || 'N/A') + '</p>' +
            '<p><b>Date:</b> ' + formatDate(o.date) + '</p>' +
            '<p><b>Status:</b> <span class="status status--' + o.status.toLowerCase() + '">' + o.status + '</span></p>' +
            '<div style="margin-top:8px"><b>Items Ordered (' + o.items + '):</b>' + itemsHtml + '</div>' +
            '</div>',
            null
          );
        });
      });
    }

    /* ── Build page ──────────────────────────────────────── */
    var statCounts = {};
    ['all', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned'].forEach(function (s) {
      statCounts[s] = s === 'all' ? orders.length : orders.filter(function (o) { return o.status === s; }).length;
    });

    var dateLabel = (rs && re) ? fmtDate(rs) + ' – ' + fmtDate(re) : 'All time';

    content.innerHTML =
      banner +
      /* date-range info bar */
      '<div class="ord-date-bar">' +
      '<span class="ord-date-bar__label">📅 ' + dateLabel + '</span>' +
      '<span style="display:inline-flex;gap:10px;align-items:center">' +
      '<button class="btn-sm" id="ordRefresh">🔄 Refresh</button>' +
      '<span class="ord-date-bar__count">' + orders.length + ' order' + (orders.length !== 1 ? 's' : '') + '</span>' +
      '</span>' +
      '</div>' +
      '<div class="order-filters" id="orderFilters">' +
      ['all', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned'].map(function (s) {
        return '<button class="filter-btn' + (s === 'all' ? ' is-active' : '') + '" data-filter="' + s + '">' +
          (s === 'all' ? 'All' : s) + ' <span class="count">(' + statCounts[s] + ')</span></button>';
      }).join('') +
      '</div>' +
      '<div class="card"><div class="card__body" style="padding:0;overflow-x:auto">' +
      '<table class="admin-table"><thead><tr>' +
      '<th>Order ID</th><th>Customer</th><th>Email</th><th>Phone</th>' +
      '<th>Date</th><th>Items</th><th>Amount</th><th>Status</th><th>Actions</th>' +
      '</tr></thead>' +
      '<tbody id="ordersBody"></tbody></table></div></div>';

    bindOrdRefresh();
    render(applyFilters());

    $$('.filter-btn', content).forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('.filter-btn', content).forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        filterStatus = btn.getAttribute('data-filter');
        render(applyFilters());
      });
    });
  }

  function bindOrdRefresh() {
    var btn = $('#ordRefresh');
    if (btn) btn.addEventListener('click', function () {
      btn.disabled = true;
      btn.textContent = '⏳ Loading…';
      renderOrders();
    });
  }







  /* ============================================================ CUSTOMERS */
  var customersRequestId = 0;
  function mapSupabaseCustomer(row) {
    var name = escHtml((row.full_name || '').trim() || 'Customer');
    var email = escHtml((row.email || '').trim() || 'no-email');
    return {
      id: 'SB-' + row.id.slice(0, 8),
      name: name,
      email: email,
      phone: escHtml((row.phone || '').trim() || ''),
      city: escHtml((row.default_shipping_city || '').trim() || ''),
      orders: '—',
      total: null,
      joined: (row.created_at || '').slice(0, 10),
      address: row.default_shipping_address ? {
        door: escHtml(row.default_shipping_address),
        street: '',
        area: '',
        city: escHtml(row.default_shipping_city || ''),
        state: escHtml(row.default_shipping_state || ''),
        pin: escHtml(row.default_shipping_pincode || '')
      } : null,
      supabaseId: row.id
    };
  }

  function fetchSupabaseCustomers() {
    return demoAdminRequest('admin-customers').then(function (res) {
        if (!Array.isArray(res.customers)) throw new Error('Invalid admin customers response');
        return {
          customers: res.customers.map(mapSupabaseCustomer),
          failed: false,
          message: ''
        };
      })
      .catch(function (e) {
        console.warn('Supabase customers error:', e);
        return { customers: [], failed: true, message: (e && e.message) || String(e) };
      });
  }

  function loadRealCustomers() {
    return fetchSupabaseCustomers();
  }

  function renderCustomers() {
    var customers = [];
    customersRequestId++;
    content.innerHTML = '<p role="status">Loading customers from the admin backend…</p>';

    function custRows(list) {
      return list.map(function (c) {
        return '<tr>' +
          '<td>' + c.id + '</td>' +
          '<td><b>' + c.name + '</b></td>' +
          '<td>' + c.email + '</td>' +
          '<td>' + c.phone + '</td>' +
          '<td>' + c.city + '</td>' +
          '<td>' + c.orders + '</td>' +
          '<td>' + (c.total == null ? '—' : money(c.total)) + '</td>' +
          '<td>' + formatDate(c.joined) + '</td>' +
          '<td><button class="btn-sm" data-cust-view="' + c.id + '">👁️ Details</button></td>' +
          '</tr>';
      }).join('');
    }

    function bindViewBtns() {
      $$('[data-cust-view]', content).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var cid = btn.getAttribute('data-cust-view');
          var c = customers.filter(function (x) { return x.id === cid; })[0];
          if (!c) return;

          /* Customer orders with product details */
          var custOrders = [];

          /* Address block */
          var addr = c.address
            ? c.address.door + ', ' + c.address.street + ', ' + c.address.area + ',<br>' +
            c.address.city + ' - ' + c.address.pin + ', ' + c.address.state
            : c.city + ' (full address not available)';

          /* Orders table */
          var ordersHtml = custOrders.length
            ? '<table style="width:100%;border-collapse:collapse;margin-top:6px;font-size:12.5px">' +
            '<thead><tr style="background:#f0f4ee">' +
            '<th style="padding:6px 10px;text-align:left">Order ID</th>' +
            '<th style="padding:6px 10px;text-align:left">Date</th>' +
            '<th style="padding:6px 10px;text-align:left">Products</th>' +
            '<th style="padding:6px 10px;text-align:right">Amount</th>' +
            '<th style="padding:6px 10px;text-align:left">Status</th>' +
            '</tr></thead><tbody>' +
            custOrders.map(function (o) {
              var prods = (o.productItems && o.productItems.length)
                ? o.productItems.map(function (pi) {
                  return pi.name + ' × ' + pi.qty;
                }).join(', ')
                : o.items + ' item(s)';
              return '<tr style="border-bottom:1px solid #f0f0f0">' +
                '<td style="padding:8px 10px;font-weight:600">' + o.id + '</td>' +
                '<td style="padding:8px 10px">' + formatDate(o.date) + '</td>' +
                '<td style="padding:8px 10px;color:#4b7a57">' + prods + '</td>' +
                '<td style="padding:8px 10px;text-align:right;font-weight:600">' + money(o.amount) + '</td>' +
                '<td style="padding:8px 10px"><span class="status status--' + o.status.toLowerCase() + '">' + o.status + '</span></td>' +
                '</tr>';
            }).join('') +
            '</tbody></table>'
            : '<p style="color:#92a096;margin-top:6px">Order history is unavailable in this demo.</p>';

          openModal(c.name,
            '<div style="font-size:13px">' +
            /* ─ Contact ─ */
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin-bottom:16px">' +
            '<div><div style="font-size:11px;text-transform:uppercase;color:#92a096;font-weight:600;letter-spacing:.5px">Customer ID</div><div>' + c.id + '</div></div>' +
            '<div><div style="font-size:11px;text-transform:uppercase;color:#92a096;font-weight:600;letter-spacing:.5px">Phone</div><div>' + c.phone + '</div></div>' +
            '<div><div style="font-size:11px;text-transform:uppercase;color:#92a096;font-weight:600;letter-spacing:.5px">Email</div><div>' + c.email + '</div></div>' +
            '<div><div style="font-size:11px;text-transform:uppercase;color:#92a096;font-weight:600;letter-spacing:.5px">Member Since</div><div>' + formatDate(c.joined) + '</div></div>' +
            '<div><div style="font-size:11px;text-transform:uppercase;color:#92a096;font-weight:600;letter-spacing:.5px">Total Orders</div><div>' + c.orders + '</div></div>' +
            '<div><div style="font-size:11px;text-transform:uppercase;color:#92a096;font-weight:600;letter-spacing:.5px">Total Spent</div><div style="color:#16a34a;font-weight:700">—</div></div>' +
            '</div>' +
            /* ─ Delivery Address ─ */
            '<div style="background:#f4faf6;border:1px solid #c6e6d0;border-radius:10px;padding:12px 16px;margin-bottom:16px">' +
            '<div style="font-size:11px;text-transform:uppercase;color:#4b7a57;font-weight:700;letter-spacing:.5px;margin-bottom:6px">📦 Delivery Address</div>' +
            '<div style="line-height:1.7">' + addr + '</div>' +
            '</div>' +
            /* ─ Order History ─ */
            '<div style="font-size:11px;text-transform:uppercase;color:#92a096;font-weight:700;letter-spacing:.5px;margin-bottom:6px">🛒 Order History</div>' +
            ordersHtml +
            '</div>',
            null
          );
        });
      });
    }

    function renderRealCustomers() {
      var loadId = ++customersRequestId;
      loadRealCustomers().then(function (result) {
        if (pageTitle.textContent !== 'Customers' || loadId !== customersRequestId || document.getElementById('adminGate')?.style.display !== 'none') return;
        var banner = '';

        /* Never substitute seeded customer data for an unavailable admin API. */
        if (result.failed) {
          customers = [];
          banner =
            '<div style="background:#fff7e6;border:1px solid #f5c66b;color:#8a6100;border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:13px">' +
            '⚠️ <b>Admin backend unavailable</b> — no customers are displayed. Reason: ' + escHtml(result.message || 'unknown') +
            '</div>';
          renderCustomerTable(banner);
          return;
        }

        customers = result.customers || [];

        if (!customers.length) {
          banner =
            '<div style="background:#eef6fb;border:1px solid #bcd9ec;color:#1c5d8c;border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:13px">' +
            'ℹ️ Connected to Supabase, but no customer profiles were returned. Do not run older public-access SQL fixes.' +
            '</div>';
        }

        // No client-side name matching: it can attribute another customer's orders.
        renderCustomerTable(banner);
      });
    }

    function renderCustomerTable(bannerHtml) {
      content.innerHTML =
        (bannerHtml || '') +
        '<div class="page-toolbar">' +
        '<div class="search-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' +
        '<input type="text" id="custSearch" placeholder="Search customers..."></div>' +
        '<button class="btn-sm" id="custRefresh">🔄 Refresh</button>' +
        '<span class="text-muted">' + customers.length + ' customer' + (customers.length !== 1 ? 's' : '') + '</span>' +
        '</div>' +
        '<div class="card"><div class="card__body" style="padding:0;overflow-x:auto">' +
        '<table class="admin-table"><thead><tr>' +
        '<th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>City</th>' +
        '<th>Orders*</th><th>Total Spent*</th><th>Joined</th><th>Details</th>' +
        '</tr></thead>' +
        '<tbody id="custBody">' + (customers.length
          ? custRows(customers)
          : '<tr><td colspan="9" style="text-align:center;color:#92a096;padding:24px">No customers found.</td></tr>') +
        '</tbody></table><p class="small muted" style="padding:10px">* Order count and spend are unavailable in this demo; zero is not a financial report.</p></div></div>';

      bindViewBtns();
      bindRefreshBtn();

      $('#custSearch').addEventListener('input', function () {
        var q = this.value.toLowerCase();
        var filtered = customers.filter(function (c) {
          return c.name.toLowerCase().indexOf(q) > -1 ||
            c.email.toLowerCase().indexOf(q) > -1 ||
            c.city.toLowerCase().indexOf(q) > -1 ||
            c.phone.indexOf(q) > -1;
        });
        $('#custBody').innerHTML = filtered.length
          ? custRows(filtered)
          : '<tr><td colspan="9" style="text-align:center;color:#92a096;padding:24px">No matches found.</td></tr>';
        bindViewBtns();
      });
    }

    function bindRefreshBtn() {
      var btn = $('#custRefresh');
      if (btn) btn.addEventListener('click', function () {
        btn.disabled = true;
        btn.textContent = '⏳ Loading…';
        renderRealCustomers();
      });
    }

    renderRealCustomers();
  }

  function customerRows(list) {
    return list.map(function (c) {
      return '<tr><td>' + c.id + '</td><td><b>' + c.name + '</b></td><td>' + c.email + '</td><td>' + c.phone + '</td><td>' + c.city + '</td><td>' + c.orders + '</td><td>' + money(c.total) + '</td><td>' + formatDate(c.joined) + '</td></tr>';
    }).join('');
  }

  /* ============================================================ REVIEWS */
  function renderReviews() {
    var reviews = data.reviews();
    content.innerHTML =
      '<div class="page-toolbar"><h3 style="font-size:15px;font-weight:600">' + reviews.length + ' Reviews</h3></div>' +
      '<div class="card"><div class="card__body" style="padding:0;overflow-x:auto">' +
      '<table class="admin-table"><thead><tr><th>Product</th><th>Customer</th><th>Rating</th><th>Review</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>' +
      '<tbody>' + reviews.map(function (r) {
        return '<tr><td><b>' + r.product + '</b></td><td>' + r.customer + '</td><td>' + '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating) + '</td>' +
          '<td style="max-width:200px">' + r.text + '</td><td>' + formatDate(r.date) + '</td>' +
          '<td><span class="status status--' + (r.status === 'approved' ? 'delivered' : r.status === 'pending' ? 'processing' : 'cancelled') + '">' + r.status + '</span></td>' +
          '<td><button class="btn-sm" data-approve="' + r.id + '">✅</button> <button class="btn-sm btn-sm--danger" data-reject="' + r.id + '">❌</button></td></tr>';
      }).join('') + '</tbody></table></div></div>';

    $$('[data-approve]', content).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var all = data.reviews();
        all.forEach(function (r) { if (r.id === btn.getAttribute('data-approve')) r.status = 'approved'; });
        write(AK.reviews, all); toast('Review approved!'); renderReviews();
      });
    });
    $$('[data-reject]', content).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var all = data.reviews();
        all.forEach(function (r) { if (r.id === btn.getAttribute('data-reject')) r.status = 'flagged'; });
        write(AK.reviews, all); toast('Review flagged!', 'warn'); renderReviews();
      });
    });
  }

  /* ============================================================ COUPONS */
  function renderCoupons() {
    var coupons = data.coupons();
    content.innerHTML =
      '<div class="page-toolbar"><h3 style="font-size:15px;font-weight:600">' + coupons.length + ' Coupons</h3>' +
      '<button class="btn-sm btn-sm--primary" id="addCouponBtn">+ Add Coupon</button></div>' +
      '<div class="card"><div class="card__body" style="padding:0;overflow-x:auto">' +
      '<table class="admin-table"><thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Min Order</th><th>Used</th><th>Max Uses</th><th>Expiry</th><th>Status</th><th>Actions</th></tr></thead>' +
      '<tbody>' + coupons.map(function (c) {
        return '<tr><td><b style="color:var(--green-600)">' + c.code + '</b></td><td>' + (c.type === 'percent' ? 'Percentage' : 'Flat') + '</td>' +
          '<td>' + (c.type === 'percent' ? c.value + '%' : money(c.value)) + '</td><td>' + money(c.minOrder) + '</td>' +
          '<td>' + c.uses + '</td><td>' + c.maxUses + '</td><td>' + formatDate(c.expiry) + '</td>' +
          '<td><span class="status ' + (c.active ? 'status--delivered' : 'status--cancelled') + '">' + (c.active ? 'Active' : 'Expired') + '</span></td>' +
          '<td><button class="btn-sm" data-toggle-coupon="' + c.id + '">' + (c.active ? '⏸️' : '▶️') + '</button> <button class="btn-sm btn-sm--danger" data-del-coupon="' + c.id + '">🗑️</button></td></tr>';
      }).join('') + '</tbody></table></div></div>';

    $('#addCouponBtn').addEventListener('click', function () {
      openModal('Add Coupon',
        '<div class="form-row"><div class="form-group"><label>Coupon Code</label><input class="form-control" id="cpCode" placeholder="e.g. SUMMER20"></div>' +
        '<div class="form-group"><label>Discount Type</label><select class="form-control" id="cpType"><option value="percent">Percentage</option><option value="flat">Flat Amount</option></select></div></div>' +
        '<div class="form-row"><div class="form-group"><label>Value</label><input class="form-control" id="cpValue" type="number" placeholder="10"></div>' +
        '<div class="form-group"><label>Min Order</label><input class="form-control" id="cpMin" type="number" placeholder="500"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>Max Uses</label><input class="form-control" id="cpMax" type="number" placeholder="200"></div>' +
        '<div class="form-group"><label>Expiry Date</label><input class="form-control" id="cpExpiry" type="date"></div></div>',
        function (m) {
          var code = m.querySelector('#cpCode').value.toUpperCase();
          if (!code) { toast('Enter a coupon code', 'error'); return; }
          var all = data.coupons();
          all.push({
            id: 'CP' + (all.length + 1).toString().padStart(2, '0'),
            code: code,
            type: m.querySelector('#cpType').value,
            value: parseInt(m.querySelector('#cpValue').value) || 10,
            minOrder: parseInt(m.querySelector('#cpMin').value) || 500,
            maxDiscount: 500,
            uses: 0,
            maxUses: parseInt(m.querySelector('#cpMax').value) || 200,
            active: true,
            expiry: m.querySelector('#cpExpiry').value || '2025-12-31'
          });
          write(AK.coupons, all);
          toast('Coupon ' + code + ' created!');
          renderCoupons();
        }
      );
    });

    $$('[data-toggle-coupon]', content).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var all = data.coupons();
        all.forEach(function (c) { if (c.id === btn.getAttribute('data-toggle-coupon')) c.active = !c.active; });
        write(AK.coupons, all); renderCoupons();
      });
    });

    $$('[data-del-coupon]', content).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-del-coupon');
        var all = data.coupons().filter(function (c) { return c.id !== id; });
        write(AK.coupons, all); toast('Coupon deleted'); renderCoupons();
      });
    });
  }

  /* ============================================================ BANNERS */
  function getBannerFormHTML(b) {
    b = b || {};
    return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">' +
      /* Title — full width */
      '<div style="grid-column:1/-1">' +
      '<label class="field-label" for="bTitle">Banner Title *</label>' +
      '<input id="bTitle" class="field-input" placeholder="Enter banner title" value="' + (b.title || '') + '">' +
      '</div>' +
      /* Link URL */
      '<div>' +
      '<label class="field-label" for="bLink">Link URL</label>' +
      '<input id="bLink" class="field-input" placeholder="e.g. products.html?cat=oils" value="' + (b.link || '') + '">' +
      '</div>' +
      /* Position */
      '<div>' +
      '<label class="field-label" for="bPosition">Position</label>' +
      '<select id="bPosition" class="field-input">' +
      '<option value="hero"' + (b.position === 'hero' ? ' selected' : '') + '>Hero Slider</option>' +
      '<option value="promo"' + (b.position === 'promo' ? ' selected' : '') + '>Promo Bar</option>' +
      '<option value="sidebar"' + (b.position === 'sidebar' ? ' selected' : '') + '>Sidebar</option>' +
      '</select>' +
      '</div>' +
      /* Order */
      '<div>' +
      '<label class="field-label" for="bOrder">Display Order</label>' +
      '<input id="bOrder" type="number" class="field-input" min="1" max="20" value="' + (b.order || 1) + '">' +
      '</div>' +
      /* Active toggle */
      '<div>' +
      '<label class="field-label">Status</label>' +
      '<label class="toggle-switch" style="margin-top:4px">' +
      '<input id="bActive" type="checkbox"' + (b.active !== false ? ' checked' : '') + '>' +
      '<span class="toggle-switch__track"></span>' +
      '<span class="toggle-switch__label">Active</span>' +
      '</label>' +
      '</div>' +
      /* Image — full width */
      '<div style="grid-column:1/-1">' +
      '<label class="field-label">Banner Image *</label>' +
      '<input type="file" id="bImgFile" accept="image/*" style="display:none">' +
      '<input type="hidden" id="bImg" value="' + (b.image || '') + '">' +
      '<div id="bImgDropzone" class="img-dropzone"' + (b.image ? ' style="display:none"' : '') + '>' +
      '<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#92a096" stroke-width="1.5" style="margin-bottom:6px"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>' +
      '<p style="margin:0;font-size:14px;font-weight:600;color:#4a5548">Click to upload or drag & drop</p>' +
      '<p style="margin:4px 0 0;font-size:12px;color:#92a096">PNG, JPG up to 5MB · Recommended 1600×800px</p>' +
      '</div>' +
      '<div id="bImgPreview" class="img-preview"' + (!b.image ? ' style="display:none"' : '') + '>' +
      '<img id="bImgThumb" src="' + (b.image || '') + '" style="max-height:140px;border-radius:8px;object-fit:cover">' +
      '<span id="bImgInfo" style="font-size:12px;color:#6f7d72;margin-top:6px">Current image</span>' +
      '<button type="button" id="bImgRemove" class="btn-sm btn-sm--danger" style="margin-top:8px">Remove Image</button>' +
      '</div>' +
      '</div>' +
      '</div>';
  }

  function initBannerImgUpload(modal) {
    var fileInput = modal.querySelector('#bImgFile');
    var dropzone = modal.querySelector('#bImgDropzone');
    var preview = modal.querySelector('#bImgPreview');
    var thumb = modal.querySelector('#bImgThumb');
    var info = modal.querySelector('#bImgInfo');
    var removeBtn = modal.querySelector('#bImgRemove');
    var hiddenInput = modal.querySelector('#bImg');

    function compressImg(file, cb) {
      var img = new Image();
      img.onload = function () {
        var w = img.width, h = img.height, maxW = 1600, maxH = 800;
        if (w > maxW || h > maxH) { var r = Math.min(maxW / w, maxH / h); w = Math.round(w * r); h = Math.round(h * r); }
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        var cctx = c.getContext('2d');
        /* White backdrop — a transparent PNG must not flatten to black in JPEG */
        cctx.fillStyle = '#ffffff';
        cctx.fillRect(0, 0, w, h);
        cctx.drawImage(img, 0, 0, w, h);
        cb(encodeImage(c, IMG_KB.banner));
      };
      img.src = URL.createObjectURL(file);
    }

    function handleFile(file) {
      if (!file || !file.type.startsWith('image/')) { toast('Select a valid image', 'error'); return; }
      if (file.size > 5 * 1024 * 1024) { toast('Image must be under 5MB', 'error'); return; }
      compressImg(file, function (dataUrl) {
        hiddenInput.value = dataUrl; thumb.src = dataUrl;
        info.textContent = file.name + ' (compressed)';
        dropzone.style.display = 'none'; preview.style.display = 'block';
      });
    }

    dropzone.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () { if (fileInput.files[0]) handleFile(fileInput.files[0]); });
    dropzone.addEventListener('dragover', function (e) { e.preventDefault(); dropzone.style.borderColor = '#2f8f43'; });
    dropzone.addEventListener('dragleave', function (e) { e.preventDefault(); dropzone.style.borderColor = '#ccd5cc'; });
    dropzone.addEventListener('drop', function (e) { e.preventDefault(); dropzone.style.borderColor = '#ccd5cc'; if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });
    removeBtn.addEventListener('click', function () {
      hiddenInput.value = ''; thumb.src = ''; fileInput.value = '';
      preview.style.display = 'none'; dropzone.style.display = '';
    });
  }

  function readBannerForm(modal) {
    var title = modal.querySelector('#bTitle').value.trim();
    var image = modal.querySelector('#bImg').value;
    if (!title) { toast('Banner title is required', 'error'); return null; }
    if (!image) { toast('Please upload a banner image', 'error'); return null; }
    return {
      title: title,
      link: modal.querySelector('#bLink').value.trim() || '',
      image: image,
      position: modal.querySelector('#bPosition').value,
      order: parseInt(modal.querySelector('#bOrder').value) || 1,
      active: modal.querySelector('#bActive').checked
    };
  }

  function renderBanners() {
    var banners = data.banners();
    content.innerHTML =
      '<div class="page-toolbar"><h3 style="font-size:15px;font-weight:600">' + banners.length + ' Banners</h3>' +
      '<button class="btn-sm btn-sm--primary" id="addBannerBtn">+ Add Banner</button></div>' +
      '<div class="product-grid">' + banners.map(function (b, idx) {
        var uid = b.id + '__' + idx;
        return '<div class="product-admin-card">' +
          '<div class="product-admin-card__img" style="height:160px"><img src="' + b.image + '" alt="' + b.title + '" onerror="this.style.display=\'none\'"></div>' +
          '<div class="product-admin-card__body">' +
          '<div class="product-admin-card__name">' + b.title + '</div>' +
          '<div class="product-admin-card__cat">Position: ' + b.position + ' · Order: ' + b.order + '</div>' +
          (b.link ? '<div style="font-size:11px;color:var(--blue);margin-top:4px;word-break:break-all">' + b.link + '</div>' : '') +
          '<div class="product-admin-card__meta" style="margin-top:8px">' +
          '<span class="product-admin-card__stock ' + (b.active ? 'in' : 'out') + '">' + (b.active ? '● Active' : '● Paused') + '</span>' +
          '</div>' +
          '<div class="product-admin-card__actions">' +
          '<button class="btn-sm" data-edit-banner="' + uid + '">✏️ Edit</button>' +
          '<button class="btn-sm" data-toggle-banner="' + uid + '">' + (b.active ? '⏸️ Pause' : '▶️ Activate') + '</button>' +
          '<button class="btn-sm btn-sm--danger" data-del-banner="' + uid + '">🗑️ Delete</button>' +
          '</div>' +
          '</div></div>';
      }).join('') + '</div>';

    // Build lookup
    var bannerByUid = {};
    banners.forEach(function (b, idx) { bannerByUid[b.id + '__' + idx] = b; });

    // Add Banner
    $('#addBannerBtn').addEventListener('click', function () {
      var modal = openModal('Add New Banner', getBannerFormHTML(), function (m) {
        var banner = readBannerForm(m);
        if (!banner) return false;
        banner.id = 'B' + Date.now();
        var all = data.banners();
        all.push(banner);
        var saved = write(AK.banners, all);
        if (!saved) {
          banner.image = '';
          all[all.length - 1] = banner;
          if (!write(AK.banners, all)) { toast('Storage full', 'error'); return false; }
          toast('Banner saved without image', 'warn');
        } else {
          toast('Banner "' + banner.title + '" added!');
        }
        renderBanners();
      });
      initBannerImgUpload(modal);
    });

    // Edit Banner
    $$('[data-edit-banner]', content).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var uid = btn.getAttribute('data-edit-banner');
        var b = bannerByUid[uid];
        if (!b) return;
        var modal = openModal('Edit Banner', getBannerFormHTML(b), function (m) {
          var updated = readBannerForm(m);
          if (!updated) return false;
          var all = data.banners();
          for (var i = 0; i < all.length; i++) {
            if (all[i].id === b.id) { updated.id = b.id; all[i] = updated; break; }
          }
          write(AK.banners, all);
          toast('Banner "' + updated.title + '" updated!');
          renderBanners();
        });
        initBannerImgUpload(modal);
      });
    });

    // Toggle Pause/Activate
    $$('[data-toggle-banner]', content).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var uid = btn.getAttribute('data-toggle-banner');
        var b = bannerByUid[uid];
        if (!b) return;
        var all = data.banners();
        var newState = !b.active;
        all.forEach(function (x) { if (x.id === b.id) x.active = newState; });
        write(AK.banners, all);
        toast(newState ? '▶️ Banner activated' : '⏸️ Banner paused');
        renderBanners();
      });
    });

    // Delete Banner
    $$('[data-del-banner]', content).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var uid = btn.getAttribute('data-del-banner');
        var b = bannerByUid[uid];
        if (!b) return;
        openModal('Delete Banner',
          '<div style="text-align:center;padding:10px 0">' +
          '<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#dc3545" stroke-width="1.5" style="margin:0 auto 12px"><path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.9 12.4h9.2L17.5 7"/></svg>' +
          '<h4 style="font-size:16px;margin-bottom:6px">Delete "' + b.title + '"?</h4>' +
          '<p style="color:#6f7d72;font-size:13px">This banner will be permanently removed.</p></div>',
          function () {
            var all = data.banners().filter(function (x) { return x.id !== b.id; });
            write(AK.banners, all);
            toast('Banner "' + b.title + '" deleted.');
            renderBanners();
          },
          'Delete'
        );
      });
    });
  }

  /* ============================================================ REPORTS */
  function renderReports() {
    content.innerHTML = '<div class="card"><div class="card__body"><h3>Real revenue report unavailable in demo mode</h3><p>No demo payment attempts count as revenue or confirmed orders. View test attempts under Payment Gateway — DEMO.</p></div></div>';
  }

  function drawSalesChart2(id) {
    var canvas = $('#' + id);
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.parentElement.offsetWidth;
    var H = 280;
    canvas.width = W * 2; canvas.height = H * 2;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.scale(2, 2);

    var vals = [42000, 55000, 48000, 72000, 63000, 85000, 78000];
    var max = 100000;
    var padL = 65, padR = 20, padT = 20, padB = 40;
    var cW = W - padL - padR, cH = H - padT - padB;
    var barW = cW / vals.length * 0.6;

    vals.forEach(function (v, i) {
      var x = padL + cW * i / vals.length + (cW / vals.length - barW) / 2;
      var bH = cH * v / max;
      var y = padT + cH - bH;
      var grad = ctx.createLinearGradient(0, y, 0, y + bH);
      grad.addColorStop(0, '#2f8f43'); grad.addColorStop(1, '#16a34a88');
      ctx.fillStyle = grad;
      drawRoundRect(ctx, x, y, barW, bH, 4); ctx.fill();

      ctx.fillStyle = '#92a096'; ctx.font = '10px Inter'; ctx.textAlign = 'center';
      var d = new Date(); d.setDate(d.getDate() - 6 + i);
      ctx.fillText(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), x + barW / 2, H - 10);
    });
  }

  function drawCatChart() {
    var canvas = $('#catChart');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var S = 240, HS = 280;
    canvas.width = S * 2; canvas.height = HS * 2;
    canvas.style.width = S + 'px'; canvas.style.height = HS + 'px';
    ctx.scale(2, 2);

    var slices = [
      { label: 'Oils', val: 35, color: '#16a34a' },
      { label: 'Rice', val: 22, color: '#f59e0b' },
      { label: 'Body Care', val: 15, color: '#3b82f6' },
      { label: 'Pickles', val: 12, color: '#ef4444' },
      { label: 'Health Mix', val: 10, color: '#8b5cf6' },
      { label: 'Other', val: 6, color: '#94a3b8' }
    ];
    var cx = S / 2, cy = 110, r = 80, inner = 50;
    var total = slices.reduce(function (s, x) { return s + x.val; }, 0);
    var start = -Math.PI / 2;
    slices.forEach(function (s) {
      var angle = (s.val / total) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, start + angle);
      ctx.fillStyle = s.color; ctx.fill();
      start += angle;
    });
    ctx.beginPath(); ctx.arc(cx, cy, inner, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();

    // Legend
    ctx.font = '11px Inter'; ctx.textAlign = 'left';
    slices.forEach(function (s, i) {
      var lx = 10 + (i % 3) * 80, ly = 210 + Math.floor(i / 3) * 22;
      ctx.fillStyle = s.color;
      ctx.fillRect(lx, ly - 4, 8, 8);
      ctx.fillStyle = '#3f5045';
      ctx.fillText(s.label + ' ' + s.val + '%', lx + 12, ly + 4);
    });
  }

  /* ============================================================ SETTINGS */
  /* Eye icons (open / closed) reused for every password toggle */
  var PW_EYE_SVG =
    '<svg class="pw-eye-open" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7.5 11-7.5S23 12 23 12s-4 7.5-11 7.5S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>' +
    '<svg class="pw-eye-off" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:none"><path d="M17.94 17.94A10.5 10.5 0 0112 19.5C5 19.5 1 12 1 12a19.8 19.8 0 015.06-5.94M9.9 4.24A10.5 10.5 0 0112 4.5c7 0 11 7.5 11 7.5a19.8 19.8 0 01-3.22 4.19M1 1l22 22"/><path d="M14.12 14.12a3 3 0 11-4.24-4.24"/></svg>';

  function renderSettings() {
    var settings = read(AK.settings, {
      storeName: 'Shanmuga Organics',
      storeEmail: 'info@shanmugaorganics.com',
      storePhone: '+91 638 004 0001',
      address: 'Dharapuram Road, Erode, Tamil Nadu - 638 004',
      currency: 'INR',
      taxRate: 5,
      freeShipMin: 999,
      enableCod: true,
      enableOnline: true,
      maintenanceMode: false
    });

    content.innerHTML =
      '<div class="settings-grid">' +
      '<div class="settings-card"><h4>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9.5L5 4h14l2 5.5"/><path d="M4 9.5h16V20H4z"/></svg>' +
      'Store Information</h4>' +
      '<div class="form-group"><label>Store Name</label><input class="form-control" id="sName" value="' + settings.storeName + '"></div>' +
      '<div class="form-group"><label>Email</label><input class="form-control" id="sEmail" value="' + settings.storeEmail + '"></div>' +
      '<div class="form-group"><label>Phone</label><input class="form-control" id="sPhone" value="' + settings.storePhone + '"></div>' +
      '<div class="form-group"><label>Address</label><textarea class="form-control" id="sAddr">' + settings.address + '</textarea></div>' +
      '<button class="btn-sm btn-sm--primary" id="saveStoreInfo">Save Changes</button>' +
      '</div>' +

      '<div class="settings-card"><h4>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>' +
      'Payment & Shipping</h4>' +
      '<div class="form-row">' +
      '<div class="form-group"><label>Currency</label><select class="form-control" id="sCurr"><option selected>INR (₹)</option><option>USD ($)</option></select></div>' +
      '<div class="form-group"><label>Tax Rate (%)</label><input class="form-control" id="sTax" type="number" value="' + settings.taxRate + '"></div>' +
      '</div>' +
      '<div class="form-group"><label>Free Shipping Minimum (₹)</label><input class="form-control" id="sFreeShip" type="number" value="' + settings.freeShipMin + '"></div>' +
      '<div class="form-group">' +
      '<div class="switch"><input type="checkbox" id="sCod"' + (settings.enableCod ? ' checked' : '') + '><label class="switch__track" for="sCod"></label><span class="switch__label">Cash on Delivery</span></div>' +
      '</div>' +
      '<div class="form-group">' +
      '<div class="switch"><input type="checkbox" id="sOnline"' + (settings.enableOnline ? ' checked' : '') + '><label class="switch__track" for="sOnline"></label><span class="switch__label">Online Payment (UPI/Card)</span></div>' +
      '</div>' +
      '<button class="btn-sm btn-sm--primary" id="savePayment">Save Changes</button>' +
      '</div>' +

      '<div class="settings-card"><h4>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33"/></svg>' +
      'General Settings</h4>' +
      '<div class="form-group">' +
      '<div class="switch"><input type="checkbox" id="sMaint"' + (settings.maintenanceMode ? ' checked' : '') + '><label class="switch__track" for="sMaint"></label><span class="switch__label">Maintenance Mode</span></div>' +
      '<p style="margin:6px 0 0;font-size:11px;color:#98a29a">ON — the storefront shows a maintenance screen to visitors. OFF — the store is live.</p>' +
      '</div>' +
      '<div class="form-group mt-16"><label>Admin Password (Supabase account)</label>' +
      '<div style="position:relative">' +
      '<input class="form-control" type="password" placeholder="Enter new password" id="sPass" style="padding-right:44px">' +
      '<button type="button" class="pw-eye" data-eye="sPass" aria-label="Show password" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:transparent;border:none;cursor:pointer;color:#9aa79b;padding:2px;display:flex;align-items:center">' + PW_EYE_SVG + '</button>' +
      '</div></div>' +
      '<div class="form-group"><label>Confirm Password</label>' +
      '<div style="position:relative">' +
      '<input class="form-control" type="password" placeholder="Re-enter new password" id="sPass2" style="padding-right:44px">' +
      '<button type="button" class="pw-eye" data-eye="sPass2" aria-label="Show password" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:transparent;border:none;cursor:pointer;color:#9aa79b;padding:2px;display:flex;align-items:center">' + PW_EYE_SVG + '</button>' +
      '</div></div>' +
      '<button class="btn-sm btn-sm--primary" id="saveGeneral">Save Changes</button>' +
      '</div>' +

      '<div class="settings-card"><h4>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16v16H4z"/><path d="M4 10h16M10 4v16"/></svg>' +
      'Quick Actions</h4>' +
      '<div style="display:flex;flex-direction:column;gap:10px">' +
      '<button class="btn-sm" id="clearData">🗑️ Clear Demo Data</button>' +
      '<button class="btn-sm" id="resetData">🔄 Reset to Default Data</button>' +
      '<button class="btn-sm" id="exportAll">📦 Export All Data (JSON)</button>' +
      '</div>' +
      '</div>' +
      '</div>';

    // Save buttons (Store Info + Payment)
    ['saveStoreInfo', 'savePayment'].forEach(function (id) {
      var btn = $('#' + id);
      if (btn) btn.addEventListener('click', function () {
        var s = {
          storeName: $('#sName').value,
          storeEmail: $('#sEmail').value,
          storePhone: $('#sPhone').value,
          address: $('#sAddr').value,
          taxRate: parseInt($('#sTax').value) || 5,
          freeShipMin: parseInt($('#sFreeShip').value) || 999,
          enableCod: $('#sCod').checked,
          enableOnline: $('#sOnline').checked,
          maintenanceMode: $('#sMaint').checked
        };
        write(AK.settings, s);
        toast('Settings saved!');
      });
    });

    // General settings: Maintenance Mode + real Supabase password change
    $('#saveGeneral').addEventListener('click', function () {
      var btn = this;

      /* 1) Persist settings (merge so other keys are preserved) */
      var s = read(AK.settings, {
        storeName: 'Shanmuga Organics',
        storeEmail: 'info@shanmugaorganics.com',
        storePhone: '+91 638 004 0001',
        address: 'Dharapuram Road, Erode, Tamil Nadu - 638 004',
        currency: 'INR',
        taxRate: 5,
        freeShipMin: 999,
        enableCod: true,
        enableOnline: true,
        maintenanceMode: false
      });
      s.maintenanceMode = $('#sMaint').checked;
      write(AK.settings, s);

      /* 2) Optional password change — updates the signed-in Supabase
            admin account (admin@shanmugaorganics.in) */
      var p1 = $('#sPass').value;
      var p2 = $('#sPass2').value;
      if (p1 || p2) {
        if (p1.length < 8) { toast('Password must be at least 8 characters', 'error'); return; }
        if (p1 !== p2) { toast('Passwords do not match', 'error'); return; }
        if (!window.SupabaseClient || !window.SupabaseClient.auth) {
          toast('⚠️ Supabase not loaded — settings saved, password NOT changed.', 'warn');
          return;
        }
        btn.disabled = true;
        btn.textContent = '⏳ Updating password…';
        window.SupabaseClient.auth.updateUser({ password: p1 }).then(function (res) {
          btn.disabled = false;
          btn.textContent = 'Save Changes';
          if (res && res.error) {
            var em = (res.error && res.error.message) || 'unknown';
            if (/session/i.test(em)) {
              /* Stale/expired session — force a fresh sign-in */
              toast('⚠️ Session expired — please sign in again with your admin account.', 'warn');
              try { window.SupabaseClient.auth.signOut(); } catch (e) { /* ignore */ }
              showAdminGate();
            } else {
              toast('❌ Password change failed: ' + em, 'error');
            }
            return;
          }
          $('#sPass').value = '';
          $('#sPass2').value = '';
          toast('✅ Supabase admin password changed! Use the new password next time you sign in.');
        });
        return;
      }

      toast(s.maintenanceMode
        ? '🛠️ Maintenance Mode ON — the storefront now shows the maintenance screen.'
        : '✅ Settings saved! Store is live.');
    });

    /* Eye toggles for the password fields on this page */
    $$('.pw-eye').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var input = $('#' + btn.getAttribute('data-eye'));
        var open = btn.querySelector('.pw-eye-open');
        var off = btn.querySelector('.pw-eye-off');
        var reveal = input.type === 'password';
        input.type = reveal ? 'text' : 'password';
        open.style.display = reveal ? 'none' : 'block';
        off.style.display = reveal ? 'block' : 'none';
        btn.setAttribute('aria-label', reveal ? 'Hide password' : 'Show password');
      });
    });

    // Quick actions
    $('#clearData').addEventListener('click', function () {
      Object.values(AK).forEach(function (k) { localStorage.removeItem(k); });
      toast('All demo data cleared!'); renderSettings();
    });
    $('#resetData').addEventListener('click', function () {
      Object.values(AK).forEach(function (k) { localStorage.removeItem(k); });
      seedOrders(); seedCustomers(); seedCoupons(); seedReviews(); seedBanners();
      toast('Data reset to defaults!'); renderSettings();
    });
    $('#exportAll').addEventListener('click', function () {
      var blob = new Blob([JSON.stringify({
        orders: data.orders(),
        customers: data.customers(),
        coupons: data.coupons(),
        reviews: data.reviews(),
        banners: data.banners()
      }, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'shanmuga_admin_export.json';
      a.click();
      toast('Data exported!');
    });
  }

  /* ============================================================ HELPERS */
  function formatDate(str) {
    if (!str) return '';
    var d = new Date(str);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  /* ============================================================ AUTH GATE */
  /* Admin page must never open without a Supabase sign-in. On load we
     check the session; if absent we hide the dashboard and show a login
     screen. Wrong credentials / unverified email keep the gate closed. */
  var ADMIN_STORAGE_KEY = 'so_admin_session_v1';
  var adminAuthAttempt = 0;
  var adminLoginServiceLoading = null;
  var adminPluginPath = window.adminPluginPath || 'plugins/supabase/';

  /* Hosting may have a stale/incomplete plugins/ upload or block third-party
     scripts. Retry the local SDK first, then the CDN; the project-specific
     client must still load from this site's own plugins/ directory. */
  function loadAdminScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      var timer = setTimeout(function () {
        script.remove();
        reject(new Error('Script load timed out: ' + src));
      }, 6000);
      script.src = src;
      script.onload = function () { clearTimeout(timer); resolve(); };
      script.onerror = function () {
        clearTimeout(timer);
        script.remove();
        reject(new Error('Could not load ' + src));
      };
      document.head.appendChild(script);
    });
  }

  function ensureAdminLoginService() {
    if (window.SupabaseClient && window.Supabase && typeof window.Supabase.signIn === 'function') {
      return Promise.resolve();
    }
    /* A localhost page without the preview server's injected config cannot
       authenticate against LOCAL Supabase. Don't misreport this as a missing
       SDK (or fall back to the hosted project). */
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(location.origin) &&
        (!window.__soSupabaseConfig || !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(window.__soSupabaseConfig.url || ''))) {
      return Promise.reject(new Error('Local Supabase configuration unavailable. Open http://localhost:4173/admin.html using npm run dev:local (not Live Server), and make sure Docker Supabase is running.'));
    }
    if (adminLoginServiceLoading) return adminLoginServiceLoading;
    adminLoginServiceLoading = (async function () {
      if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        try {
          await loadAdminScript(adminPluginPath + 'supabase.umd.js?retry=' + Date.now());
        } catch (e) { /* Try the CDN if local SDK is not deployed. */ }
        if (!window.supabase || typeof window.supabase.createClient !== 'function') {
          await loadAdminScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.0');
        }
      }
      if (!window.SupabaseClient || !window.Supabase || typeof window.Supabase.signIn !== 'function') {
        try {
          await loadAdminScript(adminPluginPath + 'supabase-client.js?v=6&retry=' + Date.now());
        } catch (e) {
          throw new Error('Project login client missing: check ' + adminPluginPath + 'supabase-client.js (or deploy the complete dist/ folder).');
        }
      }
      if (!window.SupabaseClient || !window.Supabase || typeof window.Supabase.signIn !== 'function') {
        throw new Error('Login client could not initialize. Deploy dist/plugins/supabase/supabase-client.js and refresh.');
      }
    })().catch(function (error) {
      console.warn('Admin login service unavailable:', error);
      if (error.message && error.message.indexOf('Project login client missing:') === 0) throw error;
      throw new Error('Login SDK unavailable. Deploy plugins/supabase/supabase.umd.js from dist/ and refresh, or check your connection.');
    }).finally(function () { adminLoginServiceLoading = null; });
    return adminLoginServiceLoading;
  }

  function adminAuthWithTimeout(promise, ms) {
    var timer;
    return Promise.race([
      promise,
      new Promise(function (_, reject) {
        timer = setTimeout(function () { reject(new Error('auth-timeout')); }, ms);
      })
    ]).finally(function () { clearTimeout(timer); });
  }

  function adminGateElements() {
    return {
      layout: document.getElementById('adminLayout'),
      gate: document.getElementById('adminGate')
    };
  }
  function showAdminUI() {
    var el = adminGateElements();
    if (el.layout) el.layout.style.display = '';
    if (el.gate) el.gate.style.display = 'none';
  }
  function showAdminGate() {
    var el = adminGateElements();
    if (el.layout) el.layout.style.display = 'none';
    if (el.gate) el.gate.style.display = 'flex';
  }

  function ensureAdminAuth() {
    var attempt = adminAuthAttempt;
    var S = window.Supabase;
    var client = window.SupabaseClient;
    if (!client || !S || typeof S.isAuthenticated !== 'function') {
      /* Supabase failed to load — fail closed (never expose the dashboard) */
      showAdminGate();
      return Promise.resolve(false);
    }
    return adminAuthWithTimeout(Promise.resolve().then(function () { return S.isAuthenticated(); }), 6000).then(function (isAuth) {
      if (attempt !== adminAuthAttempt) return false;
      if (!isAuth) { showAdminGate(); return false; }
      /* A local session exists — but it may be STALE (e.g. the account was
         deleted or its tokens revoked in Supabase). Verify it against the
         server with getUser() before revealing the dashboard. */
      return adminAuthWithTimeout(client.auth.getUser(), 6000).then(function (gu) {
        if (attempt !== adminAuthAttempt) return false;
        if (!gu || !gu.data || !gu.data.user) { showAdminGate(); return false; }
        return adminAuthWithTimeout(demoAdminRequest('admin-check'), 6000).then(function (approval) {
          if (attempt !== adminAuthAttempt || !approval.admin) return false;
          showAdminUI(); return true;
        });
      }).catch(function () {
        if (attempt === adminAuthAttempt) showAdminGate();
        return false;
      });
    }).catch(function () {
      if (attempt === adminAuthAttempt) showAdminGate();
      return false;
    });
  }

  function handleAdminSignOut() {
    adminAuthAttempt++;
    dashboardRequestId++;
    ordersRequestId++;
    customersRequestId++;
    paymentLoadId++;
    var S = window.Supabase;
    if (S && typeof S.signOut === 'function') {
      S.signOut();
    }
    try { localStorage.removeItem(ADMIN_STORAGE_KEY); } catch (e) { /* ignore */ }
    showAdminGate();
  }

  /* ============================================================ INIT */
  /* ============================================================ PROFILE === */
  function initSidebarProfile() {
    var PKEY = 'so_admin_profile_v1';

    function loadProfile() {
      try { return JSON.parse(localStorage.getItem(PKEY)) || {}; } catch (e) { return {}; }
    }
    function saveProfile(obj) {
      localStorage.setItem(PKEY, JSON.stringify(obj));
    }

    var profile = loadProfile();

    var nameEl = document.getElementById('sprofileName');
    var initialEl = document.getElementById('sprofileInitial');
    var imgEl = document.getElementById('sprofileImg');
    var card = document.getElementById('sprofileToggle');
    var menu = document.getElementById('sprofileMenu');
    var avEl = document.getElementById('sprofileAv');
    var fileInput = document.getElementById('avatarFileInput');

    function applyProfile() {
      var name = profile.name || 'Admin';
      var img = profile.img || '';
      nameEl.textContent = name;
      initialEl.textContent = name.charAt(0).toUpperCase();
      if (img) {
        imgEl.src = img;
        imgEl.style.display = 'block';
        initialEl.style.display = 'none';
      } else {
        imgEl.style.display = 'none';
        initialEl.style.display = '';
      }
    }

    applyProfile();

    /* Toggle dropdown */
    card.addEventListener('click', function () {
      var open = menu.classList.toggle('is-open');
      card.classList.toggle('is-open', open);
    });

    /* Close when clicking outside */
    document.addEventListener('click', function (e) {
      if (!document.getElementById('sidebarProfile').contains(e.target)) {
        menu.classList.remove('is-open');
        card.classList.remove('is-open');
      }
    });

    /* Edit Profile — change name */
    document.getElementById('editProfileBtn').addEventListener('click', function () {
      menu.classList.remove('is-open');
      card.classList.remove('is-open');
      var newName = prompt('Enter your display name:', profile.name || 'Admin');
      if (newName && newName.trim()) {
        profile.name = newName.trim();
        saveProfile(profile);
        applyProfile();
        toast('Profile updated', 'ok');
      }
    });

    /* Change Photo — triggers file picker */
    document.getElementById('changeAvatarBtn').addEventListener('click', function () {
      menu.classList.remove('is-open');
      card.classList.remove('is-open');
      fileInput.click();
    });
    avEl.addEventListener('click', function (e) {
      e.stopPropagation();
      fileInput.click();
    });

    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        /* Compress to 120x120 */
        var img = new Image();
        img.onload = function () {
          var canvas = document.createElement('canvas');
          canvas.width = 120; canvas.height = 120;
          var ctx = canvas.getContext('2d');
          /* White backdrop — transparent avatars would turn BLACK in JPEG */
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 120, 120);
          /* Crop to square */
          var size = Math.min(img.width, img.height);
          var sx = (img.width - size) / 2;
          var sy = (img.height - size) / 2;
          ctx.drawImage(img, sx, sy, size, size, 0, 0, 120, 120);
          profile.img = canvas.toDataURL('image/jpeg', 0.8);
          saveProfile(profile);
          applyProfile();
          toast('Avatar updated', 'ok');
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
      fileInput.value = '';
    });

    /* Change Password */
    document.getElementById('changePwdBtn').addEventListener('click', function () {
      menu.classList.remove('is-open');
      card.classList.remove('is-open');
      var pw = prompt('Enter new password (demo — stored locally):');
      if (pw && pw.trim().length >= 4) {
        profile.pwd = pw.trim();
        saveProfile(profile);
        toast('Password updated', 'ok');
      } else if (pw !== null) {
        toast('Password must be at least 4 characters', 'error');
      }
    });

    /* Log Out — requires a real Supabase sign-out */
    document.getElementById('logoutBtn').addEventListener('click', function () {
      if (confirm('Log out of the admin dashboard?')) {
        handleAdminSignOut();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    /* Fail closed first: hide the dashboard until a Supabase session exists */
    showAdminGate();

    ensureAdminLoginService().then(function () { return ensureAdminAuth(); }).catch(function () {
      showAdminGate();
      return false;
    }).then(function (authed) {
      if (!authed) return; /* gate stays visible; dashboard never renders */
      /* ---- Authenticated: boot the dashboard ---- */
      navigate('dashboard');
      initSidebarProfile();
      /* Live "new orders" indicator: seed the seen-baseline on first run,
         fetch once, then poll Supabase every 60 seconds. */
      if (!readSeenTs()) writeSeenTs(new Date().toISOString());
      pollNewOrders();
      setInterval(pollNewOrders, 60000);
    });

    /* ---- Login form on the gate ---- */
    var gateForm = document.getElementById('adminGateForm');
    if (gateForm) {
      gateForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (document.getElementById('adminGateSubmit').disabled) return;
        adminAuthAttempt++; /* An earlier session check must not undo this login. */
        var email = document.getElementById('adminGateEmail').value.trim();
        var pass = document.getElementById('adminGatePass').value;
        var errEl = document.getElementById('adminGateError');
        var btn = document.getElementById('adminGateSubmit');
        errEl.style.display = 'none';

        if (!email || !pass) {
          errEl.textContent = 'Email and password are required.';
          errEl.style.display = 'block';
          return;
        }
        btn.disabled = true;
        btn.textContent = 'Signing in…';

        var loginStage = 'auth';
        ensureAdminLoginService().then(function () {
          return adminAuthWithTimeout(Promise.resolve().then(function () {
            return window.Supabase.signIn(email, pass);
          }), 12000);
        }).then(function (res) {
          if (res && res.error) throw res.error;
          if (!res || !res.data || !res.data.session || !res.data.user) {
            throw new Error('Login could not be confirmed. Please try again.');
          }
          /* Only a server-approved admin may reveal the dashboard. */
          loginStage = 'approval';
          return adminAuthWithTimeout(demoAdminRequest('admin-check'), 12000);
        }).then(function (approval) {
          if (!approval.admin) throw new Error('Approved admin access required.');
          btn.textContent = '✅ Signed in';
          showAdminUI();
          navigate('dashboard');
          initSidebarProfile();
          if (!readSeenTs()) writeSeenTs(new Date().toISOString());
          pollNewOrders();
          setInterval(pollNewOrders, 60000);
        }).catch(function (error) {
          var m = error && error.message || 'Sign in failed. Please try again.';
          if (m.indexOf('Invalid login credentials') > -1) m = 'Invalid email or password.';
          else if (m.indexOf('Email not confirmed') > -1) m = 'Email not verified — check your inbox for the verification link.';
          else if (m === 'auth-timeout') m = loginStage === 'approval'
            ? 'Admin approval timed out. Check the DEMO backend deployment and try again.'
            : 'Login timed out. Check your connection and try again.';
          else if (loginStage === 'auth' && (m === 'Failed to fetch' || m === 'NetworkError when attempting to fetch resource.')) {
            m = 'Cannot reach Supabase Auth. Check your connection, browser Network tab, and project URL; then try again.';
          }
          errEl.textContent = m;
          errEl.style.display = 'block';
        }).finally(function () {
          btn.disabled = false;
          btn.textContent = 'Sign In';
        });
      });
    }
    /* ---- Show / hide password toggle on the gate ---- */
    var toggleBtn = document.getElementById('togglePass');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function () {
        var passInput = document.getElementById('adminGatePass');
        var eyeOpen = document.getElementById('eyeOpen');
        var eyeClosed = document.getElementById('eyeClosed');
        var showing = passInput.type === 'text';
        passInput.type = showing ? 'password' : 'text';
        eyeOpen.style.display = showing ? 'block' : 'none';
        eyeClosed.style.display = showing ? 'none' : 'block';
        toggleBtn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
        passInput.focus();
      });
    }
  });

})();
