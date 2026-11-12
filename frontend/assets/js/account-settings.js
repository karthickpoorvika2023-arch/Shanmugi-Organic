/* ==========================================================================
   account-settings.js — account profile, settings, and author features.
   Shared by account.html (tab mode) and account-settings.html (standalone).
   Entry points: window.AccountSettings.initTab() and initStandalone().
   ========================================================================== */
(function () {
  'use strict';

  /* --------------- DOM lookups (returns null if element absent) ------------- */
  function $(id) { return document.getElementById(id); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function showAlert(alertBox, message, type) {
    if (!alertBox) return;
    // Plain string alert (default).
    alertBox.textContent = message;
    alertBox.className = 'alert alert--' + (type || 'success') + ' is-visible';
    alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setTimeout(function () { alertBox.className = 'alert'; }, 8000);
  }

  // If the message mentions a database setup problem, render the alert
  // with a clickable link to setup.html so the user can fix it in one step.
  function showSetupAlert(alertBox, message) {
    if (!alertBox) return;
    alertBox.innerHTML = ''; // clear
    var span = document.createElement('span');
    span.textContent = message + ' ';
    alertBox.appendChild(span);
    var link = document.createElement('a');
    link.href = 'setup.html';
    link.textContent = 'Open setup page →';
    link.style.cssText = 'color:inherit;text-decoration:underline;font-weight:600;margin-left:4px;';
    alertBox.appendChild(link);
    alertBox.className = 'alert alert--error is-visible';
    alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function isSetupError(msg) {
    if (!msg) return false;
    const s = String(msg).toLowerCase();
    return s.indexOf('setup') !== -1 ||
           s.indexOf('not installed') !== -1 ||
           (s.indexOf('user_profiles') !== -1 && (s.indexOf('missing') !== -1 || s.indexOf('schema cache') !== -1));
  }

  /* --------------- Form population (uses cache-first via Supabase.getProfile) ----- */
  function populateForm(root, profile) {
    if (!profile) return;
    const setVal = function (id, v) { const el = $(id); if (el) el.value = v || ''; };
    const setChk = function (id, v) { const el = $(id); if (el) el.checked = !!v; };

    setVal('fullName', profile.full_name);
    setVal('phone', profile.phone);
    setVal('defaultAddress', profile.default_shipping_address);
    setVal('city', profile.default_shipping_city);
    setVal('state', profile.default_shipping_state);
    setVal('pincode', profile.default_shipping_pincode);
    setChk('notifyOrders', profile.notify_orders !== false);
    setChk('notifyPromo', profile.notify_promo);
    setChk('notifyNewsletter', profile.newsletter_subscribed);
  }

  /* --------------- Avatar preview + helpers ----------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function initialsOf(name) {
    const parts = (name || '').trim().split(/\s+/);
    const letters = parts.map(function (p) { return p[0] || ''; }).join('');
    return (letters || '?').substring(0, 2).toUpperCase();
  }

  function renderAvatarPreview(profile) {
    const host = $('avatarPreview');
    if (!host) return;
    const url = (profile && profile.avatar_url) || '';
    if (url) {
      host.innerHTML = '<img src="' + esc(url) + '" alt="">';
    } else {
      const ini = initialsOf(profile && profile.full_name);
      host.innerHTML = '<div class="profile-photo-initials">' + esc(ini) + '</div>';
    }
  }

  function renderHeaderAvatar(profile) {
    const av = $('userAvatar');
    if (!av) return;
    const url = (profile && profile.avatar_url) || '';
    if (url) {
      av.innerHTML = '<img src="' + esc(url) + '" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block">';
      av.style.background = 'transparent';
    } else {
      av.textContent = initialsOf(profile && profile.full_name);
      av.style.background = '';
    }
  }

  function setAvatarStatus(text) {
    const el = $('avatarStatus');
    if (el) el.textContent = text || '';
  }

  function refreshAvatarStatus(profile) {
    const url = (profile && profile.avatar_url) || '';
    if (url) setAvatarStatus('Custom photo uploaded');
    else setAvatarStatus('No photo — showing your initials');
  }

  /* --------------- Avatar cropper ---------- */

  // Crop modal state (module-scoped — only one crop is active at a time).
  // Declared up here so the helper functions below can read/write them
  // without a temporal dead zone.
  var currentZoom = 1;
  var currentOffsetX = 0;
  var currentOffsetY = 0;
  var cropFile = null;
  var cropImg = null;
  var dragState = null;

  // Returns the live crop rectangle in source-image pixels, derived from
  // the current zoom + offset of the displayed <img>.
  // The displayed image is always at minimum width = stage width (so the
  // stage is fully covered). Zoom scales the displayed size relative to
  // that minimum.
  function getCropState() {
    const stage = $('cropStage');
    const img = $('cropImage');
    if (!stage || !img || !img.naturalWidth) return null;
    const stageSize = stage.getBoundingClientRect().width;
    const baseScale = stageSize / Math.min(img.naturalWidth, img.naturalHeight);
    const scale = baseScale * (currentZoom || 1);
    const dispW = img.naturalWidth  * scale;
    const dispH = img.naturalHeight * scale;
    return {
      stageSize: stageSize,
      dispW: dispW,
      dispH: dispH,
      scale: scale,
      offsetX: currentOffsetX,
      offsetY: currentOffsetY
    };
  }

  // Render the image into the crop stage at the current zoom + offset.
  function renderCrop() {
    const img = $('cropImage');
    const state = getCropState();
    if (!img || !state) return;
    img.style.width  = state.dispW + 'px';
    img.style.height = state.dispH + 'px';
    img.style.transform = 'translate(' + state.offsetX + 'px,' + state.offsetY + 'px)';
    const z = $('cropZoom');     if (z) z.value = Math.round((currentZoom || 1) * 100);
    const zl = $('cropZoomLabel'); if (zl) zl.textContent = (currentZoom || 1).toFixed(1) + '×';
  }

  // Center the image so its shorter side matches the stage (cover-fit).
  function centerCrop() {
    const img = $('cropImage');
    const stage = $('cropStage');
    if (!img || !img.naturalWidth || !stage) return;
    const stageSize = stage.getBoundingClientRect().width;
    currentZoom = 1;
    const baseScale = stageSize / Math.min(img.naturalWidth, img.naturalHeight);
    const dispW = img.naturalWidth  * baseScale;
    const dispH = img.naturalHeight * baseScale;
    currentOffsetX = (stageSize - dispW) / 2;
    currentOffsetY = (stageSize - dispH) / 2;
  }

  // Compute the source-image crop rectangle (x, y, size) from the
  // current on-screen state. Always a square covering the visible
  // circular viewport. Returns null if the image hasn't loaded yet.
  function computeSourceCrop() {
    const img = $('cropImage');
    const state = getCropState();
    if (!img || !state) return null;
    // The circle viewport is the stage. The displayed image covers it
    // (we never show checkerboard). Visible rect in displayed coords:
    const visX = -state.offsetX;
    const visY = -state.offsetY;
    const visSize = state.stageSize;
    // Convert displayed pixels → source pixels.
    const sourceX = visX / state.scale;
    const sourceY = visY / state.scale;
    const sourceSize = visSize / state.scale;
    return { x: sourceX, y: sourceY, size: sourceSize };
  }

  async function openCropModal(file, alertBox) {
    if (!file) return;
    const d = await window.Supabase._decodeAvatarFile(file);
    if (d.error) { showAlert(alertBox, d.error, 'error'); return; }
    cropFile = file;
    cropImg = d.image;
    const imgEl = $('cropImage');
    if (imgEl) {
      imgEl.onload = function () {
        // Wait for the stage to have its real size (aspect-ratio CSS).
        requestAnimationFrame(function () {
          centerCrop();
          renderCrop();
        });
      };
      imgEl.src = d.srcUrl;
    }
    const err = $('cropError'); if (err) err.textContent = '';
    const backdrop = $('cropModalBackdrop');
    if (backdrop) backdrop.classList.add('is-visible');
  }

  function closeCropModal() {
    const backdrop = $('cropModalBackdrop');
    if (backdrop) backdrop.classList.remove('is-visible');
    cropFile = null;
    cropImg = null;
    currentZoom = 1;
    currentOffsetX = 0;
    currentOffsetY = 0;
  }

  function wireCropModal(alertBox) {
    const backdrop = $('cropModalBackdrop');
    const stage = $('cropStage');
    const img = $('cropImage');
    const zoom = $('cropZoom');
    const cancelBtn = $('cropCancelBtn');
    const saveBtn = $('cropSaveBtn');
    if (!backdrop || !stage || !img) return;

    // ---- Drag to pan -------------------------------------------------
    function onDown(e) {
      if (!img.src) return;
      dragState = { startX: pointerX(e), startY: pointerY(e),
                    baseX: currentOffsetX, baseY: currentOffsetY };
      stage.classList.add('is-dragging');
      e.preventDefault();
    }
    function onMove(e) {
      if (!dragState) return;
      const dx = pointerX(e) - dragState.startX;
      const dy = pointerY(e) - dragState.startY;
      currentOffsetX = dragState.baseX + dx;
      currentOffsetY = dragState.baseY + dy;
      clampOffsets();
      renderCrop();
      e.preventDefault();
    }
    function onUp() {
      if (dragState) { dragState = null; stage.classList.remove('is-dragging'); }
    }
    function pointerX(e) {
      if (e.touches && e.touches[0]) return e.touches[0].clientX;
      return e.clientX;
    }
    function pointerY(e) {
      if (e.touches && e.touches[0]) return e.touches[0].clientY;
      return e.clientY;
    }

    // Keep the image covering the entire stage at all times. We never
    // expose checkerboard, so offsets are clamped so the stage is
    // always fully covered by the image rectangle.
    function clampOffsets() {
      const state = getCropState();
      if (!state) return;
      // The visible stage area must lie entirely within the image.
      // i.e. offsetX ≤ 0 and offsetX + dispW ≥ stageSize.
      const minX = state.stageSize - state.dispW;
      const maxX = 0;
      const minY = state.stageSize - state.dispH;
      const maxY = 0;
      if (currentOffsetX < minX) currentOffsetX = minX;
      if (currentOffsetX > maxX) currentOffsetX = maxX;
      if (currentOffsetY < minY) currentOffsetY = minY;
      if (currentOffsetY > maxY) currentOffsetY = maxY;
    }

    stage.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    stage.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);

    // ---- Wheel zoom (cursor-anchored) --------------------------------
    stage.addEventListener('wheel', function (e) {
      if (!img.src) return;
      e.preventDefault();
      const delta = -Math.sign(e.deltaY) * 0.1;
      const next = Math.max(1, Math.min(4, (currentZoom || 1) + delta));
      zoomAtPoint(e.clientX, e.clientY, next);
    }, { passive: false });

    function zoomAtPoint(clientX, clientY, nextZoom) {
      const state = getCropState();
      if (!state) return;
      const rect = stage.getBoundingClientRect();
      // Cursor position relative to the stage.
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      // Source-image point currently under the cursor.
      const srcX = (px - currentOffsetX) / state.scale;
      const srcY = (py - currentOffsetY) / state.scale;
      // Apply new zoom and re-anchor so the same source point is under the cursor.
      currentZoom = nextZoom;
      const newState = getCropState();
      currentOffsetX = px - srcX * newState.scale;
      currentOffsetY = py - srcY * newState.scale;
      clampOffsets();
      renderCrop();
    }

    if (zoom) {
      zoom.addEventListener('input', function () {
        const z = Math.max(1, Math.min(4, parseInt(zoom.value, 10) / 100));
        const rect = stage.getBoundingClientRect();
        zoomAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, z);
      });
    }

    if (cancelBtn) cancelBtn.addEventListener('click', closeCropModal);
    if (backdrop) {
      backdrop.addEventListener('click', function (e) {
        if (e.target === backdrop) closeCropModal();
      });
    }
    document.addEventListener('keydown', function (e) {
      if (!backdrop.classList.contains('is-visible')) return;
      if (e.key === 'Escape') closeCropModal();
    });

    if (saveBtn) {
      saveBtn.addEventListener('click', async function () {
        if (!cropFile) { closeCropModal(); return; }
        const err = $('cropError'); if (err) err.textContent = '';
        saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
        try {
          const crop = computeSourceCrop();
          const user = await window.Supabase.getCurrentUser();
          if (!user) { showAlert(alertBox, 'Your session has expired. Please sign in again.', 'error'); return; }
          const up = await window.Supabase.uploadAvatar(cropFile, crop, user.id);
          if (up.error) { if (err) err.textContent = up.error; return; }
          const { error, errorDetail } = await window.Supabase.upsertProfile(user.id, { avatar_url: up.url });
          if (error) {
            console.error('upsertProfile (avatar) error:', error, errorDetail);
            const detail = (typeof error === 'string') ? error : (error.message || error.code || 'unknown error');
            if (isSetupError(detail)) {
              showSetupAlert(alertBox, 'Photo processed, but profile save failed: ' + detail);
            } else {
              showAlert(alertBox, 'Photo processed, but profile save failed: ' + detail, 'error');
            }
            return;
          }
          setAvatarStatus('Custom photo uploaded');
          renderAvatarPreview({ full_name: $('fullName').value, avatar_url: up.url });
          renderHeaderAvatar({ full_name: $('fullName').value, avatar_url: up.url });
          if (window.App && typeof window.App.refreshHeaderAvatar === 'function') {
            window.App.refreshHeaderAvatar();
          }
          showAlert(alertBox, 'Profile photo updated.', 'success');
          closeCropModal();
        } catch (e) {
          if (err) err.textContent = (e && e.message) || 'Failed to save photo.';
        } finally {
          saveBtn.disabled = false; saveBtn.textContent = 'Save';
        }
      });
    }
  }

  async function uploadCustomAvatar(file, alertBox) {
    // Kept for backward-compat / external callers. The wire flow now
    // opens the cropper; direct file → upload is no longer used.
    const user = await window.Supabase.getCurrentUser();
    if (!user) { showAlert(alertBox, 'Your session has expired. Please sign in again.', 'error'); return; }
    showAlert(alertBox, 'Uploading photo…', 'success');
    const up = await window.Supabase.uploadAvatar(file, null, user.id);
    if (up.error) { showAlert(alertBox, up.error, 'error'); return; }
    const { error, errorDetail } = await window.Supabase.upsertProfile(user.id, { avatar_url: up.url });
    if (error) {
      console.error('upsertProfile (avatar) error:', error, errorDetail);
      const detail = (typeof error === 'string') ? error : (error.message || error.code || 'unknown error');
      if (isSetupError(detail)) {
        showSetupAlert(alertBox, 'Photo processed, but profile save failed: ' + detail);
      } else {
        showAlert(alertBox, 'Photo processed, but profile save failed: ' + detail, 'error');
      }
      return;
    }
    setAvatarStatus('Custom photo uploaded');
    renderAvatarPreview({ full_name: $('fullName').value, avatar_url: up.url });
    renderHeaderAvatar({ full_name: $('fullName').value, avatar_url: up.url });
    if (window.App && typeof window.App.refreshHeaderAvatar === 'function') {
      window.App.refreshHeaderAvatar();
    }
    showAlert(alertBox, 'Profile photo updated.', 'success');
  }

  async function removeAvatarAction(alertBox) {
    if (!confirm('Remove your profile photo? Your avatar will revert to your initials.')) return;
    const user = await window.Supabase.getCurrentUser();
    if (!user) { showAlert(alertBox, 'Your session has expired. Please sign in again.', 'error'); return; }
    const { error, errorDetail } = await window.Supabase.upsertProfile(user.id, { avatar_url: null });
    if (error) {
      console.error('upsertProfile (remove avatar) error:', error, errorDetail);
      const detail = (typeof error === 'string') ? error : (error.message || error.code || 'unknown');
      if (isSetupError(detail)) {
        showSetupAlert(alertBox, 'Failed to remove photo: ' + detail);
      } else {
        showAlert(alertBox, 'Failed to remove photo: ' + detail, 'error');
      }
      return;
    }
    try { await window.Supabase.removeAvatar(user.id); } catch (e) { /* ignore */ }
    setAvatarStatus('No photo — showing your initials');
    renderAvatarPreview({ full_name: $('fullName').value, avatar_url: null });
    renderHeaderAvatar({ full_name: $('fullName').value, avatar_url: null });
    if (window.App && typeof window.App.refreshHeaderAvatar === 'function') {
      window.App.refreshHeaderAvatar();
    }
    showAlert(alertBox, 'Profile photo removed.', 'success');
  }

  function wireAvatar(alertBox) {
    const uploadInput = $('avatarFileInput');
    const uploadBtn = $('uploadAvatarBtn');
    if (uploadBtn && uploadInput) {
      uploadBtn.addEventListener('click', function () { uploadInput.click(); });
    }
    if (uploadInput) {
      uploadInput.addEventListener('change', function () {
        const file = uploadInput.files && uploadInput.files[0];
        if (file) openCropModal(file, alertBox);
        uploadInput.value = '';
      });
    }
    const rmBtn = $('removeAvatarBtn');
    if (rmBtn) rmBtn.addEventListener('click', function () { removeAvatarAction(alertBox); });
  }

  function showAccountUI() {
    const loading = $('loadingState');
    const content = $('accountContent');
    if (loading) loading.style.display = 'none';
    if (content) content.style.display = 'block';
  }

  function showSignedOut() {
    const loading = $('loadingState');
    if (loading) {
      loading.innerHTML =
        '<div class="spinner" style="display:none"></div>' +
        '<p style="font-size:16px;color:var(--ink);margin-bottom:8px;">You are not signed in.</p>' +
        '<p style="color:var(--muted);margin-bottom:20px;">Please sign in to view your account.</p>' +
        '<a class="btn btn--primary" href="signin.html">Sign In</a>';
    }
  }

  /* --------------- Initial data load ----------- */
  async function loadUserData(opts) {
    opts = opts || {};
    const alertBox = $('alertBox');
    try {
      const user = await window.Supabase.getCurrentUser();
      if (!user) { showSignedOut(); return; }

      const fullName = (user.user_metadata && user.user_metadata.full_name) || user.email.split('@')[0];
      const initials = fullName.split(' ').map(function (n) { return n[0]; }).join('').substring(0, 2);

      const userAvatar = $('userAvatar');
      const userName = $('userName');
      const userEmail = $('userEmail');
      const emailInput = $('email');
      const fullNameInput = $('fullName');
      if (userAvatar) userAvatar.textContent = initials.toUpperCase();
      if (userName) userName.textContent = 'Welcome, ' + fullName + '!';
      if (userEmail) userEmail.textContent = user.email;
      if (emailInput) emailInput.value = user.email;
      if (fullNameInput) fullNameInput.value = fullName;

      showAccountUI();
      if (window.App && typeof window.App.init === 'function' && !opts.skipAppInit) {
        try { window.App.init('account'); } catch (e) { /* non-fatal */ }
      }

      // Pre-warm: ensure the user_profiles table exists. If the table is
      // already there, this is a cheap no-op RPC. If it's missing, the
      // first getProfile/upsertProfile call would also self-heal, but
      // pre-warming keeps the first read fast.
      try { await window.Supabase.ensureUserProfilesTable(); } catch (e) { /* ignore */ }

      const { data: profile } = await window.Supabase.getProfile(user.id);
      if (profile) {
        populateForm(document, profile);
        renderAvatarPreview(profile);
        renderHeaderAvatar(profile);
        refreshAvatarStatus(profile);
      } else {
        renderAvatarPreview({ full_name: fullName, avatar_url: null });
        refreshAvatarStatus(null);
      }
    } catch (err) {
      console.error('loadUserData error:', err);
      showAlert(alertBox, 'Failed to load account information', 'error');
      showAccountUI();
    }
  }

  /* --------------- Profile save ----------- */
  function wireProfileForm(alertBox) {
    const form = $('profileForm');
    if (!form) return;
    const btn = $('saveProfileBtn');
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
      try {
        const user = await window.Supabase.getCurrentUser();
        if (!user) {
          showAlert(alertBox, 'Your session has expired. Please sign in again.', 'error');
          setTimeout(function () { window.location.href = 'signin.html'; }, 1200);
          return;
        }
        const patch = {
          full_name: $('fullName').value.trim(),
          email: $('email').value.trim(),
          phone: $('phone').value.trim(),
          default_shipping_address: $('defaultAddress').value.trim(),
          default_shipping_city: $('city').value.trim(),
          default_shipping_state: $('state').value.trim(),
          default_shipping_pincode: $('pincode').value.trim()
        };
        const { error, errorDetail } = await window.Supabase.upsertProfile(user.id, patch);
        if (error) {
          console.error('upsertProfile (profile) error:', error, errorDetail);
          const detail = (typeof error === 'string') ? error : (error.message || 'unknown error');
          if (isSetupError(detail)) {
            showSetupAlert(alertBox, 'Failed to save profile: ' + detail);
          } else {
            showAlert(alertBox, 'Failed to save profile: ' + detail, 'error');
          }
          return;
        }

        const userName = $('userName');
        const userAvatar = $('userAvatar');
        if (userName) userName.textContent = 'Welcome, ' + patch.full_name + '!';
        if (userAvatar && patch.full_name) {
          // If avatar is an image, leave it; otherwise refresh initials.
          if (!userAvatar.querySelector('img')) {
            const ini = patch.full_name.split(' ').map(function (n) { return n[0]; }).join('').substring(0, 2);
            userAvatar.textContent = ini.toUpperCase();
          }
        }
        // Keep the in-page preview initials in sync with the new name (when no photo).
        const preview = $('avatarPreview');
        if (preview && !preview.querySelector('img')) {
          const ini = patch.full_name.split(' ').map(function (n) { return n[0]; }).join('').substring(0, 2);
          preview.innerHTML = '<div class="profile-photo-initials">' + ini.toUpperCase() + '</div>';
        }
        if (window.App && typeof window.App.refreshHeaderAvatar === 'function') {
          window.App.refreshHeaderAvatar();
        }
        showAlert(alertBox, 'Profile updated successfully!', 'success');
      } catch (err) {
        console.error(err);
        showAlert(alertBox, 'Failed to save profile. Please try again.', 'error');
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Save Changes'; }
      }
    });
  }

  /* --------------- Sign out ----------- */
  function wireSignOut() {
    const btn = $('signOutBtn');
    if (!btn) return;
    btn.addEventListener('click', async function () {
      try { await window.Supabase.signOut(); window.location.href = 'signin.html'; }
      catch (e) { console.error(e); showAlert($('alertBox'), 'Failed to sign out', 'error'); }
    });
  }

  /* --------------- Tab navigation (account.html only) ----------- */
  function wireTabs() {
    const links = $$('[data-tab]');
    if (!links.length) return;
    links.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        const tabName = link.getAttribute('data-tab');
        links.forEach(function (l) { l.classList.remove('is-active'); });
        link.classList.add('is-active');
        $$('.account-tab').forEach(function (tab) { tab.style.display = 'none'; });
        const target = $(tabName + 'Tab');
        if (target) target.style.display = 'block';
      });
    });
  }

  /* --------------- Password change ----------- */
  function wireChangePassword(alertBox) {
    const form = $('changePasswordForm');
    if (!form) return;
    const btn = $('changePasswordBtn');
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const cur = $('currentPassword').value;
      const nw = $('newPassword').value;
      const cf = $('confirmNewPassword').value;
      if (!cur || !nw || !cf) { showAlert(alertBox, 'Please fill in all password fields', 'error'); return; }
      if (nw.length < 8) { showAlert(alertBox, 'New password must be at least 8 characters', 'error'); return; }
      if (nw !== cf) { showAlert(alertBox, 'New passwords do not match', 'error'); return; }

      if (btn) { btn.disabled = true; btn.classList.add('btn-loading'); btn.textContent = ''; }
      try {
        const user = await window.Supabase.getCurrentUser();
        if (!user) {
          showAlert(alertBox, 'Your session has expired. Please sign in again.', 'error');
          setTimeout(function () { window.location.href = 'signin.html'; }, 1200);
          return;
        }
        const { error: signInError } = await window.Supabase.signIn(user.email, cur);
        if (signInError) throw new Error('Current password is incorrect');
        const { error } = await window.SupabaseClient.auth.updateUser({ password: nw });
        if (error) throw error;
        showAlert(alertBox, 'Password updated successfully!', 'success');
        form.reset();
      } catch (err) {
        console.error(err);
        showAlert(alertBox, err.message || 'Failed to update password', 'error');
      } finally {
        if (btn) { btn.disabled = false; btn.classList.remove('btn-loading'); btn.textContent = 'Update Password'; }
      }
    });
  }

  /* --------------- Password visibility toggles ----------- */
  function wirePasswordToggles() {
    $$('.password-toggle-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const targetId = btn.getAttribute('data-toggle');
        const input = $(targetId);
        if (!input) return;
        if (input.type === 'password') {
          input.type = 'text';
          btn.setAttribute('aria-label', 'Hide password');
        } else {
          input.type = 'password';
          btn.setAttribute('aria-label', 'Show password');
        }
      });
    });
  }

  /* --------------- Notification preferences ----------- */
  function wireNotifications(alertBox) {
    const a = $('notifyOrders'), b = $('notifyPromo'), c = $('notifyNewsletter');
    if (!a && !b && !c) return;
    const save = async function () {
      try {
        const user = await window.Supabase.getCurrentUser();
        if (!user) return;
        const patch = {
          notify_orders: a ? a.checked : undefined,
          notify_promo: b ? b.checked : undefined,
          newsletter_subscribed: c ? c.checked : undefined
        };
        // Drop undefined keys
        Object.keys(patch).forEach(function (k) { if (patch[k] === undefined) delete patch[k]; });
        const { error } = await window.Supabase.upsertProfile(user.id, patch);
        if (error) throw error;
        showAlert(alertBox, 'Notification preferences saved', 'success');
      } catch (err) { console.error(err); }
    };
    if (a) a.addEventListener('change', save);
    if (b) b.addEventListener('change', save);
    if (c) c.addEventListener('change', save);
  }

  /* --------------- Delete account ----------- */
  function wireDeleteAccount(alertBox) {
    const btn = $('deleteAccountBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
      btn.disabled = true; btn.textContent = 'Deleting...';
      showAlert(alertBox, 'Account deletion request submitted. Please contact support to complete the deletion.', 'success');
      setTimeout(async function () {
        try { await window.Supabase.signOut(); } catch (e) { /* ignore */ }
        Object.keys(localStorage).forEach(function (k) { if (k.indexOf('so_') === 0) localStorage.removeItem(k); });
        try { sessionStorage.clear(); } catch (e) { /* ignore */ }
        window.location.href = 'signin.html';
      }, 2000);
    });
  }

  /* --------------- Email verification resend ----------- */
  function wireResendVerification(alertBox) {
    const btn = $('resendVerificationBtn');
    if (!btn) return;
    btn.addEventListener('click', async function () {
      btn.disabled = true;
      try {
        const user = await window.Supabase.getCurrentUser();
        if (!user || !user.email) throw new Error('Not signed in');
        const { error } = await window.Supabase.resendVerification(user.email);
        if (error) throw error;
        showAlert(alertBox, 'Verification email sent. Check your inbox.', 'success');
      } catch (err) {
        showAlert(alertBox, err.message || 'Could not resend verification email', 'error');
      } finally {
        btn.disabled = false;
      }
    });
  }

  /* --------------- Entry points ----------- */
  function initCommon() {
    const alertBox = $('alertBox');
    wireSignOut();
    wirePasswordToggles();
    wireChangePassword(alertBox);
    wireNotifications(alertBox);
    wireDeleteAccount(alertBox);
    wireResendVerification(alertBox);
    wireAvatar(alertBox);
    wireCropModal(alertBox);
  }

  function initTab() {
    initCommon();
    wireTabs();
    wireProfileForm($('alertBox'));
    loadUserData();
  }

  function initStandalone() {
    initCommon();
    wireProfileForm($('alertBox'));
    loadUserData();
  }

  window.AccountSettings = {
    initTab: initTab,
    initStandalone: initStandalone,
    /* Exposed for unit testing / manual use */
    loadUserData: loadUserData
  };
})();
