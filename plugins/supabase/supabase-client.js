/* ==========================================================================
   supabase-client.js — Supabase client initialization and configuration
   ========================================================================== */

(function () {
  'use strict';

  // Supabase configuration
  const isLocal = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(window.location?.origin || '');
  const local = window.__soSupabaseConfig;
  const validLocal = local && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(local.url) &&
    typeof local.publicKey === 'string' && local.publicKey.length > 10;
  const SUPABASE_URL = isLocal ? (validLocal ? local.url : null) : 'https://ufhlmdqkqdkcohpbzdux.supabase.co';
  const SUPABASE_ANON_KEY = isLocal ? (validLocal ? local.publicKey : null) : 'sb_publishable_vGSGtfcC4bX9jGtIWpAknQ_-c42WmiR';

  // Initialize Supabase client
  const supabase = SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  if (!supabase) {
    console.warn('Supabase client not initialized. Make sure to include the Supabase JS library.');
  }

  // Export to global scope
  window.SupabaseClient = supabase;

  // Helper functions
  window.Supabase = {
    client: supabase,

    // Check if user is authenticated
    async isAuthenticated() {
      if (!supabase) return false;
      const { data: { session } } = await supabase.auth.getSession();
      return !!session;
    },

    // Get current user (with hard timeout + getSession-first fallback)
    async getCurrentUser() {
      if (!supabase) return null;
      const withTimeout = (p, ms) => Promise.race([
        p,
        new Promise((_, rej) => setTimeout(() => rej(new Error('auth-timeout')), ms))
      ]);
      try {
        // Prefer getSession() — reads local storage, no network call,
        // and avoids sending the publishable key as a Bearer token.
        const sessionRes = await withTimeout(supabase.auth.getSession(), 4000);
        if (sessionRes?.data?.session?.user) return sessionRes.data.session.user;
        // No local session — try getUser() with timeout so a bad key
        // doesn't hang the page forever.
        const userRes = await withTimeout(supabase.auth.getUser(), 4000);
        return userRes?.data?.user || null;
      } catch (e) {
        console.warn('getCurrentUser failed:', e?.message || e);
        return null;
      }
    },

    // Sign in with email/password
    async signIn(email, password) {
      if (!supabase) return { error: 'Supabase not initialized' };
      return await supabase.auth.signInWithPassword({ email, password });
    },

    // Sign up with email/password. Supabase verifies the confirmation link
    // before returning the shopper to the site home page.
    // Guard: on file:// origins window.location.origin is "null" and Supabase
    // rejects that redirect — fall back to the dashboard Site URL instead.
    async signUp(email, password, metadata = {}) {
      if (!supabase) return { error: 'Supabase not initialized' };
      const homeUrl = new URL('./', window.location.href);
      const options = { data: metadata };
      if (/^https?:$/.test(homeUrl.protocol)) {
        options.emailRedirectTo = homeUrl.href;
      }
      return await supabase.auth.signUp({
        email,
        password,
        options: options
      });
    },

    // Sign out
    async signOut() {
      if (!supabase) return { error: 'Supabase not initialized' };
      return await supabase.auth.signOut();
    },

    // Reset password
    async resetPassword(email) {
      if (!supabase) return { error: 'Supabase not initialized' };
      return await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password.html'
      });
    },

    // Resend signup verification email. Supabase verifies it and redirects home.
    // Guard: on file:// or
    // sandboxed origins window.location.origin is "null"/"file://" and
    // Supabase rejects that redirect — fall back to the Supabase default.
    async resendVerification(email) {
      if (!supabase) return { error: 'Supabase not initialized' };
      const homeUrl = new URL('./', window.location.href);
      const payload = { type: 'signup', email: email };
      if (/^https?:$/.test(homeUrl.protocol)) {
        payload.options = { emailRedirectTo: homeUrl.href };
      }
      return await supabase.auth.resend(payload);
    },

    // Verify the numeric OTP emailed on signup (verify-otp.html).
    // The "Confirm sign up" template must include {{ .Token }}.
    async verifySignupOtp(email, token) {
      if (!supabase) return { error: 'Supabase not initialized' };
      if (!email || !token) return { error: 'Email and OTP code are required' };
      return await supabase.auth.verifyOtp({
        email: email,
        token: String(token).trim(),
        type: 'email'
      });
    },

    // Verify the email-confirmation LINK (?token_hash=…&type=signup|email).
    // Newer Supabase projects use this PKCE style instead of #access_token.
    // verify-email.html calls this for "?token_hash=" links.
    async verifyEmailTokenHash(tokenHash, type) {
      if (!supabase) return { error: 'Supabase not initialized' };
      if (!tokenHash) return { error: 'Verification token is missing' };
      return await supabase.auth.verifyOtp({
        token_hash: String(tokenHash).trim(),
        type: type || 'signup'
      });
    },

    /* ============================================================
       Profile + author helpers
       Cache key: so_account_profile_v2 (bump on schema change that
       adds a cached field). 60s TTL. Never caches password values.
       ============================================================ */
    _profileCacheKey: 'so_account_profile_v2',
    _profileCacheTtlMs: 60000,

    _getCachedProfile(userId) {
      try {
        const raw = sessionStorage.getItem(this._profileCacheKey);
        if (!raw) return null;
        const obj = JSON.parse(raw);
        if (!obj || obj.id !== userId) return null;
        if (Date.now() - obj.fetchedAt > this._profileCacheTtlMs) return null;
        return obj.profile;
      } catch (e) { return null; }
    },

    _setCachedProfile(userId, profile) {
      try {
        sessionStorage.setItem(this._profileCacheKey, JSON.stringify({
          id: userId,
          fetchedAt: Date.now(),
          profile: profile
        }));
      } catch (e) { /* ignore quota errors */ }
    },

    clearCachedProfile() {
      try { sessionStorage.removeItem(this._profileCacheKey); } catch (e) { /* ignore */ }
    },

    // Fetch the signed-in user's profile. Cache hits skip the network call.
    // Self-heals: if the table is missing, calls ensureUserProfilesTable()
    // and retries the read.
    async getProfile(userId) {
      if (!supabase) return { data: null, error: 'Supabase not initialized' };
      const cached = this._getCachedProfile(userId);
      if (cached) return { data: cached, error: null, cached: true };

      const self = this;
      const isTableMissing = function (err) {
        if (!err) return false;
        const msg = (err.message || String(err) || '').toLowerCase();
        return msg.indexOf('user_profiles') !== -1 &&
               (msg.indexOf('schema cache') !== -1 ||
                msg.indexOf('does not exist') !== -1 ||
                msg.indexOf('not found') !== -1);
      };

      let res = await supabase.from('user_profiles').select('*').eq('id', userId).maybeSingle();

      if (res && res.error && isTableMissing(res.error)) {
        const ensured = await self.ensureUserProfilesTable();
        if (ensured.ok) {
          res = await supabase.from('user_profiles').select('*').eq('id', userId).maybeSingle();
        } else {
          return { data: null, error: self._setupNeededError('user_profiles table', ensured.error), errorDetail: res.error };
        }
      }

      if (res && res.data) self._setCachedProfile(userId, res.data);
      return res;
    },

    // Returns a friendly error string that points the user at setup.html
    // when the database is missing required schema (table, function, etc.).
    _setupNeededError(what, detail) {
      const tail = detail ? ' (' + detail + ')' : '';
      return 'Database is not set up yet: ' + what + ' is missing' + tail +
             '. Open setup.html for one-click instructions, or paste supabase-schema.sql into the Supabase SQL editor.';
    },

    // Lazily ensure the user_profiles table exists. Calls the
    // bootstrap_user_profiles() RPC, which is idempotent and runs with
    // SECURITY DEFINER so anon/authenticated callers can DDL. Caches
    // success in memory for the rest of the page load. The RPC also
    // pings PostgREST to reload its schema cache and returns a real
    // error string (instead of throwing) if anything goes wrong inside.
    _userProfilesEnsured: false,
    _bootstrapRpcMissing: false,
    async ensureUserProfilesTable() {
      if (this._userProfilesEnsured) return { ok: true, cached: true };
      if (this._bootstrapRpcMissing) {
        return { ok: false, error: 'bootstrap_user_profiles() RPC is not installed in the database', missing: true };
      }
      if (!supabase) return { ok: false, error: 'Supabase not initialized' };
      try {
        const { data, error } = await supabase.rpc('bootstrap_user_profiles');
        if (error) {
          const msg = (error.message || String(error) || '').toLowerCase();
          if (msg.indexOf('bootstrap_user_profiles') !== -1 && msg.indexOf('schema cache') !== -1) {
            this._bootstrapRpcMissing = true;
            return { ok: false, error: 'bootstrap_user_profiles() function is not installed', missing: true };
          }
          // The function might exist but failed to run. Try once more
          // after a short delay in case it's a transient PostgREST
          // 5xx (the "Backend error! Retry your query." case).
          if (msg.indexOf('backend error') !== -1 || msg.indexOf('retry') !== -1 || msg.indexOf('500') !== -1) {
            await new Promise(function (r) { setTimeout(r, 400); });
            const retry = await supabase.rpc('bootstrap_user_profiles');
            if (retry.error) {
              return { ok: false, error: retry.error.message || String(retry.error) };
            }
            if (typeof retry.data === 'string' && retry.data.indexOf('error:') === 0) {
              return { ok: false, error: retry.data };
            }
            this._userProfilesEnsured = true;
            return { ok: true, result: retry.data };
          }
          return { ok: false, error: error.message || String(error) };
        }
        // The RPC returns TEXT. If it returned an "error: ..." string,
        // the function ran but failed — surface that to the caller.
        if (typeof data === 'string' && data.indexOf('error:') === 0) {
          return { ok: false, error: data };
        }
        this._userProfilesEnsured = true;
        return { ok: true, result: data };
      } catch (e) {
        const msg = (e && e.message ? e.message : String(e)).toLowerCase();
        if (msg.indexOf('bootstrap_user_profiles') !== -1 && msg.indexOf('schema cache') !== -1) {
          this._bootstrapRpcMissing = true;
          return { ok: false, error: 'bootstrap_user_profiles() function is not installed', missing: true };
        }
        return { ok: false, error: e && e.message ? e.message : String(e) };
      }
    },

    // Upsert profile fields and invalidate cache.
    // Defensive: probes for the row first, then UPDATE if it exists or
    // INSERT if missing. Falls back to upsert() if the probe itself fails.
    // Self-heals: if any step reports "table not found", calls
    // ensureUserProfilesTable() once and retries the operation.
    // Returns { data, error, errorDetail } so the caller can show real errors.
    async upsertProfile(userId, patch) {
      if (!supabase) return { data: null, error: 'Supabase not initialized' };
      patch = patch || {};
      const payload = Object.assign({ id: userId, updated_at: new Date().toISOString() }, patch);

      const self = this;
      const isTableMissing = function (err) {
        if (!err) return false;
        const msg = (err.message || String(err) || '').toLowerCase();
        return msg.indexOf('user_profiles') !== -1 &&
               (msg.indexOf('schema cache') !== -1 ||
                msg.indexOf('does not exist') !== -1 ||
                msg.indexOf('not found') !== -1);
      };

      const doWrite = async function () {
        // 1. Probe for the row.
        let exists = null;
        try {
          const probe = await supabase.from('user_profiles')
            .select('id')
            .eq('id', userId)
            .maybeSingle();
          exists = !!(probe && probe.data);
        } catch (e) {
          exists = null;
        }
        // 2. UPDATE / INSERT / upsert fallback.
        if (exists === true) {
          const { id, ...rest } = payload;
          return await supabase.from('user_profiles').update(rest).eq('id', userId);
        }
        if (exists === false) {
          return await supabase.from('user_profiles').insert(payload);
        }
        return await supabase.from('user_profiles').upsert(payload);
      };

      let res = await doWrite();

      // Self-heal: if the table is missing, create it via RPC and retry.
      if (res && res.error && isTableMissing(res.error)) {
        const ensured = await self.ensureUserProfilesTable();
        if (!ensured.ok) {
          return {
            data: null,
            error: self._setupNeededError(ensured.missing ? 'bootstrap_user_profiles() function' : 'user_profiles table', ensured.error),
            errorDetail: res.error
          };
        }
        res = await doWrite();
      }

      this.clearCachedProfile();
      if (res && res.error) {
        return {
          data: res.data,
          error: res.error.message || res.error.code || 'Update failed',
          errorDetail: res.error
        };
      }
      return { data: res && res.data, error: null, errorDetail: null };
    },

    // Fetch public author rows by slug. Returns an array (possibly empty).
    async getAuthorsBySlugs(slugs) {
      if (!supabase) return [];
      if (!Array.isArray(slugs) || slugs.length === 0) return [];
      const { data, error } = await supabase
        .from('public_author_profiles')
        .select('*')
        .in('author_slug', slugs);
      if (error) { console.warn('getAuthorsBySlugs:', error); return []; }
      return data || [];
    },

    // Generate a URL-safe slug from a free-text name.
    slugifyAuthorName(name) {
      const base = String(name || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'author';
      return base;
    },

    // Resolve a unique author slug by retrying with -2, -3 suffixes.
    async resolveAuthorSlug(userId, baseName) {
      const base = this.slugifyAuthorName(baseName);
      for (let i = 1; i <= 6; i++) {
        const candidate = i === 1 ? base : (base + '-' + i);
        const probe = await supabase
          .from('user_profiles')
          .select('id')
          .eq('author_slug', candidate)
          .neq('id', userId)
          .maybeSingle();
        if (probe && !probe.data) return candidate;
      }
      // Last resort: append a short hash
      return base + '-' + Math.random().toString(36).slice(2, 6);
    },

    // Enable author for a user. Resolves a slug and writes author fields.
    async enableAuthor(userId, draft) {
      if (!supabase) return { data: null, error: 'Supabase not initialized' };
      const slug = draft && draft.author_slug
        ? this.slugifyAuthorName(draft.author_slug)
        : await this.resolveAuthorSlug(userId, draft && draft.full_name);
      const res = await this.upsertProfile(userId, {
        is_author: true,
        author_slug: slug,
        author_bio: (draft && draft.author_bio) || null,
        author_avatar_url: (draft && draft.author_avatar_url) || null,
        author_socials: (draft && draft.author_socials) || {}
      });
      if (res && !res.error) res.slug = slug;
      return res;
    },

    // Toggle is_author_published. Sets/clears author_published_at.
    async setAuthorPublished(userId, published) {
      if (!supabase) return { error: 'Supabase not initialized' };
      const patch = {
        is_author_published: !!published,
        author_published_at: published ? new Date().toISOString() : null
      };
      return await this.upsertProfile(userId, patch);
    },

    /* ============================================================
       Profile photo helpers (data-URL approach — no storage bucket)
       The image is cropped + compressed client-side to a 512x512 JPEG
       and stored as a base64 data URL in user_profiles.avatar_url
       (TEXT column). No Supabase Storage setup required. Max input
       file size is 2 MB.
       ============================================================ */

    AVATAR_MAX_INPUT_BYTES: 2 * 1024 * 1024,   // 2 MB
    AVATAR_OUTPUT_SIZE: 512,                   // square output edge
    AVATAR_OUTPUT_QUALITY: 0.85,               // JPEG quality (0..1)

    // Decode a File into an HTMLImageElement. Validates type and size.
    // Returns { image, error }.
    async _decodeAvatarFile(file) {
      const okTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (okTypes.indexOf(file.type) === -1) {
        return { error: 'Please pick a JPG, PNG or WebP image.' };
      }
      if (file.size > this.AVATAR_MAX_INPUT_BYTES) {
        const mb = (this.AVATAR_MAX_INPUT_BYTES / (1024 * 1024)).toFixed(0);
        return { error: 'Image must be ' + mb + ' MB or smaller.' };
      }
      const url = await new Promise(function (resolve, reject) {
        const reader = new FileReader();
        reader.onload = function (ev) { resolve(ev.target.result); };
        reader.onerror = function () { reject(new Error('File read failed')); };
        reader.readAsDataURL(file);
      }).catch(function (e) { return { __err: e }; });
      if (url && url.__err) return { error: url.__err.message || 'File read failed' };
      const img = await new Promise(function (resolve, reject) {
        const i = new Image();
        i.onload = function () { resolve(i); };
        i.onerror = function () { reject(new Error('Image decode failed')); };
        i.src = url;
      }).catch(function (e) { return { __err: e }; });
      if (img && img.__err) return { error: img.__err.message || 'Image decode failed' };
      return { image: img, srcUrl: url };
    },

    // Render a cropped square from a source image to a JPEG data URL.
    // crop = { x, y, size } in source-image pixels, where (x, y) is the
    // top-left of the square and `size` is the side length. The result
    // is always AVATAR_OUTPUT_SIZE x AVATAR_OUTPUT_SIZE.
    async _renderCroppedToDataUrl(image, crop) {
      const SIZE = this.AVATAR_OUTPUT_SIZE;
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      // Clamp crop to image bounds (defensive — the UI should prevent
      // this, but a partial out-of-bounds crop should still work).
      const x = Math.max(0, Math.min(crop.x, image.width  - 1));
      const y = Math.max(0, Math.min(crop.y, image.height - 1));
      const size = Math.max(1, Math.min(crop.size, image.width  - x, image.height - y));
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      // White backdrop — a transparent PNG avatar would flatten to BLACK in JPEG.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.drawImage(image, x, y, size, size, 0, 0, SIZE, SIZE);
      const url = canvas.toDataURL('image/jpeg', this.AVATAR_OUTPUT_QUALITY);
      if (!url || url.length < 100) throw new Error('Canvas compression failed');
      return url;
    },

    // "Upload" a user avatar. Takes a File + crop params and returns a
    // 512x512 JPEG data URL — caller writes it to user_profiles.avatar_url
    // via upsertProfile. No network call, no storage bucket. Returns
    // { url, error }.
    //   crop: optional { x, y, size } in source-image pixels. If omitted,
    //         the image is center-cropped to a square.
    async uploadAvatar(file, crop /*, userId */) {
      if (!file) return { error: 'No file selected' };
      const d = await this._decodeAvatarFile(file);
      if (d.error) return { error: d.error };
      let useCrop = crop;
      if (!useCrop || typeof useCrop.size !== 'number') {
        const side = Math.min(d.image.width, d.image.height);
        useCrop = { x: (d.image.width  - side) / 2,
                    y: (d.image.height - side) / 2,
                    size: side };
      }
      let dataUrl;
      try {
        dataUrl = await this._renderCroppedToDataUrl(d.image, useCrop);
      } catch (e) {
        return { error: (e && e.message) || 'Compression failed' };
      }
      // Tiny cache-buster so <img> re-renders immediately on update.
      return { url: dataUrl + '#v=' + Date.now() };
    },

    // Remove a user's avatar. With the data-URL approach this is a no-op —
    // the caller clears avatar_url via upsertProfile. Kept as an alias
    // so existing call sites work unchanged.
    async removeAvatar(/* userId */) {
      return {};
    },

    // Fetch just the avatar_url column for a user. Lightweight refresh for cross-tab sync.
    async getProfileAvatar(userId) {
      if (!supabase || !userId) return null;
      const res = await supabase
        .from('user_profiles')
        .select('avatar_url')
        .eq('id', userId)
        .maybeSingle();
      if (res && res.error) {
        console.warn('getProfileAvatar error:', res.error.message);
        return null;
      }
      return res && res.data ? (res.data.avatar_url || null) : null;
    }
  };

  console.log('Supabase client initialized');
})();
