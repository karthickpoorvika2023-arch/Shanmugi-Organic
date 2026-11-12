(function () {
  'use strict';

  /* Lightweight shell loader for the standalone auth pages
     (signin / signup / forgot-password / reset-password / verify-email).
     These pages don't run the full page scripts, but they do keep
     <div data-shell="header"> / <div data-shell="footer"> placeholders,
     so load data.js + app.js (which need window.SITE) and mount them. */

  function loadScript(src, cb) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = cb;
    s.onerror = function () { console.error('shell.js: failed to load ' + src); };
    document.head.appendChild(s);
  }

  function boot() {
    if (window.App && typeof window.App.init === 'function') {
      window.App.init(); /* no active nav key on auth pages */
    } else {
      setTimeout(boot, 50);
    }
  }

  function next(i) {
    var files = ['assets/js/data.js', 'assets/js/app.js'];
    if (i >= files.length) { boot(); return; }
    loadScript(files[i], function () { next(i + 1); });
  }

  next(0);
})();
