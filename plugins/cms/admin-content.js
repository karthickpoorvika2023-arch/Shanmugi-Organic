/* ==========================================================================
   admin-content.js — "Website Content" panel for the admin dashboard
   --------------------------------------------------------------------------
   Lists every page of the storefront. Clicking a page opens the live page in
   an iframe; click any text / image / icon / button on the page and edit it in
   the right-hand inspector. Changes are saved to localStorage instantly and
   optionally mirrored to Supabase (table `site_content`) for all visitors.

   Reads/writes the same store as plugins/cms/content-cms.js (shared runtime).
   ========================================================================== */
(function () {
  'use strict';

  var CM = window.ContentCMS;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  var doc = CM ? CM.load() : null;
  var ICONS = [];
  var IMAGES = null;
  var cur = null;            /* current selection (from the iframe) */
  var frame = null;
  var framePage = '';
  var seq = 0;
  var waiters = {};
  var undoStack = [];
  var sideTab = 'edit';
  var elList = [];
  var listFilter = '';
  var shellOnly = false;

  /* ------------------------------------------------------------- helpers -- */
  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function merge(a, b) {
    var o = {}, k;
    for (k in a) o[k] = a[k];
    for (k in b) o[k] = b[k];
    return o;
  }

  function splitKey(key) {
    var i = key.indexOf('::');
    return { scope: key.slice(0, i), sel: key.slice(i + 2) };
  }

  function kb(n) { return (n / 1024).toFixed(n > 102400 ? 0 : 1) + ' KB'; }

  function toast(msg, kind) {
    var old = $('.toast');
    if (old) old.remove();
    var t = document.createElement('div');
    t.className = 'toast' + (kind === 'error' ? ' error' : kind === 'warn' ? ' warn' : '');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('is-show'); }, 10);
    setTimeout(function () {
      t.classList.remove('is-show');
      setTimeout(function () { t.remove(); }, 300);
    }, 3200);
  }

  /* --------------------------------------------------------------- store -- */
  function reload() { doc = CM.load(); return doc; }

  function snapshot() {
    if (!doc) return;
    undoStack.push(JSON.stringify(doc));
    if (undoStack.length > 40) undoStack.shift();
  }

  function persist(push) {
    if (!doc) return;
    doc.updatedAt = Date.now();
    var ok = CM.save(doc);
    if (!ok) toast('Browser storage is full — use smaller images or turn on Cloud sync.', 'error');
    if (push !== false && CM.cloudEnabled()) {
      CM.cloudPush(doc).then(function (r) {
        if (!r || !r.ok) setCloudState(false, (r && r.error) || 'push failed');
        else setCloudState(true, '');
      });
    }
    paintMeter();
  }

  function undo() {
    if (!undoStack.length) { toast('Nothing to undo', 'warn'); return; }
    var prev = undoStack.pop();
    doc = JSON.parse(prev);
    CM.save(doc);
    send('reapply');
    render();
    toast('Undone');
  }

  function setCloudState(on, err) {
    var chip = $('#cmsCloudChip');
    if (!chip) return;
    chip.className = 'cms-chip ' + (on ? 'cms-chip--on' : (err ? 'cms-chip--warn' : 'cms-chip--off'));
    chip.textContent = on ? '☁️ Cloud sync ON' : (err ? '⚠️ Cloud sync error' : '💾 This browser only');
    chip.title = err || '';
  }

  /* --------------------------------------------------- iframe messaging -- */
  function send(type, payload) {
    return new Promise(function (resolve) {
      if (!frame || !frame.contentWindow) { resolve(null); return; }
      var id = ++seq;
      var done = false;
      waiters[id] = function (data) { done = true; resolve(data); };
      try {
        frame.contentWindow.postMessage({ __cms: true, id: id, type: type, payload: payload || {} }, '*');
      } catch (e) {
        delete waiters[id];
        resolve(null);
        return;
      }
      setTimeout(function () {
        if (!done && waiters[id]) { delete waiters[id]; resolve(null); }
      }, 8000);
    });
  }

  window.addEventListener('message', function (ev) {
    var d = ev.data;
    if (!d || d.__cms !== true) return;
    if (d.id && waiters[d.id]) {
      var w = waiters[d.id];
      delete waiters[d.id];
      w(d.data);
      return;
    }
    if (d.t === 'select') { setSelection(d.info); return; }
    if (d.t === 'ready') { onFrameReady(); return; }
  });

  /* ============================================================== panel === */
  var SVG_PAGE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>';
  var SVG_SHELL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h18v5H3z"/><path d="M3 10v9h18v-9"/><path d="M7 15h4"/></svg>';

  function pageCard(p) {
    var edits = CM.scopeEdits(doc, p.file);
    return '<div class="cms-page-card">' +
      '<div class="cms-page-card__top">' +
      '<div class="cms-page-card__ic">' + SVG_PAGE + '</div>' +
      '<div style="min-width:0">' +
      '<div class="cms-page-card__name">' + esc(p.name) + '</div>' +
      '<div class="cms-page-card__ta">' + esc(p.ta || '') + '</div>' +
      '</div>' +
      '<span class="cms-chip ' + (edits ? 'cms-chip--on' : 'cms-chip--off') + '" style="margin-left:auto">' +
      (edits ? edits + ' edit' + (edits > 1 ? 's' : '') : 'no edits') + '</span>' +
      '</div>' +
      '<span class="cms-page-card__file">' + esc(p.file) + '</span>' +
      '<div class="cms-page-card__note">' + esc(p.note || '') + '</div>' +
      '<div class="cms-page-card__actions">' +
      '<button class="btn-sm btn-sm--primary" data-open="' + esc(p.file) + '">✏️ Edit page</button>' +
      '<button class="btn-sm" data-view="' + esc(p.file) + '">↗ View</button>' +
      (edits ? '<button class="btn-sm btn-sm--danger" data-reset-page="' + esc(p.file) + '">↺ Reset</button>' : '') +
      '</div>' +
      '</div>';
  }

  function toolbar() {
    var size = CM.docSize(doc);
    return '<div class="cms-toolbar">' +
      '<div class="cms-toolbar__group">' +
      '<button class="btn-sm btn-sm--primary" id="cmsOpenHome">✏️ Open Home editor</button>' +
      '<button class="btn-sm" id="cmsUndo">↶ Undo</button>' +
      '<button class="btn-sm" id="cmsRefresh">🔄 Refresh list</button>' +
      '</div>' +
      '<div class="cms-toolbar__group">' +
      '<span class="cms-chip ' + (CM.cloudEnabled() ? 'cms-chip--on' : 'cms-chip--off') + '" id="cmsCloudChip">' +
      (CM.cloudEnabled() ? '☁️ Cloud sync ON' : '💾 This browser only') + '</span>' +
      '<button class="btn-sm" id="cmsCloud">' + (CM.cloudEnabled() ? 'Turn cloud OFF' : 'Turn cloud ON') + '</button>' +
      '<button class="btn-sm" id="cmsCopySql">📋 Copy SQL</button>' +
      '<button class="btn-sm" id="cmsExport">⬇️ Export</button>' +
      '<button class="btn-sm" id="cmsImport">⬆️ Import</button>' +
      '<button class="btn-sm btn-sm--danger" id="cmsResetAll">↺ Reset all</button>' +
      '<input type="file" id="cmsImportFile" accept="application/json,.json" style="display:none">' +
      '</div>' +
      '<div class="cms-toolbar__meta">' +
      '<b>' + CM.totalEdits(doc) + '</b> saved edits · <b>' + kb(size) + '</b> of browser storage' +
      '<div class="cms-size-meter' + (size > 3800000 ? ' is-danger' : size > 2200000 ? ' is-warn' : '') + '" title="localStorage budget is about 5 MB">' +
      '<i style="width:' + Math.min(100, Math.round(size / 50000)) + '%"></i></div>' +
      '</div>' +
      '</div>';
  }

  function render() {
    var host = document.getElementById('pageContent');
    if (!host) return;
    reload();
    var groups = [], seen = {};
    CM.PAGES.forEach(function (p) {
      if (!seen[p.group]) { seen[p.group] = []; groups.push(p.group); }
      seen[p.group].push(p);
    });

    var html = toolbar();
    html += '<div class="cms-banner cms-banner--info">' +
      '<span>🎯</span><div><b>How it works:</b> open a page, then <b>click any heading, paragraph, button, icon or image</b> ' +
      'in the live preview and edit it on the right. Icons, buttons and images can also be <b>added</b> to any section. ' +
      'Every keystroke is saved instantly. Header &amp; footer edits apply to <b>every page</b> automatically.</div></div>';

    var shellEdits = CM.scopeEdits(doc, 'shell:header') + CM.scopeEdits(doc, 'shell:footer');
    html += '<div class="cms-group-title">Site-wide</div><div class="cms-pages">' +
      '<div class="cms-page-card">' +
      '<div class="cms-page-card__top"><div class="cms-page-card__ic">' + SVG_SHELL + '</div>' +
      '<div><div class="cms-page-card__name">Header &amp; Footer</div>' +
      '<div class="cms-page-card__ta">எல்லா பக்கங்களுக்கும்</div></div>' +
      '<span class="cms-chip ' + (shellEdits ? 'cms-chip--on' : 'cms-chip--off') + '" style="margin-left:auto">' +
      shellEdits + ' edits</span></div>' +
      '<span class="cms-page-card__file">menu · top bar · footer</span>' +
      '<div class="cms-page-card__note">Menu labels, header buttons, logo, footer links, address and phone numbers — shown on every page.</div>' +
      '<div class="cms-page-card__actions"><button class="btn-sm btn-sm--primary" id="cmsOpenShell">✏️ Edit header &amp; footer</button></div>' +
      '</div></div>';

    groups.forEach(function (g) {
      html += '<div class="cms-group-title">' + esc(g) + '</div><div class="cms-pages">' +
        seen[g].map(pageCard).join('') + '</div>';
    });

    host.innerHTML = html;
    bindPanel();
    setCloudState(CM.cloudEnabled(), '');
  }

  function bindPanel() {
    var openHome = $('#cmsOpenHome');
    if (openHome) openHome.addEventListener('click', function () { openEditor('index.html', {}); });
    var openShell = $('#cmsOpenShell');
    if (openShell) openShell.addEventListener('click', function () { openEditor('index.html', { shellOnly: true }); });
    $$('[data-open]').forEach(function (b) {
      b.addEventListener('click', function () { openEditor(b.getAttribute('data-open'), {}); });
    });
    $$('[data-view]').forEach(function (b) {
      b.addEventListener('click', function () { window.open(b.getAttribute('data-view'), '_blank'); });
    });
    $$('[data-reset-page]').forEach(function (b) {
      b.addEventListener('click', function () {
        var scope = b.getAttribute('data-reset-page');
        if (!confirm('Remove all content edits on ' + scope + '?')) return;
        snapshot();
        CM.resetScope(scope);
        reload();
        send('reapply');
        render();
        toast('Edits cleared for ' + scope);
      });
    });
    var refresh = $('#cmsRefresh');
    if (refresh) refresh.addEventListener('click', function () { render(); toast('List refreshed'); });
    var undoBtn = $('#cmsUndo');
    if (undoBtn) undoBtn.addEventListener('click', undo);
    var resetAll = $('#cmsResetAll');
    if (resetAll) resetAll.addEventListener('click', function () {
      if (!confirm('Delete EVERY content edit on the whole website? This cannot be undone.')) return;
      snapshot();
      CM.resetAll();
      reload();
      send('reapply');
      render();
      toast('All content edits removed');
    });
    var exp = $('#cmsExport');
    if (exp) exp.addEventListener('click', exportJson);
    var imp = $('#cmsImport'), impFile = $('#cmsImportFile');
    if (imp && impFile) {
      imp.addEventListener('click', function () { impFile.click(); });
      impFile.addEventListener('change', importJson);
    }
    var cloud = $('#cmsCloud');
    if (cloud) cloud.addEventListener('click', toggleCloud);
    var copySqlBtn = $('#cmsCopySql');
    if (copySqlBtn) copySqlBtn.addEventListener('click', copySql);
    paintMeter();
  }

  function paintMeter() {
    var bar = $('.cms-size-meter i');
    if (bar) bar.style.width = Math.min(100, Math.round(CM.docSize(doc) / 50000)) + '%';
  }


  /* --------------------------------------------------- import / export --- */
  function exportJson() {
    var blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'shanmuga-website-content.json';
    a.click();
    toast('Content exported');
  }

  function importJson(e) {
    var f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(String(reader.result));
        if (!data || typeof data !== 'object' || !data.nodes) throw new Error('bad file');
        snapshot();
        data.updatedAt = Date.now();
        CM.save(data);
        reload();
        send('reapply');
        render();
        toast('Content imported');
      } catch (err) {
        toast('That is not a valid content export file', 'error');
      }
    };
    reader.readAsText(f);
  }

  function copySql() {
    fetch('supabase-content-schema.sql').then(function (r) { return r.text(); }).then(function (txt) {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(txt);
      throw new Error('clipboard');
    }).then(function () {
      toast('SQL copied — paste it in Supabase → SQL Editor → Run');
    }).catch(function () {
      window.open('supabase-content-schema.sql', '_blank');
      toast('SQL file opened — paste it in Supabase → SQL Editor', 'warn');
    });
  }

  function toggleCloud() {
    var on = !CM.cloudEnabled();
    if (!on) {
      CM.setCloud(false);
      render();
      toast('Cloud sync off — edits stay in this browser only', 'warn');
      return;
    }
    CM.setCloud(true);
    CM.cloudPush(doc).then(function (r) {
      if (r && r.ok) {
        CM.markFetched();
        render();
        toast('Cloud sync ON — your edits are now live for every visitor');
      } else {
        CM.setCloud(false);
        render();
        var why = (r && r.error) || 'unknown error';
        toast('Cloud sync failed: ' + why + ' — click “Copy SQL” and run it in Supabase first.', 'error');
      }
    });
  }

  /* ============================================================ inspector = */
  function setSelection(info) {
    cur = info || null;
    if (sideTab === 'edit') renderSide();
    var chips = $$('.cms-list-item');
    chips.forEach(function (c) { c.classList.toggle('is-on', !!cur && c.getAttribute('data-key') === cur.key); });
  }

  function onFrameReady() {
    setCloudState(CM.cloudEnabled(), '');
    send('pick', { on: true });
    send('icons').then(function (list) {
      if (list && list.length) {
        ICONS = list;
        if (sideTab === 'edit') renderSide();
      }
    });
    if (cur) selectByKey(cur.key);
    toast('Page loaded — click anything in the preview to edit it');
  }



  /* =============================================================== editor = */
  function ensureEditor() {
    if ($('#cmsEditor')) return;
    var wrap = document.createElement('div');
    wrap.className = 'cms-editor';
    wrap.id = 'cmsEditor';
    wrap.innerHTML =
      '<div class="cms-editor__bar">' +
        '<div class="cms-editor__left">' +
          '<div class="cms-editor__page"><b id="cmsPageName">Page</b><span id="cmsPageFile">file</span></div>' +
          '<button class="cms-btn" id="cmsUndoBtn">↶ Undo</button>' +
          '<button class="cms-btn" id="cmsReloadBtn">🔄 Reload preview</button>' +
        '</div>' +
        '<div class="cms-editor__right">' +
          '<button class="cms-btn cms-btn--on" data-w="desktop">🖥️ Desktop</button>' +
          '<button class="cms-btn" data-w="tablet">📱 Tablet</button>' +
          '<button class="cms-btn" data-w="mobile">📱 Mobile</button>' +
          '<button class="cms-btn" id="cmsViewBtn">↗ Open page</button>' +
          '<button class="cms-btn cms-btn--danger" id="cmsResetPageBtn">↺ Reset page edits</button>' +
          '<button class="cms-btn cms-btn--primary" id="cmsDoneBtn">✔ Done</button>' +
        '</div>' +
      '</div>' +
      '<div class="cms-editor__body">' +
        '<div class="cms-editor__stage"><iframe class="cms-editor__frame" id="cmsFrame" title="Page preview"></iframe></div>' +
        '<div class="cms-editor__side">' +
          '<div class="cms-tabs">' +
            '<button class="cms-tab is-on" data-tab="edit">✏️ Edit element</button>' +
            '<button class="cms-tab" data-tab="list">📋 All items</button>' +
          '</div>' +
          '<div class="cms-side__scroll" id="cmsSideScroll"></div>' +
          '<div class="cms-side__foot" id="cmsSideFoot"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap);
    frame = $('#cmsFrame');
    bindEditor();
  }

  function bindEditor() {
    $('#cmsDoneBtn').addEventListener('click', closeEditor);
    $('#cmsUndoBtn').addEventListener('click', function () {
      undo();
      send('reapply').then(refreshAfterReapply);
    });
    $('#cmsReloadBtn').addEventListener('click', function () { reloadFrame(); toast('Preview reloaded'); });
    $('#cmsViewBtn').addEventListener('click', function () { window.open(framePage, '_blank'); });
    $('#cmsResetPageBtn').addEventListener('click', function () {
      if (!confirm('Remove all content edits on ' + framePage + '?')) return;
      snapshot();
      CM.resetScope(framePage);
      reload();
      reloadFrame();
      render();
      toast('Edits cleared for ' + framePage);
    });
    $$('.cms-editor__right [data-w]').forEach(function (b) {
      b.addEventListener('click', function () {
        var w = b.getAttribute('data-w');
        $$('.cms-editor__right [data-w]').forEach(function (x) { x.classList.toggle('cms-btn--on', x === b); });
        frame.className = 'cms-editor__frame' + (w === 'tablet' ? ' is-tablet' : w === 'mobile' ? ' is-mobile' : '');
      });
    });
    $$('.cms-tab').forEach(function (t) {
      t.addEventListener('click', function () {
        sideTab = t.getAttribute('data-tab');
        $$('.cms-tab').forEach(function (x) { x.classList.toggle('is-on', x === t); });
        renderSide();
      });
    });
    document.addEventListener('keydown', function (e) {
      if (!$('#cmsEditor')) return;
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      if (e.key === 'Escape' && !/INPUT|TEXTAREA|SELECT/.test(tag)) closeEditor();
    });
  }

  function openEditor(file, opts) {
    shellOnly = !!(opts && opts.shellOnly);
    ensureEditor();
    $('#cmsEditor').style.display = '';
    loadPage(file);
  }

  function closeEditor() {
    var wrap = $('#cmsEditor');
    if (!wrap) return;
    wrap.style.display = 'none';
    if (frame) frame.src = 'about:blank';
    cur = null;
    render();
  }

  function loadPage(file) {
    framePage = file;
    var meta = CM.PAGES.filter(function (p) { return p.file === file; })[0] || { name: file, ta: '' };
    $('#cmsPageName').textContent = meta.name + (shellOnly ? ' — Header & Footer' : '');
    $('#cmsPageFile').textContent = file + (meta.dynamic ? ' · live data' : '');
    cur = null;
    elList = [];
    renderSide();
    reloadFrame();
  }

  function reloadFrame() {
    if (!frame) return;
    frame.src = framePage + (framePage.indexOf('?') > -1 ? '&' : '?') + 'cms=edit&_t=' + Date.now();
  }

  function refreshAfterReapply(res) {
    if (res && res.sel) setSelection(res.sel);
    elList = [];
  }


  /* ============================================================== writes == */
  function selectByKey(key) {
    return send('select', { key: key }).then(function (info) {
      if (info) setSelection(info);
      else toast('That element is not on this page', 'warn');
      return info;
    });
  }

  function setNode(patch) {
    if (!cur || !cur.key) return;
    if (cur.ins) { setInsertField(patch); return; }
    var parts = splitKey(cur.key);
    var rec = doc.nodes[cur.key] || { scope: parts.scope, sel: parts.sel };
    var k;
    for (k in patch) {
      if (k === 'text' && rec.orig === undefined) rec.orig = cur.origText;
      if (k === 'src' && rec.srcOrig === undefined) rec.srcOrig = cur.src;
      if (k === 'href' && rec.hrefOrig === undefined) rec.hrefOrig = cur.href;
      if (k === 'icon' && rec.iconOrig === undefined) rec.iconOrig = cur.icon;
      if (k === 'alt' && rec.altOrig === undefined) rec.altOrig = cur.alt;
      rec[k] = patch[k];
    }
    doc.nodes[cur.key] = rec;
    persist();
    send('reapply');
    cur = merge(cur, patch);
    return rec;
  }

  function findInsert(id) {
    var scopes = Object.keys(doc.inserts || {}), i, j, list;
    for (i = 0; i < scopes.length; i++) {
      list = doc.inserts[scopes[i]] || [];
      for (j = 0; j < list.length; j++) {
        if (list[j].id === id) return { scope: scopes[i], rec: list[j], index: j, list: list };
      }
    }
    return null;
  }

  function setInsertField(patch) {
    var f = cur && cur.ins ? findInsert(cur.ins) : null;
    if (!f) { toast('Element no longer exists', 'warn'); return; }
    var k;
    for (k in patch) f.rec[k] = patch[k];
    cur = merge(cur, patch);
    persist();
    send('reapply');
  }

  function addInsert(type) {
    var defaults = {
      heading: { text: 'New heading', level: 3 },
      text: { text: 'Write your sentence here.' },
      button: { text: 'Shop Now', href: 'products.html', cls: 'btn btn--primary' },
      icon: { icon: 'leaf', cls: 'icard__ic' },
      image: { src: 'assets/img/scenes/farm.svg', alt: 'Shanmuga Organics' },
      spacer: { height: 32 }
    };
    send('addPlan').then(function (plan) {
      if (!plan) { toast('Open a page preview first', 'warn'); return; }
      var rec = merge({ id: CM.insId(), type: type, scope: plan.scope, parentSel: plan.parentSel, afterSel: plan.afterSel }, defaults[type] || {});
      snapshot();
      if (!doc.inserts[plan.scope]) doc.inserts[plan.scope] = [];
      doc.inserts[plan.scope].push(rec);
      persist();
      send('reapply').then(function () {
        selectByKey('#ins:' + rec.id).then(function () {
          toast(type.charAt(0).toUpperCase() + type.slice(1) + ' added — edit it on the right');
        });
      });
    });
  }

  function moveInsert(dir) {
    var f = cur && cur.ins ? findInsert(cur.ins) : null;
    if (!f) return;
    var to = f.index + (dir < 0 ? -1 : 1);
    if (to < 0 || to >= f.list.length) { toast('Already at the ' + (dir < 0 ? 'top' : 'bottom'), 'warn'); return; }
    f.list.splice(f.index, 1);
    f.list.splice(to, 0, f.rec);
    persist();
    send('reapply').then(function () { selectByKey('#ins:' + f.rec.id); });
  }

  function deleteInsert() {
    var f = cur && cur.ins ? findInsert(cur.ins) : null;
    if (!f) return;
    if (!confirm('Delete this added element?')) return;
    snapshot();
    f.list.splice(f.index, 1);
    if (!f.list.length) delete doc.inserts[f.scope];
    persist();
    cur = null;
    send('reapply').then(function () { renderSide(); });
    toast('Element deleted');
  }

  function resetElement() {
    if (!cur) return;
    if (cur.ins) { deleteInsert(); return; }
    if (!doc.nodes[cur.key]) { toast('This element has no changes to reset', 'warn'); return; }
    var key = cur.key;
    snapshot();
    delete doc.nodes[key];
    persist();
    send('reapply').then(function () {
      selectByKey(key).then(function (info) {
        if (!info) setSelection(null);
        toast('Element reset to the original design');
      });
    });
  }

  /* ============================================================ inspector = */
  function values() {
    var rec = cur && cur.ins ? (findInsert(cur.ins) || {}).rec : null;
    if (rec) {
      return {
        rec: rec,
        text: rec.text !== undefined ? rec.text : '',
        href: rec.href || '',
        src: rec.src || '',
        alt: rec.alt || '',
        icon: rec.icon || '',
        level: rec.level || 3,
        cls: rec.cls || '',
        height: rec.height || 0,
        hidden: false
      };
    }
    return {
      rec: doc.nodes[cur.key] || null,
      text: cur.text,
      href: cur.href,
      src: cur.src,
      alt: cur.alt,
      icon: cur.icon,
      level: 3, cls: '', height: 0,
      hidden: !!cur.hidden
    };
  }

  function fRow(id, val, label, ph, note) {
    return '<div class="cms-field"><label>' + label + '</label>' +
      '<input class="cms-input" data-f="' + id + '" value="' + esc(val) + '" placeholder="' + esc(ph || '') + '">' +
      (note ? '<div class="cms-note">' + note + '</div>' : '') + '</div>';
  }

  function fText(val, label, note) {
    return '<div class="cms-field"><label>' + label + '</label>' +
      '<textarea class="cms-textarea" data-f="text">' + esc(val) + '</textarea>' +
      (note ? '<div class="cms-note">' + note + '</div>' : '') + '</div>';
  }

  function fIconGrid(current, withSearch) {
    var h = '<div class="cms-field"><label>Icon <em>' + esc(current || 'none') + '</em></label>';
    if (withSearch) h += '<input class="cms-input" id="cmsIconSearch" placeholder="Search icons…" style="margin-bottom:7px">';
    h += '<div class="cms-icon-grid" id="cmsIconGrid">' + ICONS.map(function (i) {
      return '<button class="cms-icon-btn' + (i.name === current ? ' is-on' : '') + '" data-icon-pick="' + i.name + '" title="' + i.name + '">' +
        (i.svg || '<span style="font-size:10px">' + esc(i.name) + '</span>') + '</button>';
    }).join('') + '</div></div>';
    return h;
  }

  function fImageTools(preview) {
    return (preview ? '<img class="cms-preview" src="' + esc(preview) + '" alt="">' : '') +
      '<div class="cms-btnrow" style="margin-bottom:8px">' +
      '<button class="cms-mini cms-mini--primary" data-img-choose="1">🖼️ Choose image</button>' +
      '<button class="cms-mini" data-img-upload="1">⬆️ Upload</button>' +
      '<button class="cms-mini cms-mini--danger" data-img-clear="1">✕ Remove</button>' +
      '</div>';
  }

  function wireLive(input, fn) {
    var t = null;
    function run() { fn(input.value); }
    input.addEventListener('input', function () { clearTimeout(t); t = setTimeout(run, 420); });
    input.addEventListener('change', function () { clearTimeout(t); run(); });
    input.addEventListener('blur', function () { clearTimeout(t); run(); });
  }

  function insertFields() {
    var v = values(), t = cur.insType || (v.rec && v.rec.type) || 'text', h = '';
    h += '<div class="cms-sec"><div class="cms-sec__title">➕ Added element <em>' + esc(t) + '</em></div>';
    if (t === 'heading' || t === 'text' || t === 'button') {
      h += fText(v.text, 'Text', t === 'text' ? 'Tip: keep sentences short for mobile.' : '');
    }
    if (t === 'button') {
      h += fRow('href', v.href, 'Link (click goes to)', 'products.html',
        'Examples: <code>products.html</code>, <code>products.html?cat=traditional-rice</code>, <code>contact.html</code>, <code>https://wa.me/916380040001</code>');
      h += '<div class="cms-field"><label>Button style</label><select class="cms-select" data-f="cls">' +
        CM.BUTTON_STYLES.map(function (b) {
          return '<option value="' + esc(b.id) + '"' + (v.cls === b.id ? ' selected' : '') + '>' + esc(b.label) + '</option>';
        }).join('') + '</select></div>';
      h += fIconGrid(v.icon, true);
    }
    if (t === 'icon') h += fIconGrid(v.icon, true);
    if (t === 'image') {
      h += fImageTools(v.src);
      h += fRow('src', v.src, 'Image path / URL', 'assets/img/scenes/farm.svg');
      h += fRow('alt', v.alt, 'Alt text (SEO + screen readers)', 'Fresh millets at the farm');
      h += '<div class="cms-field"><label>Height (px) <em>0 = natural</em></label>' +
        '<input class="cms-input" type="number" min="0" max="900" data-f="height" value="' + esc(v.height || 0) + '"></div>';
    }
    if (t === 'spacer') {
      h += '<div class="cms-field"><label>Space height (px)</label>' +
        '<input class="cms-input" type="number" min="8" max="300" data-f="height" value="' + esc(v.height || 32) + '"></div>';
    }
    if (t === 'heading') {
      h += '<div class="cms-field"><label>Heading size</label><select class="cms-select" data-f="level">' +
        [1, 2, 3, 4, 5, 6].map(function (n) {
          return '<option value="' + n + '"' + (String(v.level) === String(n) ? ' selected' : '') + '>H' + n + '</option>';
        }).join('') + '</select></div>';
    }
    h += '</div>';
    return h;
  }

  function nodeFields() {
    var v = values(), h = '';
    if (cur.can.text) {
      h += '<div class="cms-sec"><div class="cms-sec__title">✏️ Text <em>' + (cur.isTamil ? 'Tamil' : 'English') + '</em></div>' +
        fText(v.text, 'Edit the words', 'Empty the box and the original text comes back.') + '</div>';
    }
    if (cur.can.href) {
      h += '<div class="cms-sec"><div class="cms-sec__title">🔗 Link</div>' + fRow('href', v.href, 'Opens', 'products.html') + '</div>';
    }
    if (cur.can.image) {
      h += '<div class="cms-sec"><div class="cms-sec__title">🖼️ Image</div>' + fImageTools(v.src) +
        fRow('src', v.src, 'Image path / URL') + fRow('alt', v.alt, 'Alt text') + '</div>';
    }
    if (cur.can.icon) {
      h += '<div class="cms-sec"><div class="cms-sec__title">★ Icon</div>' + fIconGrid(v.icon, true) + '</div>';
    }
    if (cur.can.bg) {
      h += '<div class="cms-sec"><div class="cms-sec__title">🎨 Background image</div>' +
        (v.rec && v.rec.bg ? '<img class="cms-preview" src="' + esc(v.rec.bg) + '" alt="">' : '') +
        '<div class="cms-btnrow" style="margin-bottom:8px"><button class="cms-mini cms-mini--primary" data-bg-choose="1">Choose background</button>' +
        '<button class="cms-mini cms-mini--danger" data-bg-clear="1">✕ No background</button></div>' +
        '<div class="cms-note">Works well on <code>section</code> blocks and cards.</div></div>';
    }
    h += '<div class="cms-sec"><div class="cms-sec__title">👁️ Visibility</div>' +
      '<label class="cms-switch"><input type="checkbox" data-f="hidden"' + (v.hidden ? ' checked' : '') + '> ' +
      'Hide this element on the live site</label></div>';
    return h;
  }

  function addToolsHtml() {
    return '<div class="cms-sec"><div class="cms-sec__title">➕ Add element</div>' +
      '<div class="cms-btnrow">' +
      '<button class="cms-mini cms-mini--primary" data-add="heading">Heading</button>' +
      '<button class="cms-mini" data-add="text">Text</button>' +
      '<button class="cms-mini" data-add="button">🔘 Button</button>' +
      '<button class="cms-mini" data-add="icon">★ Icon</button>' +
      '<button class="cms-mini" data-add="image">🖼️ Image</button>' +
      '<button class="cms-mini" data-add="spacer">↕ Space</button>' +
      '</div>' +
      '<div class="cms-note">Added into the selected section' + (cur ? '' : ' (or the end of the page)') + '.</div>' +
      (cur && cur.ins ? '<div class="cms-btnrow" style="margin-top:8px">' +
        '<button class="cms-mini" data-ins-move="-1">⬆ Move up</button>' +
        '<button class="cms-mini" data-ins-move="1">⬇ Move down</button>' +
        '<button class="cms-mini cms-mini--danger" data-ins-del="1">🗑 Delete element</button></div>' : '') +
      '</div>';
  }



  function renderSide() {
    var host = $('#cmsSideScroll'), foot = $('#cmsSideFoot');
    if (!host || !foot) return;
    if (sideTab === 'list') { renderList(); return; }
    if (!cur) {
      host.innerHTML =
        '<div class="cms-banner cms-banner--info"><span>👆</span><div>Click any <b>text, heading, button, icon or image</b> ' +
        'inside the page preview to edit it here.</div></div>' +
        '<div class="cms-note">Nothing selected yet. The <b>All items</b> tab lists every editable line on this page — ' +
        'handy for tiny icons and overlapping items.</div>';
      foot.innerHTML = addToolsHtml();
      bindSide();
      return;
    }
    if (cur.ins) {
      var f = findInsert(cur.ins);
      cur.insType = (f && f.rec && f.rec.type) || 'text';
    }
    var scopeLabel = cur.scope.indexOf('shell:') === 0 ? 'ALL PAGES' : cur.scope;
    var h = '<div class="cms-target">' +
      '<code>' + esc(cur.tag + (cur.cls ? '.' + cur.cls.split(/\s+/).slice(0, 2).join('.') : '')) + '</code>' +
      '<span class="cms-chip cms-chip--info">' + esc(scopeLabel) + '</span>' +
      ((cur.hasOverride || cur.ins) ? '<span class="cms-chip cms-chip--on">edited</span>' : '') +
      (cur.hidden ? '<span class="cms-chip cms-chip--warn">hidden</span>' : '') +
      '<div class="cms-target__path">' + esc(cur.where) + '</div></div>';
    h += cur.ins ? insertFields() : nodeFields();
    host.innerHTML = h;
    foot.innerHTML = '<div class="cms-btnrow" style="width:100%">' +
      (cur.ins ? '' : '<button class="cms-mini cms-mini--danger" data-reset-el="1">↺ Reset element</button>') +
      '<button class="cms-mini" data-clear-sel="1">✕ Deselect</button></div>' + addToolsHtml();
    bindSide();
  }

  function setField(name, value) {
    if (!cur) return;
    var patch = {};
    patch[name] = value;
    if (cur.ins) setInsertField(patch); else setNode(patch);
    if (name !== 'text' && name !== 'href') {
      setTimeout(function () { if (sideTab === 'edit') renderSide(); }, 320);
    }
  }

  function bindSide() {
    var host = $('#cmsSideScroll'), foot = $('#cmsSideFoot');

    $$('[data-f]', host).forEach(function (el) {
      var f = el.getAttribute('data-f');
      if (el.tagName === 'SELECT') {
        el.addEventListener('change', function () {
          setField(f, (f === 'level' || f === 'height') ? (parseInt(el.value, 10) || 0) : el.value);
        });
      } else if (el.type === 'checkbox') {
        el.addEventListener('change', function () { setField(f, el.checked); });
      } else if (el.type === 'number') {
        wireLive(el, function (v) { setField(f, parseInt(v, 10) || 0); });
      } else {
        wireLive(el, function (v) { setField(f, v); });
      }
    });

    var search = $('#cmsIconSearch');
    if (search) search.addEventListener('input', function () {
      var q = search.value.toLowerCase();
      $$('#cmsIconGrid .cms-icon-btn').forEach(function (b) {
        b.style.display = b.getAttribute('data-icon-pick').indexOf(q) > -1 ? '' : 'none';
      });
    });

    $$('[data-icon-pick]', host).forEach(function (b) {
      b.addEventListener('click', function () {
        var name = b.getAttribute('data-icon-pick');
        $$('#cmsIconGrid .cms-icon-btn').forEach(function (x) { x.classList.toggle('is-on', x === b); });
        setField('icon', name);
      });
    });

    $$('[data-img-choose]', host).forEach(function (b) {
      b.addEventListener('click', function () { openImagePicker(function (path) { setField('src', path); }); });
    });
    $$('[data-bg-choose]', host).forEach(function (b) {
      b.addEventListener('click', function () { openImagePicker(function (path) { setField('bg', path); }); });
    });
    $$('[data-img-upload]', host).forEach(function (b) {
      b.addEventListener('click', function () { uploadImage(function (dataUrl) { setField('src', dataUrl); }); });
    });
    $$('[data-img-clear]', host).forEach(function (b) {
      b.addEventListener('click', function () { setField('src', ''); });
    });
    $$('[data-bg-clear]', host).forEach(function (b) {
      b.addEventListener('click', function () { setField('bg', ''); });
    });
    $$('[data-reset-el]', host).forEach(function (b) {
      b.addEventListener('click', resetElement);
    });
    $$('[data-clear-sel]', host).forEach(function (b) {
      b.addEventListener('click', function () { setSelection(null); send('clear'); });
    });

    $$('[data-add]', foot).forEach(function (b) {
      b.addEventListener('click', function () { addInsert(b.getAttribute('data-add')); });
    });
    $$('[data-ins-move]', foot).forEach(function (b) {
      b.addEventListener('click', function () { moveInsert(parseInt(b.getAttribute('data-ins-move'), 10)); });
    });
    $$('[data-ins-del]', foot).forEach(function (b) {
      b.addEventListener('click', deleteInsert);
    });
  }

  /* ======================================================== items browser == */
  function renderList() {
    var host = $('#cmsSideScroll'), foot = $('#cmsSideFoot');
    host.innerHTML =
      '<div class="cms-field"><label>Search items on this page</label>' +
      '<input class="cms-input" id="cmsListSearch" value="' + esc(listFilter) + '" placeholder="Featured, About us, footer…"></div>' +
      '<div id="cmsListHost"><div class="cms-note">Loading page items…</div></div>';
    foot.innerHTML = '<button class="cms-mini" data-reload-list="1">🔄 Reload items</button>';
    var search = $('#cmsListSearch');
    search.addEventListener('input', function () { listFilter = search.value; drawList(); });
    var rb = $('[data-reload-list]', foot);
    if (rb) rb.addEventListener('click', function () {
      elList = [];
      host.innerHTML = '<div class="cms-note">Reloading…</div>';
      renderList();
    });
    if (elList.length) drawList();
    else send('list').then(function (items) {
      elList = items || [];
      drawList();
    });
  }

  function drawList() {
    var host = $('#cmsListHost');
    if (!host) return;
    var q = (listFilter || '').toLowerCase();
    var items = elList.filter(function (i) {
      if (shellOnly && i.scope.indexOf('shell:') !== 0) return false;
      if (!q) return true;
      return ((i.text || '') + ' ' + i.tag + ' ' + (i.cls || '') + ' ' + i.scope).toLowerCase().indexOf(q) > -1;
    });
    var groups = {}, order = [];
    items.forEach(function (i) {
      var g = i.scope.indexOf('shell:') === 0
        ? (i.scope === 'shell:header' ? 'Header — on every page' : 'Footer — on every page')
        : 'This page — ' + i.scope;
      if (!groups[g]) { groups[g] = []; order.push(g); }
      groups[g].push(i);
    });
    var html = '';
    order.forEach(function (g) {
      html += '<div class="cms-list__scope">' + esc(g) + ' · ' + groups[g].length + '</div><div class="cms-list">' +
        groups[g].slice(0, 500).map(function (i) {
          return '<button class="cms-list-item' + (cur && cur.key === i.key ? ' is-on' : '') + '" data-key="' + esc(i.key) + '">' +
            '<b>' + esc(i.type) + '</b>' +
            '<span>' + esc((i.text || i.src || i.icon || i.tag).slice(0, 70)) + '</span>' +
            '<em>' + esc(i.tag) + '</em></button>';
        }).join('') + '</div>';
    });
    host.innerHTML = html || '<div class="cms-note">No editable items match your search.</div>';
    $$('[data-key]', host).forEach(function (b) {
      b.addEventListener('click', function () {
        var key = b.getAttribute('data-key');
        if (shellOnly && key.indexOf('shell:') !== 0) return;
        selectByKey(key).then(function () { drawList(); });
      });
    });
  }


  /* ========================================================= image tools == */
  function loadImages() {
    if (IMAGES) return Promise.resolve(IMAGES);
    return fetch('assets/img/images.json')
      .then(function (r) { return r.json(); })
      .then(function (j) { IMAGES = (j && j.images) || []; return IMAGES; })
      .catch(function () { IMAGES = []; return IMAGES; });
  }

  function openImagePicker(cb) {
    loadImages().then(function (list) {
      var wrap = document.createElement('div');
      wrap.className = 'cms-imgmodal';
      wrap.innerHTML =
        '<div class="cms-imgmodal__box">' +
        '<div class="cms-imgmodal__head"><h3>Choose an image (' + list.length + ' available)</h3>' +
        '<div class="cms-row"><input class="cms-input" id="cmsImgSearch" placeholder="Search logo, hero, rice…" style="width:200px">' +
        '<button class="cms-mini" data-close="1">✕ Close</button></div></div>' +
        '<div class="cms-imgmodal__body"><div class="cms-imggrid">' +
        (list.length ? list.map(function (p) {
          return '<button class="cms-imgcard" data-pick="' + esc(p) + '" title="' + esc(p) + '">' +
            '<img src="' + esc(p) + '" alt="" loading="lazy"><span>' + esc(p.split('/').pop()) + '</span></button>';
        }).join('') : '<div class="cms-note">No image list found (assets/img/images.json).</div>') +
        '</div></div></div>';
      document.body.appendChild(wrap);
      function close() { wrap.remove(); }
      wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
      var closeBtn = $('[data-close]', wrap);
      if (closeBtn) closeBtn.addEventListener('click', close);
      $$('[data-pick]', wrap).forEach(function (b) {
        b.addEventListener('click', function () {
          cb(b.getAttribute('data-pick'));
          close();
        });
      });
      var s = $('#cmsImgSearch', wrap);
      if (s) s.addEventListener('input', function () {
        var q = s.value.toLowerCase();
        $$('[data-pick]', wrap).forEach(function (b) {
          b.style.display = b.getAttribute('data-pick').toLowerCase().indexOf(q) > -1 ? '' : 'none';
        });
      });
    });
  }

  function uploadImage(cb) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', function () {
      var f = input.files && input.files[0];
      if (!f) return;
      if (!/^image\//.test(f.type)) { toast('Please pick an image file', 'error'); return; }
      if (f.size > 6 * 1024 * 1024) { toast('Image must be under 6 MB', 'error'); return; }
      var reader = new FileReader();
      reader.onload = function () {
        var dataUrl = String(reader.result || '');
        /* small PNG/SVG uploads keep their transparency and quality */
        if (dataUrl.length < 220000 && !/^data:image\/jpe?g/.test(dataUrl)) { cb(dataUrl); return; }
        var img = new Image();
        img.onload = function () {
          var scale = Math.min(1, 1200 / img.width);
          var w = Math.max(1, Math.round(img.width * scale));
          var h = Math.max(1, Math.round(img.height * scale));
          var c = document.createElement('canvas');
          c.width = w; c.height = h;
          var ctx = c.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          var q = 0.86, out = c.toDataURL('image/jpeg', q);
          while (out.length > 320000 && q > 0.4) { q -= 0.1; out = c.toDataURL('image/jpeg', q); }
          cb(out);
          toast('Uploaded image added (' + kb(out.length) + ')');
        };
        img.onerror = function () { toast('That image could not be read', 'error'); };
        img.src = dataUrl;
      };
      reader.readAsDataURL(f);
    });
    input.click();
  }

  /* ================================================================ api === */
  window.AdminContent = {
    render: render,
    openEditor: openEditor,
    closeEditor: closeEditor,
    store: function () { return CM.load(); }
  };
})();

