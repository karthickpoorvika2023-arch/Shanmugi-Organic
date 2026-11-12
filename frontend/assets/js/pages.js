/* ==========================================================================
   pages.js — per-page controllers, dispatched from <body data-page="…">.
   Loads after data.js and app.js.
   ========================================================================== */
(function () {
  'use strict';

  const A = window.App, SITE = window.SITE;
  const $ = A.$, $$ = A.$$, esc = A.esc, money = A.money, ic = A.ic, card = A.card, stars = A.stars;

  const qs = function (k) {
    const m = new RegExp('[?&]' + k + '=([^&]*)').exec(location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
  };

  /* ============================================================ icons ==== */
  /* Static markup asks for an icon with data-ic="leaf" — filled in here so   */
  /* the HTML files stay free of inline SVG.                                  */
  function icons(scope) {
    $$('[data-ic]', scope || document).forEach(function (el) {
      if (!el.firstChild) el.innerHTML = ic(el.getAttribute('data-ic'));
    });
  }

  /* ============================================================ rails ==== */
  /* <div class="pgrid pgrid--4" data-rail="featured" data-limit="8"></div>   */
  function rails() {
    $$('[data-rail]').forEach(function (host) {
      const spec = host.getAttribute('data-rail');
      const limit = parseInt(host.getAttribute('data-limit') || '0', 10);
      let list = [];
      if (spec === 'featured') list = SITE.featured();
      else if (spec === 'bestseller') list = SITE.products.filter(function (p) { return p.bestseller; });
      else if (spec === 'new') list = SITE.products.filter(function (p) { return p.isNew; });
      else if (spec === 'top') list = SITE.products.slice().sort(function (a, b) { return b.rating - a.rating || b.reviews - a.reviews; });
      else if (spec === 'recent') list = A.Recent.all();
      else if (spec.indexOf('cat:') === 0) list = SITE.incat(spec.slice(4));
      else if (spec.indexOf('slugs:') === 0) list = spec.slice(6).split(',').map(SITE.byslug).filter(Boolean);
      const skip = host.getAttribute('data-skip');
      if (skip) list = list.filter(function (p) { return p.slug !== skip; });
      if (limit) list = list.slice(0, limit);
      if (!list.length) { const w = host.closest('[data-rail-wrap]'); if (w) w.classList.add('is-hidden'); return; }
      host.innerHTML = list.map(function (p) { return card(p, { showCat: host.hasAttribute('data-showcat') }); }).join('');
    });

    /* category rails */
    $$('[data-catrail]').forEach(function (host) {
      const withCount = host.hasAttribute('data-count');
      /* The home circle rail slides its tiles, so the cards are painted into an
         inner track that JS translates. The host itself stays put and clips the
         tiles, so the whole animation stays inside the section (= banner) width. */
      const slides = host.classList.contains('catrail--circle');
      const track = slides ? document.createElement('div') : host;
      if (slides) {
        track.className = 'catrail__track';
        host.appendChild(track);
      }

      track.innerHTML = SITE.categories.map(function (c) {
        const n = SITE.incat(c.slug).length;
        const imgSrc = c.img ? c.img : 'assets/img/categories/' + c.slug + '.svg';
        const imgStyle = c.img ? 'width:100%;height:100%;object-fit:cover;border-radius:50%' : '';
        const fallback = 'assets/img/categories/' + c.slug + '.svg';
        return '<a class="catcard" href="products.html?cat=' + c.slug + '" data-cat-slug="' + c.slug + '">' +
          '<span class="catcard__img"><img src="' + imgSrc + '" alt="' + esc(c.name) + '" loading="lazy" style="' + imgStyle + '" data-fallback="' + fallback + '"></span>' +
          '<b>' + esc(c.name) + '</b><span>' + esc(c.ta) + '</span>' +
          (withCount ? '<span class="catcard__count">' + n + ' products</span>' : '') + '</a>';
      }).join('');
      /* safe fallback: if uploaded image fails, revert to the SVG icon */
      track.querySelectorAll('img[data-fallback]').forEach(function (img) {
        img.addEventListener('error', function () {
          img.src = img.getAttribute('data-fallback');
          img.style.cssText = '';
        });
      });

      /* auto-sliding carousel for the home circle rail:
         5 circles per view; every tick advances exactly one tile and the ‹ ›
         arrows step one tile too. The offset is clamped to (total - visible),
         so all the categories pass through the view and a slide is never blank. */
      if (slides) {
        try {
          const total = SITE.categories.length;
          const visible = 5;
          const maxOff = total - visible;
          if (maxOff > 0) {
            /* the arrows live in .catrail-wrap — the same width as the rail, so
               nothing about the animation crosses the banner's edges */
            let zone = host.closest('.catrail-wrap');
            if (!zone) {
              zone = document.createElement('div');
              zone.className = 'catrail-wrap';
              host.parentNode.insertBefore(zone, host);
              zone.appendChild(host);
            }
            $$('.catnav__btn', zone).forEach(function (b) { b.remove(); });
            const chevL = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
            const chevR = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>';
            const btnL = document.createElement('button');
            btnL.className = 'catnav__btn catnav__btn--left';
            btnL.setAttribute('aria-label', 'Scroll categories left');
            btnL.innerHTML = chevL;
            const btnR = document.createElement('button');
            btnR.className = 'catnav__btn catnav__btn--right';
            btnR.setAttribute('aria-label', 'Scroll categories right');
            btnR.innerHTML = chevR;
            zone.appendChild(btnL);
            zone.appendChild(btnR);

            let off = 0, timer = null;
            const paint = function () {
              /* one step = one tile width (1/visible of the track) */
              track.style.transform = 'translateX(-' + (off * (100 / visible)) + '%)';
              btnL.classList.toggle('is-off', off === 0);
              btnR.classList.toggle('is-off', off === maxOff);
            };
            const start = function () { stop(); timer = setInterval(function () { off = off >= maxOff ? 0 : off + 1; paint(); }, 3500); };
            const stop = function () { clearInterval(timer); };

            btnL.addEventListener('click', function () { if (off > 0) { off--; paint(); } });
            btnR.addEventListener('click', function () { if (off < maxOff) { off++; paint(); } });
            zone.addEventListener('mouseenter', stop);
            zone.addEventListener('mouseleave', start);
            paint();
            start();
          }
        } catch (e) { console.error('[catcarousel] failed:', e); }
      }
      /* Version marker — confirms the fresh renderer + how many cards painted */
      console.log('[SO] pages.js v6 — painted ' + SITE.categories.length + ' category circles');
    });
  }

  /* ============================================================= home ==== */
  function home() {
    /* testimonials — 3 per page, dots */
    const host = $('[data-tmz]');
    if (host) {
      const per = 3, pool = SITE.reviewPool;
      const pages = Math.ceil(pool.length / per);
      let page = 0;
      const track = $('.tmz__track', host), dots = $('.tmz__dots', host);
      let html = '';
      for (let i = 0; i < pages; i++) {
        html += '<div class="tmz__page">' + pool.slice(i * per, i * per + per).map(function (r) {
          return '<div class="tmz__card">' + stars(r.stars) +
            '<blockquote>“' + esc(r.text) + '”</blockquote>' +
            '<div class="tmz__who"><img src="assets/img/avatars/' + r.av + '.svg" alt="">' +
            '<span><b>' + esc(r.name) + '</b><span>' + esc(r.city) + '</span></span></div></div>';
        }).join('') + '</div>';
      }
      track.innerHTML = html;
      dots.innerHTML = Array.apply(null, { length: pages }).map(function (_, i) {
        return '<button data-dot="' + i + '" aria-label="Testimonial page ' + (i + 1) + '"></button>';
      }).join('');
      const go = function (i) {
        page = (i + pages) % pages;
        track.style.transform = 'translateX(' + (-page * 100) + '%)';
        $$('button', dots).forEach(function (b, k) { b.classList.toggle('is-on', k === page); });
      };
      dots.addEventListener('click', function (e) {
        const b = e.target.closest('[data-dot]');
        if (b) { go(+b.getAttribute('data-dot')); restart(); }
      });
      let timer = setInterval(function () { go(page + 1); }, 6000);
      const restart = function () { clearInterval(timer); timer = setInterval(function () { go(page + 1); }, 6000); };
      host.addEventListener('mouseenter', function () { clearInterval(timer); });
      host.addEventListener('mouseleave', restart);
      go(0);
    }
  }

  /* ========================================================= products ==== */
  function products() {
    const state = {
      cats: qs('cat') ? [qs('cat')] : [],
      q: qs('q'),
      tag: qs('tag'),
      min: 0,
      max: parseInt(qs('max') || '0', 10) || 1000,
      rating: 0,
      stockFilter: '',
      sort: 'popular',
      page: 1,
      per: 12
    };

    const catbox = $('[data-f-cats]');
    if (catbox) {
      catbox.innerHTML = SITE.categories.map(function (c) {
        return '<label class="check"><input type="checkbox" value="' + c.slug + '"' +
          (state.cats.indexOf(c.slug) > -1 ? ' checked' : '') + '>' +
          '<span>' + esc(c.name) + '<span class="ta">' + esc(c.ta) + '</span></span>' +
          '<small>' + SITE.incat(c.slug).length + '</small></label>';
      }).join('');
    }

    const q = $('[data-f-q]');
    if (q && state.q) q.value = state.q;
    const minEl = $('[data-f-min]'), maxEl = $('[data-f-max]'), slider = $('[data-f-slider]');
    if (maxEl) maxEl.value = state.max;
    if (slider) slider.value = state.max;

    function apply() {
      let list = SITE.products.slice();
      if (state.q) list = A.searchIndex(state.q);
      if (state.cats.length) list = list.filter(function (p) { return state.cats.indexOf(p.cat) > -1; });
      if (state.tag) list = list.filter(function (p) { return p.tags.indexOf(state.tag) > -1; });
      list = list.filter(function (p) { return p.price >= state.min && p.price <= state.max; });
      if (state.rating) list = list.filter(function (p) { return p.rating >= state.rating; });
      if (state.stockFilter === 'in') list = list.filter(function (p) { return p.stock; });
      else if (state.stockFilter === 'out') list = list.filter(function (p) { return !p.stock; });

      const s = state.sort;
      if (s === 'price-asc') list.sort(function (a, b) { return a.price - b.price; });
      else if (s === 'price-desc') list.sort(function (a, b) { return b.price - a.price; });
      else if (s === 'rating') list.sort(function (a, b) { return b.rating - a.rating || b.reviews - a.reviews; });
      else if (s === 'name') list.sort(function (a, b) { return a.name.localeCompare(b.name); });
      else if (s === 'new') list.sort(function (a, b) { return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0) || b.id - a.id; });
      else if (s === 'discount') list.sort(function (a, b) { return b.off - a.off; });
      else if (!state.q) list.sort(function (a, b) { return (b.bestseller ? 1 : 0) - (a.bestseller ? 1 : 0) || b.reviews - a.reviews; });

      const total = list.length;
      const pages = Math.max(1, Math.ceil(total / state.per));
      state.page = A.clamp(state.page, 1, pages);
      const slice = list.slice((state.page - 1) * state.per, state.page * state.per);

      const grid = $('[data-plist]');
      grid.innerHTML = slice.length
        ? slice.map(function (p) { return card(p, { showCat: true }); }).join('')
        : '<div class="empty" style="grid-column:1/-1"><div class="empty__ic">' + ic('search') + '</div>' +
          '<h4>Nothing matched those filters</h4><p>Try widening the price range or clearing a category.</p>' +
          '<button class="btn btn--outline" data-clear-all>Clear all filters</button></div>';

      $('[data-count-showing]').innerHTML = total
        ? 'Showing <b>' + ((state.page - 1) * state.per + 1) + '–' + Math.min(total, state.page * state.per) + '</b> of <b>' + total + '</b> products'
        : 'No products found';

      /* active filter chips */
      const chips = [];
      state.cats.forEach(function (c) {
        const o = SITE.cat(c);
        chips.push(['cat:' + c, o ? o.name : c]);
      });
      if (state.q) chips.push(['q', '“' + state.q + '”']);
      if (state.tag) chips.push(['tag', state.tag === 'new' ? 'New arrivals' : 'Bestsellers']);
      if (state.rating) chips.push(['rating', state.rating + '★ & above']);
      if (state.max < 1000 || state.min > 0) chips.push(['price', money(state.min) + ' – ' + money(state.max)]);
      if (state.stockFilter) chips.push(['stock', state.stockFilter === 'in' ? 'In stock' : 'Out of stock']);
      const af = $('[data-activefilters]');
      af.innerHTML = chips.length
        ? chips.map(function (c) {
            return '<span class="tagx">' + esc(c[1]) + '<button data-rm="' + c[0] + '" aria-label="Remove filter">' + ic('x') + '</button></span>';
          }).join('') + '<button class="fbox__reset" data-clear-all>Clear all</button>'
        : '';

      /* pager */
      const pager = $('[data-pager]');
      let ph = '';
      if (pages > 1) {
        ph += '<button data-go="' + (state.page - 1) + '"' + (state.page === 1 ? ' disabled' : '') + '>Prev</button>';
        for (let i = 1; i <= pages; i++) ph += '<button data-go="' + i + '" class="' + (i === state.page ? 'is-on' : '') + '">' + i + '</button>';
        ph += '<button data-go="' + (state.page + 1) + '"' + (state.page === pages ? ' disabled' : '') + '>Next</button>';
      }
      pager.innerHTML = ph;

      A.Wish.sync();

      /* reflect in the address bar so filters are shareable */
      const p = [];
      if (state.cats.length === 1) p.push('cat=' + state.cats[0]);
      if (state.q) p.push('q=' + encodeURIComponent(state.q));
      if (state.tag) p.push('tag=' + state.tag);
      history.replaceState(null, '', location.pathname + (p.length ? '?' + p.join('&') : ''));
    }

    /* filter events */
    const side = $('[data-filters]');
    if (side) {
      side.addEventListener('change', function (e) {
        const t = e.target;
        if (t.closest('[data-f-cats]')) {
          state.cats = $$('[data-f-cats] input:checked').map(function (i) { return i.value; });
          state.page = 1; apply(); return;
        }
        if (t.hasAttribute('data-f-rating')) { state.rating = +t.value; state.page = 1; apply(); return; }
        if (t.hasAttribute('data-f-stock')) { state.stockFilter = t.checked ? t.value : ''; state.page = 1; apply(); return; }
        if (t.hasAttribute('data-f-min') || t.hasAttribute('data-f-max')) {
          state.min = Math.max(0, parseInt(minEl.value || '0', 10));
          state.max = Math.max(state.min, parseInt(maxEl.value || '1000', 10));
          if (slider) slider.value = state.max;
          state.page = 1; apply(); return;
        }
      });
      if (slider) slider.addEventListener('input', function () {
        state.max = +slider.value;
        if (maxEl) maxEl.value = state.max;
        state.page = 1; apply();
      });
      side.addEventListener('submit', function (e) {
        if (e.target.hasAttribute('data-f-form')) {
          e.preventDefault();
          state.q = $('[data-f-q]').value.trim(); state.page = 1; apply();
        }
      });
    }

    const sortEl = $('[data-sort]');
    if (sortEl) sortEl.addEventListener('change', function () { state.sort = sortEl.value; state.page = 1; apply(); });
    const perEl = $('[data-per]');
    if (perEl) perEl.addEventListener('change', function () { state.per = +perEl.value; state.page = 1; apply(); });

    document.addEventListener('click', function (e) {
      const go = e.target.closest('[data-go]');
      if (go) { state.page = +go.getAttribute('data-go'); apply(); window.scrollTo({ top: 220, behavior: 'smooth' }); return; }
      const rm = e.target.closest('[data-rm]');
      if (rm) {
        const k = rm.getAttribute('data-rm');
        if (k.indexOf('cat:') === 0) {
          state.cats = state.cats.filter(function (c) { return c !== k.slice(4); });
          $$('[data-f-cats] input').forEach(function (i) { i.checked = state.cats.indexOf(i.value) > -1; });
        } else if (k === 'q') { state.q = ''; if ($('[data-f-q]')) $('[data-f-q]').value = ''; }
        else if (k === 'tag') state.tag = '';
        else if (k === 'rating') { state.rating = 0; $$('[data-f-rating]').forEach(function (i) { i.checked = false; }); }
        else if (k === 'price') { state.min = 0; state.max = 1000; if (minEl) minEl.value = ''; if (maxEl) maxEl.value = 1000; if (slider) slider.value = 1000; }
        else if (k === 'stock') { state.stockFilter = ''; $$('[data-f-stock]').forEach(function (i) { i.checked = false; }); }
        state.page = 1; apply(); return;
      }
      if (e.target.closest('[data-clear-all]')) {
        state.cats = []; state.q = ''; state.tag = ''; state.rating = 0; state.min = 0; state.max = 1000; state.stockFilter = ''; state.page = 1;
        $$('[data-f-cats] input, [data-f-rating], [data-f-stock]').forEach(function (i) { i.checked = false; });
        if (minEl) minEl.value = ''; if (maxEl) maxEl.value = 1000; if (slider) slider.value = 1000;
        if ($('[data-f-q]')) $('[data-f-q]').value = '';
        apply();
      }
    });

    /* pre-title when arriving from a category link */
    const setTx = function (sel, txt) { const el = $(sel); if (el) el.textContent = txt; };
    if (state.cats.length === 1) {
      const c = SITE.cat(state.cats[0]);
      if (c) {
        setTx('[data-page-title]', c.name);
        setTx('[data-page-ta]', c.ta);
        setTx('[data-page-desc]', c.blurb);
        setTx('[data-crumb-current]', c.name);
      }
    } else if (state.q) {
      setTx('[data-page-title]', 'Search: ' + state.q);
      setTx('[data-crumb-current]', 'Search results');
    } else if (state.tag) {
      const t = state.tag === 'new' ? 'New Arrivals' : 'Bestsellers';
      setTx('[data-page-title]', t);
      setTx('[data-crumb-current]', t);
    }

    apply();
  }

  /* ========================================================== product ==== */
  function product() {
    const p = SITE.byslug(qs('p')) || SITE.byslug('groundnut-oil');
    document.title = p.name + ' — ' + SITE.shop.name;
    A.Recent.push(p.slug);

    let size = p.sizes[0][0];
    /* priceOf and mrpOf: use s[2] for per-size MRP if stored, else fall back to product-level ratio */
    const priceOf = function (s) { return p.sizes.filter(function (z) { return z[0] === s; })[0][1]; };
    const mrpOf   = function (s) {
      var row = p.sizes.filter(function (z) { return z[0] === s; })[0];
      if (row && row[2] && row[2] > row[1]) return row[2];
      /* fallback: scale product-level MRP proportionally */
      return Math.round(row[1] * p.mrp / p.price);
    };

    const host = $('[data-pdp]');
    const reviews = SITE.reviewPool.slice(0, 4);
    /* Star split derived from this product's own rating, so the bars and the
       headline average always agree. Low bands shrink as the rating climbs;
       the 5★/4★ pair then absorbs the remainder to hit the exact mean. */
    const dist = (function (r) {
      const cl = function (v, lo, hi) { return Math.min(hi, Math.max(lo, Math.round(v))); };
      const p3 = cl((5 - r) * 12, 2, 14), p2 = cl((5 - r) * 5, 1, 7), p1 = cl((5 - r) * 3, 1, 5);
      const rest = 100 - p3 - p2 - p1;
      const p5 = A.clamp(Math.round(r * 100) - (3 * p3 + 2 * p2 + p1) - 4 * rest, 0, rest);
      return [p5, rest - p5, p3, p2, p1];
    })(p.rating);

    /* Gallery sources: real images first, then placeholder SVGs (3 slots) */
    const gallerySrcs = (function () {
      const real = ((p.images && p.images.length) ? p.images.filter(Boolean) : [p.img].filter(Boolean)).slice(0, 5);
      const ph = ['assets/img/categories/' + p.cat + '.svg', 'assets/img/scenes/farm.svg'];
      const out = real.slice();
      for (let i = 0; out.length < 3 && i < ph.length; i++) out.push(ph[i]);
      return out;
    })();

    const draw = function () {
      const price = priceOf(size), mrp = mrpOf(size);
      const offPct = mrp > price ? Math.round((mrp - price) / mrp * 100) : 0;
      host.innerHTML =
        '<div class="pdp">' +
        /* gallery — admin uploads up to 3 images; placeholders fill empty slots */
        '<div><div class="gallery__main"><img src="' + gallerySrcs[0] + '" alt="' + esc(p.name) + '"></div>' +
        '<div class="gallery__thumbs">' +
        gallerySrcs.map(function (src, i) {
          return '<button class="' + (i === 0 ? 'is-on' : '') + '" data-thumb="' + src + '"><img src="' + src + '" alt=""></button>';
        }).join('') + '</div></div>' +

        /* main column */
        '<div><span class="pcard__cat">' + esc(p.catName) + ' · <span class="ta">' + esc(p.catTa) + '</span></span>' +
        '<h1 class="pdp__title">' + esc(p.name) + '</h1>' +
        '<div class="pdp__ta ta">' + esc(p.ta) + '</div>' +
        '<div class="pdp__meta">' + stars(p.rating, 'stars--lg') +
        '<span><b>' + p.rating.toFixed(1) + '</b> · ' + p.reviews + ' reviews</span>' +
        '<span>SKU: ' + p.sku + '</span>' +
        '<span class="badge ' + (p.stock ? 'badge--ok' : 'badge--no') + '">' + (p.stock ? 'In stock' : 'Out of stock') + '</span></div>' +
        '<div class="pdp__price"><b>' + money(price) + '</b>' + (mrp > price ? '<s>' + money(mrp) + '</s>' : '') +
        (offPct > 0 ? '<span class="chip chip--red">' + offPct + '% OFF</span>' : '') +
        '<span class="small muted">incl. all taxes</span></div>' +
        '<p class="pdp__desc">' + esc(p.desc) + '</p>' +

        '<div><b class="small">Choose a pack size</b><div class="pdp__opts">' +
        p.sizes.map(function (s) {
          return '<button class="optbtn' + (s[0] === size ? ' is-on' : '') + '" data-size="' + esc(s[0]) + '">' +
            esc(s[0]) + '<small>' + money(s[1]) + '</small></button>';
        }).join('') + '</div></div>' +

        '<div class="pdp__buy"><span class="qty qty--lg">' +
        '<button data-minus aria-label="Decrease">−</button><input data-qty value="1" readonly aria-label="Quantity">' +
        '<button data-plus aria-label="Increase">+</button></span>' +
        (p.stock
          ? '<button class="btn btn--primary btn--lg" data-buy>' + ic('cart') + ' Add to Cart</button>' +
            '<button class="btn btn--gold btn--lg" data-buynow>Buy Now</button>'
          : '<button class="btn btn--ghost btn--lg" disabled>' + ic('bell') + ' Notify Me</button>') +
        '<button class="btn btn--ghost btn--lg" data-wish="' + p.slug + '" aria-label="Save to wishlist">' + ic('heart') + '</button></div>' +
        (p.stock ? '' : '<div class="notice notice--gold mt-14">' + ic('alert') +
          '<span>This batch has sold out. We press and pack to order, so it usually comes back within a week — call ' +
          '<a class="linkish" href="tel:' + SITE.shop.phoneHref + '">' + SITE.shop.phone + '</a> and we will keep one aside for you.</span></div>') +

        '<div class="pdp__ticks">' + (p.highlights || []).map(function (h) {
          return '<span class="tick">' + ic('check') + esc(h) + '</span>';
        }).join('') + '</div>' +
        (p.use ? '<div class="notice mt-14">' + ic('info') + '<span><b>How to use:</b> ' + esc(p.use) + '</span></div>' : '') +
        '</div>' +

        /* buybox */
        '<aside class="buybox"><h5>Delivery &amp; Assurance</h5>' +
        '<div class="buybox__row">' + ic('truck') + '<span><b>Free delivery above ₹999</b>Erode next day · Tamil Nadu 2–3 days · India 4–7 days</span></div>' +
        '<div class="buybox__row">' + ic('shield') + '<span><b>FSSAI Lic. ' + SITE.shop.fssai + '</b>Made and packed in our own unit</span></div>' +
        '<div class="buybox__row">' + ic('refresh') + '<span><b>48-hour replacement</b>Damaged or leaked in transit — we replace it</span></div>' +
        '<div class="buybox__row">' + ic('lock') + '<span><b>Secure payments</b>UPI, cards, net banking &amp; COD</span></div>' +
        '<div class="buybox__row">' + ic('headset') + '<span><b>Talk to us</b><a class="linkish" href="tel:' + SITE.shop.phoneHref + '">' + SITE.shop.phone + '</a></span></div>' +
        '<div class="divider" style="margin:14px 0"></div>' +
        '<h5>Bulk / Wholesale</h5><p class="small muted">Slab pricing from 25 kg per SKU.</p>' +
        '<a class="btn btn--outline btn--sm btn--block mt-8" href="bulk-enquiry.html">Request a rate card</a></aside>' +
        '</div>' +

        /* tabs */
        '<div class="tabs"><div class="tabs__bar">' +
        '<button data-tab="d" class="is-on">Description</button>' +
        '<button data-tab="s">Specifications</button>' +
        '<button data-tab="r">Reviews (' + p.reviews + ')</button>' +
        '<button data-tab="f">Shipping &amp; Returns</button></div>' +

        '<div class="tabs__panel is-on" data-panel="d"><div class="prose">' +
        '<p>' + esc(p.desc) + '</p>' +
        '<h4>What makes it different</h4><ul>' + (p.highlights || []).map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ul>' +
        (p.use ? '<h4>Suggested use</h4><p>' + esc(p.use) + '</p>' : '') +
        '<h4>Honest limitations</h4><p>Because nothing is refined, stabilised or preservative-treated, expect natural sediment, seasonal variation in colour and aroma, and a shorter shelf life than a supermarket equivalent. Store it as printed on the pack and use it within the stated window.</p>' +
        '</div></div>' +

        '<div class="tabs__panel" data-panel="s"><table class="spectable"><tbody>' +
        '<tr><th>Product name</th><td>' + esc(p.name) + ' <span class="ta">(' + esc(p.ta) + ')</span></td></tr>' +
        '<tr><th>Category</th><td>' + esc(p.catName) + '</td></tr>' +
        '<tr><th>Available packs</th><td>' + p.sizes.map(function (s) { return esc(s[0]) + ' — ' + money(s[1]); }).join('<br>') + '</td></tr>' +
        Object.keys(p.specs).map(function (k) {
          return '<tr><th>' + esc(k) + '</th><td>' + esc(p.specs[k]) + '</td></tr>';
        }).join('') +
        '<tr><th>FSSAI licence</th><td>' + SITE.shop.fssai + '</td></tr>' +
        '<tr><th>Marketed by</th><td>' + SITE.shop.name + ', ' + SITE.shop.addr1 + ', ' + SITE.shop.addr2 + '</td></tr>' +
        '</tbody></table></div>' +

        '<div class="tabs__panel" data-panel="r">' +
        '<div class="ratesum"><div class="ratesum__big"><b>' + p.rating.toFixed(1) + '</b>' + stars(p.rating, 'stars--lg') +
        '<span>' + p.reviews + ' verified reviews</span></div><div>' +
        dist.map(function (v, i) {
          return '<div class="ratebar"><span>' + (5 - i) + '★</span><span class="ratebar__track"><i class="ratebar__fill" style="width:' + v + '%"></i></span><span>' + v + '%</span></div>';
        }).join('') + '</div></div>' +
        reviews.map(function (r) {
          return '<div class="review"><div class="review__who">' +
            '<b>' + esc(r.name) + '</b><span>' + esc(r.city) + '</span>' +
            '<span class="badge badge--ok mt-8">' + ic('checkCircle') + ' Verified buyer</span></div>' +
            '<div class="review__body">' + stars(r.stars) + '<h5>' + esc(r.title) + '</h5><p>' + esc(r.text) + '</p></div></div>';
        }).join('') +
        '<div class="notice mt-20">' + ic('info') + '<span>Reviews shown here are a representative sample of feedback received across our catalogue.</span></div></div>' +

        '<div class="tabs__panel" data-panel="f"><div class="prose">' +
        '<h4>Delivery</h4><ul><li>Erode city — same or next day</li><li>Tamil Nadu — 2 to 3 working days</li>' +
        '<li>South India — 3 to 4 working days</li><li>Rest of India — 4 to 7 working days</li></ul>' +
        '<p>Free delivery on prepaid orders above ₹999. Below that, ₹60 within Tamil Nadu and ₹90 elsewhere. Cash on delivery adds ₹40.</p>' +
        '<h4>Returns</h4><p>Damaged, leaking or expired on arrival? Send a photo within 48 hours and we replace it or refund in full — no need to ship anything back. Opened food packs cannot be returned for taste preference.</p>' +
        '</div></div></div>';

      $$('[data-crumb-cat]').forEach(function (el) { el.textContent = p.catName; el.href = 'products.html?cat=' + p.cat; });
      $$('[data-crumb-current]').forEach(function (el) { el.textContent = p.name; });
      A.Wish.sync();
    };
    draw();

    host.addEventListener('click', function (e) {
      const s = e.target.closest('[data-size]');
      if (s) { size = s.getAttribute('data-size'); draw(); return; }
      const th = e.target.closest('[data-thumb]');
      if (th) {
        $('.gallery__main img').src = th.getAttribute('data-thumb');
        $$('.gallery__thumbs button').forEach(function (b) { b.classList.toggle('is-on', b === th); });
        return;
      }
      const q = $('[data-qty]');
      if (e.target.closest('[data-minus]')) { q.value = Math.max(1, +q.value - 1); return; }
      if (e.target.closest('[data-plus]')) { q.value = Math.min(99, +q.value + 1); return; }
      if (e.target.closest('[data-buy]')) { A.Cart.add(p.slug, size, +q.value); A.Drawer.open(); return; }
      if (e.target.closest('[data-buynow]')) { A.Cart.add(p.slug, size, +q.value); location.href = 'checkout.html'; }
    });

    /* related rails */
    const rel = $('[data-related]');
    if (rel) {
      const list = SITE.incat(p.cat).filter(function (x) { return x.slug !== p.slug; })
        .concat(SITE.products.filter(function (x) { return x.cat !== p.cat && x.bestseller; }))
        .slice(0, 4);
      rel.innerHTML = list.map(function (x) { return card(x, { showCat: true }); }).join('');
    }
    const rec = $('[data-recentrail]');
    if (rec) {
      const list = A.Recent.all().filter(function (x) { return x.slug !== p.slug; }).slice(0, 4);
      if (!list.length) rec.closest('section').classList.add('is-hidden');
      else rec.innerHTML = list.map(function (x) { return card(x, { showCat: true }); }).join('');
    }
    A.Wish.sync();
  }

  /* ============================================================= cart ==== */
  function cart() {
    const host = $('[data-cartwrap]');

    function draw() {
      const t = A.Cart.totals();
      if (!t.lines.length) {
        host.innerHTML = '<div class="panel"><div class="empty">' +
          '<div class="empty__ic">' + ic('cart') + '</div><h4>Your cart is empty</h4>' +
          '<p>Nothing here yet. Start with the things people reorder most.</p>' +
          '<div class="row" style="justify-content:center"><a class="btn btn--primary" href="products.html">Shop All Products</a>' +
          '<a class="btn btn--ghost" href="products.html?tag=bestseller">See Bestsellers</a></div></div></div>';
        return;
      }
      host.innerHTML =
        '<div class="cartlayout"><div>' +
        '<table class="carttable"><thead><tr><th>Product</th><th>Pack</th><th>Price</th><th>Qty</th><th class="tr">Total</th><th></th></tr></thead><tbody>' +
        t.lines.map(function (l) {
          return '<tr><td><div class="cartitem"><img src="' + l.img + '" alt="">' +
            '<span><b><a href="product.html?p=' + l.slug + '">' + esc(l.name) + '</a></b>' +
            '<span class="ta">' + esc(l.ta) + '</span><small>SKU ' + l.sku + '</small></span></div></td>' +
            '<td>' + esc(l.size) + '</td>' +
            '<td><b>' + money(l.price) + '</b><br><s class="small muted">' + money(l.mrp) + '</s></td>' +
            '<td><span class="qty"><button data-q="' + l.slug + '|' + l.size + '|' + (l.qty - 1) + '">−</button>' +
            '<input value="' + l.qty + '" readonly><button data-q="' + l.slug + '|' + l.size + '|' + (l.qty + 1) + '">+</button></span></td>' +
            '<td class="tr"><b>' + money(l.total) + '</b></td>' +
            '<td class="tr"><button class="mini__rm" data-rm="' + l.slug + '|' + l.size + '" aria-label="Remove">' + ic('trash') + '</button></td></tr>';
        }).join('') + '</tbody></table>' +

        '<div class="row row--between mt-14"><a class="btn btn--ghost" href="products.html">' + ic('chevL') + ' Continue Shopping</a>' +
        '<button class="btn btn--danger" data-clearcart>Clear Cart</button></div>' +

        '<div class="notice mt-20">' + ic('gift') + '<span><b>Coupons you can use now:</b> ' +
        Object.keys(SITE.coupons).map(function (k) { return '<b>' + k + '</b> — ' + esc(SITE.coupons[k].label); }).join(' &nbsp;·&nbsp; ') +
        '</span></div></div>' +

        /* summary */
        '<aside class="summary"><h4>Order Summary</h4>' +
        '<div class="summary__row"><span>Subtotal (' + t.count + ' items)</span><b>' + money(t.sub) + '</b></div>' +
        '<div class="summary__row"><span>MRP savings</span><b style="color:var(--green-700)">− ' + money(t.mrpSaved) + '</b></div>' +
        (t.discount ? '<div class="summary__row"><span>Coupon ' + esc(t.coupon) + '</span><b style="color:var(--green-700)">− ' + money(t.discount) + '</b></div>' : '') +
        '<div class="summary__row"><span>Delivery</span><b>' + (t.ship ? money(t.ship) : 'Free') + '</b></div>' +
        '<div class="summary__row summary__row--total"><span>Total</span><b>' + money(t.total) + '</b></div>' +

        '<div class="coupon"><input placeholder="Coupon code" data-coupon value="' + esc(A.read(A.keys.coupon, '')) + '">' +
        '<button class="btn btn--outline" data-applycoupon>Apply</button></div>' +
        (t.coupon ? '<p class="small" style="color:var(--green-700)">' + esc(t.coupon) + ' applied — ' + esc(SITE.coupons[t.coupon].label) + '. <button class="fbox__reset" data-rmcoupon>Remove</button></p>' : '') +

        (t.toFreeShip > 0
          ? '<div class="summary__free">Add <b>' + money(t.toFreeShip) + '</b> more and delivery is free.' +
            '<span class="bar"><i style="width:' + Math.round(100 * (1 - t.toFreeShip / SITE.shop.freeShipOver)) + '%"></i></span></div>'
          : '<div class="summary__free">' + ic('checkCircle') + ' Free delivery unlocked on this order.</div>') +

        '<a class="btn btn--primary btn--lg btn--block mt-14" href="checkout.html">Proceed to Checkout</a>' +
        '<div class="row mt-14" style="gap:6px;justify-content:center">' +
        ['visa', 'mastercard', 'rupay', 'upi'].map(function (n) { return '<img src="assets/img/pay/' + n + '.svg" alt="' + n + '" style="height:22px">'; }).join('') +
        '</div><p class="small muted tc mt-8">' + ic('lock').replace('<svg', '<svg style="width:11px;height:11px;display:inline;vertical-align:-1px"') + ' Secure checkout</p>' +
        '</aside></div>';
    }

    host.addEventListener('click', function (e) {
      const q = e.target.closest('[data-q]');
      if (q) { const p = q.getAttribute('data-q').split('|'); A.Cart.setQty(p[0], p[1], parseInt(p[2], 10)); return; }
      const rm = e.target.closest('[data-rm]');
      if (rm) { const p = rm.getAttribute('data-rm').split('|'); A.Cart.remove(p[0], p[1]); return; }
      if (e.target.closest('[data-clearcart]')) {
        A.Cart.clear(); A.Toast.show('Cart cleared', '', 'warn'); return;
      }
      if (e.target.closest('[data-applycoupon]')) {
        const v = $('[data-coupon]').value.trim().toUpperCase();
        const c = SITE.coupons[v];
        if (!c) { A.Toast.show('Invalid coupon', v + ' is not a valid code', 'err'); return; }
        const sub = A.Cart.totals({ coupon: '' }).sub;
        if (sub < c.min) { A.Toast.show('Cart too small for ' + v, 'Minimum order ' + money(c.min), 'warn'); return; }
        A.write(A.keys.coupon, v); A.Toast.show(v + ' applied', c.label, 'ok'); draw(); return;
      }
      if (e.target.closest('[data-rmcoupon]')) { A.write(A.keys.coupon, ''); draw(); }
    });

    document.addEventListener('cart:change', draw);

    // Refresh cart when page becomes visible (e.g., after returning from sign-in)
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') {
        draw();
      }
    });

    draw();
  }

  async function demoRequest(action, payload) {
    if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(location.origin))
      throw new Error('Demo checkout runs only on localhost. No payment was collected.');
    await window.__soEnsureSupabase();
    const client = window.SupabaseClient;
    const session = client && await client.auth.getSession();
    const token = session?.data?.session?.access_token;
    if (!token) throw new Error('Sign in with the approved admin account to try the demo.');
    const config = window.__soSupabaseConfig;
    if (!config || !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(config.url) || !config.publicKey)
      throw new Error('Local Supabase is not configured. No payment was collected.');
    let res;
    try {
      res = await fetch(config.url + '/functions/v1/demo-payment-kit/' + action, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token,
          apikey: config.publicKey }, body: JSON.stringify(payload)
      });
    } catch {
      throw new Error('Cannot reach the demo backend. No payment was collected.');
    }
    const body = await res.json().catch(function () { return null; });
    if (!res.ok) throw new Error(body?.error || 'Demo backend unavailable. No payment was collected.');
    if (!body || typeof body !== 'object') throw new Error('Invalid demo backend response.');
    return body;
  }

  /* ========================================================= checkout ==== */
  function checkout() {
    const host = $('[data-checkout]');
    const saved = {};
    let ship = 'standard', busy = false;

    function totals() {
      const outside = ($('[data-f="state"]') && $('[data-f="state"]').value !== 'Tamil Nadu');
      return A.Cart.totals({ outsideTN: outside, coupon: '' });
    }

    function draw() {
      snapshot();
      const t = totals();
      if (!t.lines.length) {
        host.innerHTML = '<div class="panel"><div class="empty"><div class="empty__ic">' + ic('cart') + '</div>' +
          '<h4>There is nothing to check out</h4><p>Add a few products and come back.</p>' +
          '<a class="btn btn--primary" href="products.html">Browse Products</a></div></div>';
        return;
      }
      host.innerHTML =
        '<div class="steps"><span class="step is-done"><i>' + ic('check') + '</i>Cart</span><span class="bar"></span>' +
        '<span class="step is-on"><i>2</i>Demo details (no payment)</span><span class="bar"></span>' +
        '<span class="step"><i>3</i>Demo saved</span></div>' +

        '<div class="cartlayout"><div>' +
        '<div class="formcard mb-14"><h4>Test contact (use invented details only)</h4>' +
        '<form class="form" data-addrform novalidate>' +
        '<div class="form__grid">' +
        fld('Full name', 'name', 'text', saved.name, 'text', 'Enter your name') +
        fld('Demo phone (0000000000)', 'phone', 'text', saved.phone, 'text', 'Enter 0000000000') +
        '</div>' +
        fld('Email address', 'email', 'email', saved.email, 'email', 'Enter a valid email') +
        '<div class="field"><label>Example state <span class="req">*</span></label><select data-f="state" data-req="text">' +
        ['Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Maharashtra', 'Delhi', 'Gujarat', 'West Bengal', 'Other'].map(function (s) {
          return '<option' + (saved.state === s ? ' selected' : '') + '>' + s + '</option>';
        }).join('') + '</select><span class="err">Choose a state</span></div>' +
        '</div>' +
        '<p class="small muted">Use a fictitious name, an @example.com email, and 0000000000. No delivery address is collected.</p>' +
        '</form></div>' +

        '<div class="formcard mb-14"><h4>Illustrative shipping option (no delivery)</h4>' +
        '<div class="radiorow">' +
        rad('ship', 'standard', ship, 'Standard example', 'Illustrative shipping only; nothing ships', t.ship ? money(t.ship) : 'Free') +
        rad('ship', 'express', ship, 'Express example', 'Illustrative shipping only; nothing ships', '+ ₹90') +
        rad('ship', 'pickup', ship, 'Pickup example', 'No pickup will be arranged', 'Free') +
        '</div></div>' +

        '<div class="formcard"><h4>Demo mode — no payment method</h4>' +
        '<div class="radiorow">' +
        '<p>ADMIN DEMO ONLY — sign in with the approved admin account. No money is charged; this does not create a real order.</p>' +
        '</div>' +
        '<div class="notice mt-14">' + ic('lock') + '<span>Demo records are stored separately in Supabase. Do not enter real customer information or card details.</span></div>' +
        '</div></div>' +

        /* summary */
        '<aside class="summary"><h4>Demo estimate — not an order</h4>' +
        t.lines.map(function (l) {
          return '<div class="mini" style="padding:9px 0"><img src="' + l.img + '" alt="" style="width:48px;height:48px">' +
            '<div class="mini__b"><span class="mini__nm">' + esc(l.name) + '</span>' +
            '<small class="muted small">' + esc(l.size) + ' × ' + l.qty + '</small></div>' +
            '<b style="font-size:12.5px">' + money(l.total) + '</b></div>';
        }).join('') +
        '<div class="summary__row mt-8"><span>Subtotal</span><b>' + money(t.sub) + '</b></div>' +
        (t.discount ? '<div class="summary__row"><span>Coupon ' + esc(t.coupon) + '</span><b style="color:var(--green-700)">− ' + money(t.discount) + '</b></div>' : '') +
        '<div class="summary__row"><span>Delivery' + (ship === 'express' ? ' (express)' : '') + '</span><b>' +
        (ship === 'express' ? money(t.ship + 90) : ship === 'pickup' ? 'Free' : (t.ship ? money(t.ship) : 'Free')) + '</b></div>' +
        (t.cod ? '<div class="summary__row"><span>COD handling</span><b>' + money(t.cod) + '</b></div>' : '') +
        '<div class="summary__row summary__row--total"><span>Illustrative total (not payable)</span><b>' + money(payable(t)) + '</b></div>' +
        '<button class="btn btn--primary btn--lg btn--block mt-14" data-place>Save demo checkout (no payment)</button>' +
        '<p class="small muted tc mt-8">Test only: no payment, order, or delivery commitment.</p>' +
        '</aside></div>';
    }

    /* keep whatever the customer has already typed when a radio or the state
       select forces a re-render — otherwise switching to Express wipes the form */
    function snapshot() {
      const form = $('[data-addrform]');
      if (!form) return;
      $$('[data-f]', form).forEach(function (el) { saved[el.getAttribute('data-f')] = el.value; });
    }

    function payable(t) {
      let v = t.total;
      if (ship === 'express') v += 90;
      if (ship === 'pickup') v -= t.ship;
      return Math.max(0, v);
    }

    function fld(label, key, type, val, req, err) {
      return '<div class="field"><label>' + label + ' <span class="req">*</span></label>' +
        '<input type="' + type + '" data-f="' + key + '" data-req="' + req + '" value="' + esc(val || '') + '">' +
        '<span class="err">' + err + '</span></div>';
    }
    function rad(group, val, current, title, sub, extra) {
      return '<label class="radio' + (val === current ? ' is-on' : '') + '">' +
        '<input type="radio" name="' + group + '" value="' + val + '"' + (val === current ? ' checked' : '') + '>' +
        '<span style="flex:1"><b>' + title + '</b><span>' + sub + '</span></span>' +
        (extra ? '<b class="small">' + extra + '</b>' : '') + '</label>';
    }

    host.addEventListener('change', function (e) {
      if (e.target.name === 'ship') { ship = e.target.value; draw(); }
      else if (e.target.getAttribute('data-f') === 'state') draw();
    });

    host.addEventListener('click', async function (e) {
      if (!e.target.closest('[data-place]')) return;
      if (busy) return;
      const form = $('[data-addrform]');
      if (!A.validate(form)) { A.Toast.show('Check the highlighted fields', 'Some required details are missing.', 'err'); return; }
      const addr = {};
      $$('[data-f]', form).forEach(function (el) { addr[el.getAttribute('data-f')] = el.value.trim(); });
      if (!/@example\.com$/i.test(addr.email || '') || addr.phone !== '0000000000') {
        A.Toast.show('Demo details only', 'Enter an @example.com email and 0000000000 as the phone.', 'err');
        return;
      }
      // Keep test contact details only in this form, not in the device's saved address.
      busy = true;
      const button = $('[data-place]');
      const oldNotice = $('[data-payment-error]');
      if (oldNotice) oldNotice.remove();
      button.disabled = true;
      button.textContent = 'Saving demo…';
      try {
        const result = await demoRequest('create', { address: addr, ship: ship, items: A.Cart.all() });
        if (result.status !== 'demo' || !result.reference) throw new Error('Demo was not saved.');
        host.innerHTML = '<div class="panel" style="padding:34px;text-align:center"><h2>DEMO SAVED — no payment collected</h2>' +
          '<p>This is a test record, not a real order. Reference: <b>' + esc(result.reference) + '</b>.</p>' +
          '<p>View it in the admin Payment Gateway — DEMO page. No products will be shipped.</p></div>';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        const notice = document.createElement('p');
        notice.setAttribute('data-payment-error', '');
        notice.setAttribute('role', 'alert');
        notice.className = 'small mt-8';
        notice.style.color = 'var(--red)';
        notice.textContent = err.message || 'Demo backend unavailable. No payment was collected.';
        button.insertAdjacentElement('afterend', notice);
        A.Toast.show('Demo not saved', 'Please see the message below the button.', 'err');
        button.disabled = false;
        button.textContent = 'Save demo checkout (no payment)';
        busy = false;
      }
    });

    draw();
  }

  /* ========================================================= wishlist ==== */
  function wishlist() {
    const host = $('[data-wishwrap]');
    function draw() {
      const list = A.Wish.all().map(SITE.byslug).filter(Boolean);
      if (!list.length) {
        host.innerHTML = '<div class="panel"><div class="empty"><div class="empty__ic">' + ic('heart') + '</div>' +
          '<h4>Your wishlist is empty</h4><p>Tap the heart on any product to keep it here for later.</p>' +
          '<a class="btn btn--primary" href="products.html">Browse Products</a></div></div>';
        return;
      }
      host.innerHTML =
        '<div class="row row--between mb-14"><span class="toolbar__count"><b>' + list.length + '</b> saved item' + (list.length > 1 ? 's' : '') + '</span>' +
        '<div class="row"><button class="btn btn--outline btn--sm" data-addall>Add all to cart</button>' +
        '<button class="btn btn--danger btn--sm" data-clearwish>Clear wishlist</button></div></div>' +
        '<div class="pgrid pgrid--4">' + list.map(function (p) { return card(p, { showCat: true }); }).join('') + '</div>';
      A.Wish.sync();
    }
    host.addEventListener('click', function (e) {
      if (e.target.closest('[data-addall]')) {
        const list = A.Wish.all();
        list.forEach(function (s) { const p = SITE.byslug(s); if (p) A.Cart.add(s, p.sizes[0][0], 1); });
        return;
      }
      if (e.target.closest('[data-clearwish]')) { A.Wish.clear(); A.Toast.show('Wishlist cleared', '', 'warn'); }
    });
    document.addEventListener('wish:change', draw);
    draw();
  }

  /* ========================================================== account ==== */
  function account() {
    const host = $('[data-account]');
    const TABS = [
      ['dash', 'Dashboard', 'home'], ['orders', 'My Orders', 'receipt'],
      ['wish', 'Wishlist', 'heart'], ['addr', 'Addresses', 'pin'], ['profile', 'Profile', 'user']
    ];
    let tab = qs('tab') || 'dash';

    function draw() {
      const orders = A.Orders.all(), addr = A.read(A.keys.addr, {});
      const wish = A.Wish.all().map(SITE.byslug).filter(Boolean);
      let body = '';

      if (tab === 'dash') {
        body = '<div class="panel" style="padding:20px"><h3 style="font-size:19px">Namaskaram' + (addr.name ? ', ' + esc(addr.name.split(' ')[0]) : '') + '</h3>' +
          '<p class="muted small">Everything below lives in this browser only — this demo has no server account.</p>' +
          '<div class="cards3 mt-20">' +
          [['receipt', orders.length, 'Orders placed'], ['heart', wish.length, 'Wishlist items'], ['cart', A.Cart.count(), 'Items in cart']]
            .map(function (s) {
              return '<div class="icard"><span class="icard__ic">' + ic(s[0]) + '</span>' +
                '<h4 style="font-size:26px">' + s[1] + '</h4><p>' + s[2] + '</p></div>';
            }).join('') + '</div>' +
          '<div class="divider"></div><h4 style="font-size:15px" class="mb-8">Recently viewed</h4>' +
          (A.Recent.all().length
            ? '<div class="pgrid pgrid--4">' + A.Recent.all().slice(0, 4).map(function (p) { return card(p); }).join('') + '</div>'
            : '<p class="muted small">Nothing viewed yet.</p>') +
          '</div>';
      } else if (tab === 'orders') {
        body = '<div class="panel" style="padding:20px"><h3 style="font-size:19px" class="mb-14">My Orders</h3>' +
          (orders.length
            ? orders.map(function (o) {
                const d = new Date(o.placed);
                return '<div class="panel mb-14" style="padding:14px"><div class="row row--between">' +
                  '<span><b>' + o.id + '</b><br><span class="small muted">' + d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' + o.items.length + ' item(s)</span></span>' +
                  '<span class="tr"><b>' + money(o.total) + '</b><br><span class="badge badge--ok">' + esc(o.status) + '</span></span></div>' +
                  '<div class="row row--wrap mt-14" style="gap:8px">' +
                  o.items.map(function (l) { return '<img src="' + l.img + '" alt="' + esc(l.name) + '" title="' + esc(l.name) + ' · ' + esc(l.size) + '" style="width:44px;height:44px;border:1px solid var(--line);border-radius:6px;background:#fff">'; }).join('') +
                  '</div><div class="row mt-14"><a class="btn btn--outline btn--sm" href="track-order.html?id=' + o.id + '">Track order</a>' +
                  '<button class="btn btn--ghost btn--sm" data-reorder="' + o.id + '">Reorder</button></div></div>';
              }).join('')
            : '<div class="empty"><div class="empty__ic">' + ic('receipt') + '</div><h4>No orders yet</h4>' +
              '<p>Orders you place in this browser will appear here.</p><a class="btn btn--primary" href="products.html">Start shopping</a></div>') +
          '</div>';
      } else if (tab === 'wish') {
        body = '<div class="panel" style="padding:20px"><h3 style="font-size:19px" class="mb-14">Wishlist</h3>' +
          (wish.length ? '<div class="pgrid pgrid--3">' + wish.map(function (p) { return card(p); }).join('') + '</div>'
            : '<p class="muted">Nothing saved yet. <a class="linkish" href="products.html">Browse products</a></p>') + '</div>';
      } else if (tab === 'addr') {
        body = '<div class="panel" style="padding:20px"><h3 style="font-size:19px" class="mb-14">Saved Address</h3>' +
          (addr.name
            ? '<div class="panel" style="padding:16px;max-width:420px"><span class="badge badge--ok mb-8">' + esc(addr.type || 'Home') + '</span>' +
              '<p><b>' + esc(addr.name) + '</b><br>' + esc(addr.addr || '') + '<br>' + esc(addr.city || '') + ', ' + esc(addr.state || '') + ' — ' + esc(addr.pin || '') + '<br>' +
              esc(addr.phone || '') + '</p><button class="btn btn--danger btn--sm mt-14" data-delAddr>Remove</button></div>'
            : '<p class="muted">No address saved. It is stored automatically the first time you check out.</p>') +
          '<a class="btn btn--outline btn--sm mt-14" href="checkout.html">Add / edit at checkout</a></div>';
      } else {
        body = '<div class="panel" style="padding:20px"><h3 style="font-size:19px">Profile &amp; Preferences</h3>' +
          '<p class="muted small mb-20">Stored locally in this browser. Nothing is sent anywhere.</p>' +
          '<form class="form" style="max-width:460px" data-profile novalidate>' +
          '<div class="field"><label>Name</label><input data-f="name" value="' + esc(addr.name || '') + '"></div>' +
          '<div class="field"><label>Mobile</label><input data-f="phone" value="' + esc(addr.phone || '') + '"></div>' +
          '<div class="field"><label>Email</label><input data-f="email" value="' + esc(addr.email || '') + '"></div>' +
          '<div class="field"><label>Language preference</label><select data-langpref>' +
          '<option value="bi"' + (A.read(A.keys.lang, 'bi') === 'bi' ? ' selected' : '') + '>English first (bilingual)</option>' +
          '<option value="ta"' + (A.read(A.keys.lang, 'bi') === 'ta' ? ' selected' : '') + '>தமிழ் முதலில்</option></select></div>' +
          '<button class="btn btn--primary" type="submit">Save changes</button></form>' +
          '<div class="divider"></div><button class="btn btn--danger btn--sm" data-wipe>Erase all local data</button>' +
          '<p class="small muted mt-8">Clears cart, wishlist, orders, address and language preference from this browser.</p></div>';
      }

      host.innerHTML = '<div class="accountlayout"><nav class="sidenav">' +
        TABS.map(function (t) {
          return '<button data-acct="' + t[0] + '" class="' + (t[0] === tab ? 'is-on' : '') + '">' + ic(t[2]) + t[1] + '</button>';
        }).join('') + '</nav><div>' + body + '</div></div>';
      A.Wish.sync();
    }

    host.addEventListener('click', function (e) {
      const t = e.target.closest('[data-acct]');
      if (t) { tab = t.getAttribute('data-acct'); history.replaceState(null, '', 'account.html?tab=' + tab); draw(); return; }
      const r = e.target.closest('[data-reorder]');
      if (r) {
        const o = A.Orders.find(r.getAttribute('data-reorder'));
        if (o) { o.items.forEach(function (l) { A.Cart.add(l.slug, l.size, l.qty); }); A.Drawer.open(); }
        return;
      }
      if (e.target.closest('[data-delAddr]')) { A.write(A.keys.addr, {}); draw(); A.Toast.show('Address removed', '', 'warn'); return; }
      if (e.target.closest('[data-wipe]')) {
        Object.keys(A.keys).forEach(function (k) { A.write(A.keys[k], k === 'cart' || k === 'wish' || k === 'recent' || k === 'orders' ? [] : ''); });
        A.Cart.sync(); A.Wish.clear();
        document.documentElement.classList.remove('lang-ta');
        A.Toast.show('Local data erased', 'This browser is back to a clean slate.', 'warn');
        draw();
      }
    });
    host.addEventListener('submit', function (e) {
      if (!e.target.closest('[data-profile]')) return;
      e.preventDefault();
      const addr = A.read(A.keys.addr, {});
      $$('[data-f]', e.target).forEach(function (el) { addr[el.getAttribute('data-f')] = el.value.trim(); });
      A.write(A.keys.addr, addr);
      A.write(A.keys.lang, $('[data-langpref]').value);
      location.reload();
    });
    draw();
  }

  /* ============================================================ track ==== */
  function track() {
    const host = $('[data-track]');
    const STEPS = [
      ['confirmed', 'Order Confirmed', 'checkCircle'], ['packed', 'Packed', 'box'],
      ['shipped', 'Shipped', 'truck'], ['out', 'Out for Delivery', 'pkg'], ['delivered', 'Delivered', 'home']
    ];
    const DEMO = {
      id: 'SO10001', demo: true, placed: new Date(Date.now() - 3 * 864e5).toISOString(),
      status: 'shipped', reached: 'shipped', total: 1030, payMethod: 'upi', shipMethod: 'standard',
      addr: { name: 'Sample Customer', city: 'Coimbatore', state: 'Tamil Nadu', pin: '641001' },
      items: [
        { slug: 'groundnut-oil', name: 'Groundnut Oil', size: '1 L', qty: 1, total: 280, img: 'assets/img/products/groundnut-oil.svg' },
        { slug: 'cow-ghee', name: 'Pure Cow Ghee', size: '500 ml', qty: 1, total: 650, img: 'assets/img/products/cow-ghee.svg' },
        { slug: 'neem-soap', name: 'Neem Soap', size: 'Pack of 3', qty: 1, total: 150, img: 'assets/img/products/neem-soap.svg' }
      ]
    };

    function show(o) {
      const reached = o.reached || o.status || 'confirmed';
      const isCancelled = reached === 'cancelled';
      const isReturned = reached === 'returned';
      let at = STEPS.map(function (s) { return s[0]; }).indexOf(reached);
      if (at < 0) at = 0;   /* cancelled/returned are not timeline steps */
      const placed = new Date(o.placed);
      const dateAt = function (i) {
        if (i > at) return '';
        const d = new Date(placed.getTime() + i * 864e5);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', ' +
          d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
      };
      $('[data-trackresult]').innerHTML =
        '<div class="panel" style="padding:22px">' +
        (o.demo ? '<div class="notice notice--gold mb-14">' + ic('info') + '<span>This is the sample order used to demonstrate tracking. Place a real order to track your own.</span></div>' : '') +
        (isCancelled ? '<div class="notice mb-14" style="border-color:#f2c4c4;background:#fdf2f2">' + ic('alert') + '<span><b>This order was cancelled.</b> If this was a mistake, call us and we will re-open it.</span></div>' : '') +
        (isReturned ? '<div class="notice mb-14" style="border-color:#f2c4c4;background:#fdf2f2">' + ic('alert') + '<span><b>This order was returned.</b> Your refund reaches the original payment method within 5–7 working days.</span></div>' : '') +
        '<div class="row row--between"><span><span class="small muted">Order</span><h3 style="font-size:20px;font-family:var(--font-en);letter-spacing:.02em">' + o.id + '</h3>' +
        '<span class="small muted">Placed ' + placed.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) + '</span></span>' +
        '<span class="tr"><span class="badge ' + (isCancelled || isReturned ? 'badge--no' : reached === 'delivered' ? 'badge--ok' : 'badge--wait') + '">' +
        (isCancelled ? 'Cancelled' : isReturned ? 'Returned' : STEPS[at][1]) + '</span><br><b style="font-size:17px">' + money(o.total) + '</b><br>' +
        '<span class="small muted">' + (o.payMethod === 'cod' ? 'Cash on delivery' : String(o.payMethod).toUpperCase()) + '</span></span></div>' +

        '<div class="statusrow">' + STEPS.map(function (s, i) {
          const cls = i < at ? 'is-done' : i === at ? 'is-done is-now' : '';
          return '<div class="snode ' + cls + '"><i>' + ic(s[2]) + '</i><b>' + s[1] + '</b><span>' + (dateAt(i) || '—') + '</span></div>';
        }).join('') + '</div>' +

        '<div class="divider"></div>' +
        '<div class="cards2"><div><h5 style="font-family:var(--font-en);font-size:13px" class="mb-8">Items</h5>' +
        o.items.map(function (l) {
          return '<div class="mini" style="padding:8px 0"><img src="' + l.img + '" alt="" style="width:46px;height:46px">' +
            '<div class="mini__b"><span class="mini__nm">' + esc(l.name) + '</span>' +
            '<small class="muted small">' + esc(l.size) + ' × ' + l.qty + '</small></div><b class="small">' + money(l.total) + '</b></div>';
        }).join('') + '</div>' +
        '<div><h5 style="font-family:var(--font-en);font-size:13px" class="mb-8">Delivering to</h5>' +
        '<p class="small"><b>' + esc(o.addr.name || '') + '</b><br>' + esc(o.addr.addr || '') + '<br>' +
        esc(o.addr.city || '') + ', ' + esc(o.addr.state || '') + ' — ' + esc(o.addr.pin || '') + '</p>' +
        '<div class="notice mt-14">' + ic('headset') + '<span>Questions about this order? Call <a class="linkish" href="tel:' + SITE.shop.phoneHref + '">' + SITE.shop.phone + '</a> with the order number.</span></div>' +
        '</div></div></div>';
    }

    /* Map an admin/Supabase order status to a tracking step.
       Admin statuses: pending, processing, shipped, delivered, cancelled, returned. */
    function mapSupabaseReached(s) {
      s = String(s || '').toLowerCase();
      if (s === 'shipped') return 'shipped';
      if (s === 'delivered') return 'delivered';
      if (s === 'cancelled') return 'cancelled';
      if (s === 'returned') return 'returned';
      if (s === 'pending' || s === 'confirmed' || s === 'processing') return 'confirmed';
      return null;   /* unknown → keep whatever the local copy says */
    }

    /* show() + live status refresh from Supabase.
       Renders instantly from the local copy, then asks the shop's database
       for the current status (set from the admin panel) and re-renders if it
       has moved on. Also syncs the local copy so "My Orders" matches. */
    function showLive(o) {
      if (!o) return;
      show(o);
      if (!window.__soEnsureSupabase || o.demo) return;
      window.__soEnsureSupabase().then(function () {
        const client = window.SupabaseClient;
        if (!client) return;
        return client.from('orders')
          .select('status, updated_at')
          .eq('order_number', o.id)
          .maybeSingle()
          .then(function (res) {
            if (!res || res.error || !res.data) return;   /* local-only order */
            const reached = mapSupabaseReached(res.data.status);
            if (!reached) return;
            const current = o.reached || o.status || 'confirmed';
            if (current === reached) return;              /* already up to date */
            o.reached = reached;
            o.status = reached;
            /* keep this browser's copy in sync so My Orders matches too */
            const all = A.Orders.all();
            const m = all.find(function (x) { return x.id === o.id; });
            if (m) { m.reached = reached; m.status = reached; A.write(A.keys.orders, all); }
            show(o);
            A.Toast.show('Order status updated', 'Latest from the shop: ' +
              reached.charAt(0).toUpperCase() + reached.slice(1));
          });
      }).catch(function () { /* offline — the local render stays */ });
    }

    host.addEventListener('submit', function (e) {
      e.preventDefault();
      const v = $('[data-orderid]').value.trim().toUpperCase();
      if (!v) { A.Toast.show('Enter an order number', 'It looks like SO10482.', 'err'); return; }
      if (v === 'SO10001') { show(DEMO); return; }
      const o = A.Orders.find(v);
      if (!o) {
        $('[data-trackresult]').innerHTML = '<div class="panel"><div class="empty"><div class="empty__ic">' + ic('search') + '</div>' +
          '<h4>No order found for ' + esc(v) + '</h4>' +
          '<p>Orders placed in this browser can be tracked here. Try the sample order <b>SO10001</b>, or place an order to see the real flow.</p>' +
          '<button class="btn btn--outline" data-demo>Track sample order SO10001</button></div></div>';
        return;
      }
      showLive(o);
    });
    host.addEventListener('click', function (e) {
      if (e.target.closest('[data-demo]')) { $('[data-orderid]').value = 'SO10001'; show(DEMO); }
    });

    const pre = qs('id');
    if (pre) { $('[data-orderid]').value = pre; if (pre.toUpperCase() === 'SO10001') show(DEMO); else { const o = A.Orders.find(pre); if (o) showLive(o); } }
    /* list this browser's orders as shortcuts */
    const mine = A.Orders.all();
    if (mine.length) {
      $('[data-myorders]').innerHTML = '<p class="small muted mb-8">Your recent orders on this device:</p>' +
        mine.slice(0, 5).map(function (o) {
          return '<button class="tagx" data-pick="' + o.id + '">' + o.id + ' · ' + money(o.total) + '</button>';
        }).join(' ');
      $('[data-myorders]').addEventListener('click', function (e) {
        const b = e.target.closest('[data-pick]');
        if (b) { $('[data-orderid]').value = b.getAttribute('data-pick'); showLive(A.Orders.find(b.getAttribute('data-pick'))); }
      });
    }
  }

  /* ========================================================== recipes ==== */
  function recipesPage() {
    const host = $('[data-recipes]');

    function renderCard(r) {
      const a = SITE.byAuthor(r.author_slug);
      const byline = a
        ? '<div class="recipe__byline">' +
            (a.author_avatar_url
              ? '<img src="' + esc(a.author_avatar_url) + '" alt="" class="recipe__byline-av">'
              : '<span class="recipe__byline-av recipe__byline-av--ph">' + esc((a.full_name || '?').slice(0, 1).toUpperCase()) + '</span>') +
            '<span>By <b>' + esc(a.full_name || '') + '</b>' +
            (a.author_bio ? ' <span class="muted">· ' + esc(a.author_bio.slice(0, 80)) + (a.author_bio.length > 80 ? '…' : '') + '</span>' : '') +
            '</span></div>'
        : '';
      return '<article class="recipe"><img src="assets/img/recipes/' + r.img + '.svg" alt="' + esc(r.title) + '" loading="lazy">' +
        '<div class="recipe__b"><h4>' + esc(r.title) + '</h4><span class="ta">' + esc(r.ta) + '</span>' +
        '<p>' + esc(r.blurb) + '</p>' +
        '<div class="recipe__meta"><span>' + ic('clock') + r.time + '</span><span>' + ic('users') + 'Serves ' + r.serves + '</span>' +
        '<span>' + ic('award') + r.level + '</span></div>' +
        byline +
        '<div class="divider" style="margin:6px 0 10px"></div>' +
        '<p class="small muted mb-8">Made with</p><div class="row row--wrap" style="gap:6px">' +
        r.uses.map(function (s) {
          const p = SITE.byslug(s);
          return p ? '<a class="tagx" href="product.html?p=' + p.slug + '">' + esc(p.name) + '</a>' : '';
        }).join('') + '</div>' +
        '<button class="btn btn--outline btn--sm btn--block mt-14" data-recipeadd="' + r.slug + '">Add all ingredients to cart</button>' +
        '</div></article>';
    }

    function renderAll() {
      host.innerHTML = SITE.recipes.map(renderCard).join('');
    }

    renderAll();

    /* Lazily load author rows from the public view, then re-render. */
    (async function loadAuthors() {
      const slugs = Array.from(new Set(
        SITE.recipes.map(function (r) { return r.author_slug; }).filter(Boolean)
      ));
      if (!slugs.length || !window.SupabaseClient) return;
      try {
        const rows = await window.Supabase.getAuthorsBySlugs(slugs);
        rows.forEach(function (row) { SITE.authors[row.author_slug] = row; });
        const hasAny = SITE.recipes.some(function (r) { return SITE.byAuthor(r.author_slug); });
        if (hasAny) renderAll();
      } catch (e) { /* byline is optional; render without it on failure */ }
    })();

    host.addEventListener('click', function (e) {
      const b = e.target.closest('[data-recipeadd]');
      if (!b) return;
      const r = SITE.recipes.filter(function (x) { return x.slug === b.getAttribute('data-recipeadd'); })[0];
      r.uses.forEach(function (s) { const p = SITE.byslug(s); if (p) A.Cart.add(s, p.sizes[0][0], 1); });
      A.Drawer.open();
    });
  }

  /* ============================================================= faqs ==== */
  function faqsPage() {
    const host = $('[data-faqs]');
    const render = function (list) {
      host.innerHTML = list.length
        ? list.map(function (f) {
            return '<div class="acc__item"><button class="acc__q" data-acc-q>' + esc(f.q) +
              '<span class="ic">' + ic('chevD') + '</span></button><div class="acc__a">' + esc(f.a) + '</div></div>';
          }).join('')
        : '<div class="empty"><div class="empty__ic">' + ic('search') + '</div><h4>No answer matched</h4>' +
          '<p>Ask us directly — we reply within one working day.</p><a class="btn btn--primary" href="contact.html">Contact us</a></div>';
    };
    render(SITE.faqs);
    const s = $('[data-faqsearch]');
    if (s) s.addEventListener('input', function () {
      const q = s.value.trim().toLowerCase();
      render(!q ? SITE.faqs : SITE.faqs.filter(function (f) {
        return (f.q + ' ' + f.a).toLowerCase().indexOf(q) > -1;
      }));
    });
  }

  /* ============================================================ forms ==== */
  function forms() {
    $$('[data-form]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!A.validate(form)) { A.Toast.show('Check the highlighted fields', 'A few required details are missing.', 'err'); return; }
        const kind = form.getAttribute('data-form');
        const done = form.getAttribute('data-done') ||
          (kind === 'enquiry' ? 'Enquiry received. Our wholesale desk replies within one working day.'
            : 'Message received. We usually reply within one working day.');
        form.innerHTML = '<div class="empty"><div class="empty__ic" style="background:var(--green-050);color:var(--green-700)">' +
          ic('checkCircle') + '</div><h4>Thank you!</h4><p>' + esc(done) + '</p>' +
          '<p class="small muted">This demo does not send email — nothing left your browser.</p></div>';
        A.Toast.show('Sent', done, 'ok');
      });
    });
  }

  /* ========================================================= dispatch ==== */
  A.ready(function () {
    icons();
    rails();
    forms();
    const page = document.body.getAttribute('data-page');
    try {
      if (page === 'home') home();
      else if (page === 'products') products();
      else if (page === 'product') product();
      else if (page === 'cart') cart();
      else if (page === 'checkout') checkout();
      else if (page === 'wishlist') wishlist();
      else if (page === 'account') account();
      else if (page === 'track') track();
      else if (page === 'recipes') recipesPage();
      else if (page === 'faqs') faqsPage();
    } catch (err) {
      if (window.console) console.error('[' + page + ']', err);
    }
  });
})();
