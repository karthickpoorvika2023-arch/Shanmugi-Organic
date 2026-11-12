# Shanmuga Organics — Legacy Project Notes (pre-Version_1 folder layout)

A desktop-only e-commerce site for **Shanmuga Organics** (Erode, Tamil Nadu). Multi-page static HTML site with Supabase auth + DB.

---

## 1. Tech Stack

- **Frontend:** Plain HTML5 + vanilla JS (no framework, no bundler)
- **CSS:** Single `assets/css/style.css` with custom properties (tokens)
- **Auth + DB:** Supabase (loaded from CDN: `@supabase/supabase-js@2`)
- **Fonts:** Inter (UI), Playfair Display (headings), Noto Sans Tamil (Tamil text)
- **No npm / build step.** Open `index.html` in a browser or serve with any static server.

---

## 2. File / Folder Layout

```
New site 3/
├── index.html              ← Home
├── products.html           ← Product listing
├── product.html            ← Product detail (PDP)
├── categories.html
├── cart.html / checkout.html / wishlist.html
├── account.html            ← Logged-in user dashboard (welcome banner + tabs)
├── account-settings.html   ← Standalone settings page (all sections stacked)
├── signin.html / signup.html / forgot-password.html / reset-password.html
├── verify-email.html        ← Email link confirmation
├── verify-otp.html          ← OTP code entry (shown right after signup)
├── setup.html              ← One-time DB setup wizard (auto-detects bootstrap RPC)
├── about.html / our-story.html / wholesale.html / recipes.html
├── contact.html / faqs.html / store-locator.html / bulk-enquiry.html
├── track-order.html
├── shipping.html / returns.html / terms.html / privacy.html
├── admin.html              ← Admin dashboard
├── migrate.html            ← One-time data migration helper
├── supabase-checker.html   ← Debug Supabase connection
├── supabase-schema.sql     ← Full database schema (run once in SQL editor)
└── assets/
    ├── css/style.css       ← All shared styles
    ├── js/
    │   ├── data.js         ← window.SITE — products, categories, coupons
    │   ├── app.js          ← Shared engine — shell, cart, wishlist, search, header avatar
    │   ├── pages.js        ← Page-specific renders (PDP, listing)
    │   ├── supabase-client.js  ← window.Supabase helper (auth + profiles + avatars)
    │   ├── account-settings.js ← Shared module for /account and /account-settings
    │   ├── shell.js
    │   ├── auth-ui.js
    │   ├── admin.js
    │   └── migrate-to-supabase.js
    └── img/                ← Product images, logo.png / logo.svg / favicon
```

---

## 3. Script Loading Order (CRITICAL)

Pages that use shared UI must load scripts in this order **at the end of `<body>`**:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.0"></script>
<script src="assets/js/supabase-client.js"></script>
<script src="assets/js/app.js"></script>
<script src="assets/js/pages.js"></script>
<script>App.init('products');</script>
```

> `data.js` is loaded by `app.js` automatically (it expects `window.SITE`).

`index.html` / `product.html` / `products.html` already follow this. `app.js` now **lazy-loads** Supabase if it is missing, so auth features work on every page even without the explicit script tags.

**Auth/settings pages also include `account-settings.js`:**

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.0"></script>
<script src="assets/js/supabase-client.js"></script>
<script src="assets/js/app.js"></script>
<script src="assets/js/account-settings.js"></script>
<!-- For account.html (tab mode): -->
<script>AccountSettings.initTab();</script>
<!-- For account-settings.html (standalone): -->
<script>AccountSettings.initStandalone();</script>
```

---

## 4. CSS Tokens (from `style.css`)

| Token | Value | Use |
|-------|-------|-----|
| `--green-900` … `--green-050` | `#14532d` … `#f1f7ec` | Primary brand (10 shades) |
| `--gold-700` … `--gold-100` | `#a8761a` … `#fbf0d3` | Accent (5 shades) |
| `--cream-050` … `--cream-300` | `#fdfbf5` … `#efe6d0` | Backgrounds |
| `--ink` / `--ink-soft` / `--muted` | `#22302a` / `#3f5045` / `#6f7d72` | Text |
| `--tamil` | `#4a7a52` | Tamil subtitle color |
| `--line` / `--line-2` | `#e7dfcb` / `#f0eade` | Borders |
| `--red` / `--red-050` | `#b5342a` / `#fdf1ef` | Errors |
| `--blue` | `#2f6f9c` | Info |
| `--radius-s` / `--radius` / `--radius-l` / `--radius-xl` | `6 / 10 / 14 / 20 px` | Corner radii |
| `--shadow-xs/s/m/l` | — | Elevation |
| `--container` / `--pad` | `1240px / 20px` | Layout |
| `--font-en` / `--font-display` / `--font-ta` | Inter / Playfair / Noto Tamil | Fonts |

> **The site is desktop-only:** `body { min-width: 1180px; }`. Do not add mobile breakpoints beyond minor tweaks (e.g. the auth card has a small-screen fallback).

---

## 5. Bilingual (EN / TA) System

The site renders English with a small Tamil subtitle by default. Users can toggle **English only** / **Tamil only** via the language switch in the header.

- Add this class to any element: `class="bi"` (column flex container).
- Inside `.bi`, place **English** first and **Tamil** inside a `<span class="ta">…</span>` or `<div class="ta">…</div>`.
- The CSS in `style.css` hides one or the other depending on `html.lang-en` (default) vs `html.lang-ta`.
- The toggle is wired in `app.js` (`applyLang()`) and persists the choice in `localStorage` key `so_lang_v1`.

**Helper classes:** `.en` (force Inter) and `.ta` (force Noto Sans Tamil).

---

## 6. Data Model (`data.js` → `window.SITE`)

```js
SITE.products    // array of products
SITE.categories  // array of categories
SITE.coupons     // { CODE: { type, value, min, ... } }
SITE.byslug(slug)
SITE.bycat(catId)
```

**Product shape (most-used fields):**
```js
{
  slug, name, ta,           // English name + Tamil name
  cat, catName, catTa,      // category id + names
  img,                       // path to product image
  price, mrp,                // current price + MRP (in ₹)
  unit,                       // e.g. "500 g", "1 L"
  sizes: [["500 g", 240], ["1 kg", 460]],   // [label, price] pairs
  rating, reviews,           // display only
  stock,                      // boolean — out-of-stock UI when false
  badge, off,                 // "New" / "Bestseller" / % off
  sku, desc, highlights, tags
}
```

---

## 7. Cart Module (`app.js`)

```js
Cart.all()                // raw stored items
Cart.add(slug, size, qty) // AUTH-GUARDED — see §8
Cart.setQty(slug, size, qty)
Cart.remove(slug, size)
Cart.clear()
Cart.lines()              // resolved priced lines (drops unknown slugs)
Cart.totals({ coupon })   // { sub, mrp, discount, ship, total, freeShip }
Cart.count()              // total quantity (for header badge)
Cart.sync()               // updates header count + drawer
```

Cart is persisted in `localStorage` key `so_cart_v1` (see `K` object in `app.js`).

---

## 8. Add-to-Cart Sign-In Guard ⭐

**Goal:** unauthenticated users must sign in before they can add to cart. After sign-in they are sent back to the page they came from.

### Flow

1. User clicks **Add to Cart** (product card / quick-view modal / PDP).
2. `Cart.add(slug, size, qty)` (in `app.js`) is `async`.
3. It calls `ensureSupabase()`:
   - If `window.Supabase` already exists → no-op.
   - Otherwise dynamically loads `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.0` and then `assets/js/supabase-client.js`.
4. Calls `window.Supabase.isAuthenticated()` (returns `!!session`).
5. **Not signed in** → redirect:
   ```js
   window.location.href = 'signin.html?redirect=' + encodeURIComponent(pathname + search) + '&message=signin';
   ```
6. Sign-in page reads `?redirect=` and `?message=signin` from the URL:
   - Shows banner: **"Please sign in to add items to your cart and continue shopping."**
   - On successful sign-in, sends the user to `redirect` (or `account.html` if absent).
7. **Signed in** → item is added to cart, toast shown, cart drawer opens.

### Key code locations

| File | What |
|------|------|
| `assets/js/app.js` (top) | `loadScript()`, `ensureSupabase()` — lazy Supabase loader |
| `assets/js/app.js` `Cart.add` | Auth check + redirect |
| `signin.html` | `?redirect=` + `?message=signin` handling |
| `assets/js/supabase-client.js` | `window.Supabase.isAuthenticated / signIn / signUp / signOut / resetPassword` |

### To extend the guard to other actions

```js
const isAuth = await window.__soEnsureSupabase()
  .then(() => window.Supabase.isAuthenticated());
if (!isAuth) {
  window.location.href = 'signin.html?redirect=' + encodeURIComponent(location.pathname + location.search) + '&message=signin';
  return;
}
```

---

## 9. Supabase Setup

`assets/js/supabase-client.js` exposes `window.Supabase`:

```js
window.Supabase = {
  // ----- Auth -----
  client,                    // raw @supabase/supabase-js client
  isAuthenticated(),         // bool — uses getSession() (no network)
  getCurrentUser(),          // user object or null (getSession-first + 4s timeout)
  signIn(email, password),
  signUp(email, password, metadata = {}),  // metadata = { full_name, phone, ... }
  signOut(),
  resetPassword(email),
  resendVerification(email),

  // ----- Profile (user_profiles) -----
  getProfile(userId),        // { data, error, cached? } — sessionStorage 60s TTL
  upsertProfile(userId, patch), // auto-heals if table missing
  ensureUserProfilesTable(), // self-healing RPC (see §17)

  // ----- Avatars (data-URL approach, no storage bucket) -----
  uploadAvatar(file, crop),  // crop = {x,y,size} in source px; 2 MB max, 512×512 output
  removeAvatar(userId),      // no-op alias for backward compat
  getProfileAvatar(userId),  // lightweight refresh for cross-tab sync

  // Constants:
  AVATAR_MAX_INPUT_BYTES: 2 * 1024 * 1024,
  AVATAR_OUTPUT_SIZE: 512,
  AVATAR_OUTPUT_QUALITY: 0.85
};
```

**Config (hard-coded at the top of `supabase-client.js`):**
```js
const SUPABASE_URL      = 'https://ufhlmdqkqdkcohpbzdux.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_vGSGtfcC4bX9jGtIWpAknQ_-c42WmiR';
```

**Auth pages (with the full Supabase library loaded):**
- `signin.html`, `signup.html`, `verify-otp.html`, `forgot-password.html`, `reset-password.html`, `verify-email.html`, `account.html`, `account-settings.html`, `admin.html`, `migrate.html`, `setup.html`.

**After sign-in the user lands on `account.html`** (or on `?redirect=...` if provided). After sign-out, all `localStorage` keys with the `so_` prefix are cleared.

---

## 10. LocalStorage / SessionStorage Keys

| Key | Store | Holds |
|-----|-------|-------|
| `so_cart_v1` | local | Cart items `[{slug, size, qty}]` |
| `so_wish_v1` | local | Wishlist slugs `[]` |
| `so_lang_v1` | local | `'en'` or `'ta'` |
| `so_recent_v1` | local | Recently viewed slugs |
| `so_orders_v1` | local | Local order history (pre-supabase) |
| `so_news_v1` | local | Newsletter subscription flag |
| `so_coupon_v1` | local | Applied coupon code |
| `so_addr_v1` | local | Saved addresses |
| `so_account_profile_v2` | session | Cached user profile (60s TTL, see §11) |
| `so_avatar_changed` | session | Cross-tab avatar sync signal (timestamp) |

All reads are wrapped in `try/catch` for private-browsing mode.

---

## 11. User Profiles + Account Settings ⭐

The user profile lives in the Supabase table `public.user_profiles` and is shared by both `account.html` (tab mode) and `account-settings.html` (standalone). The same JS module (`account-settings.js`) drives both via two entry points: `AccountSettings.initTab()` and `AccountSettings.initStandalone()`.

### Profile shape (table columns)

```js
{
  id,                              // = auth.users.id
  full_name, phone,
  avatar_url,                      // base64 data URL "data:image/jpeg;base64,…"
  default_shipping_address, default_shipping_city,
  default_shipping_state, default_shipping_pincode,
  notify_orders, notify_promo, newsletter_subscribed,
  is_author, is_author_published, author_slug, author_bio,
  author_avatar_url, author_socials (JSONB), author_published_at,
  created_at, updated_at
}
```

### Profile cache (`so_account_profile_v2`)

```js
{ id, fetchedAt, profile: { ...all columns above... } }
```

- **TTL:** 60 s. Bump the key (`_v3`, `_v4`…) on any schema change that adds a cached field.
- **Invalidation:** every successful `upsertProfile` clears the cache.
- **Session-safe:** the cache is namespaced by `id` so a session-switched browser doesn't show user A's profile to user B.

### Signup flow → profile

When a user signs up via `signup.html`, the metadata `{ full_name, phone }` is sent to Supabase. The DB trigger `create_user_profile()` (see §17) copies both into `user_profiles` automatically — even when email confirmation is required (so the user is not yet signed in and the RLS `auth.uid() = id` check would otherwise reject the UPDATE).

### Self-healing

- `Supabase.ensureUserProfilesTable()` calls the `bootstrap_user_profiles()` RPC (see §17). On success, `_userProfilesEnsured = true` for the page load; on a "function not installed" error, `_bootstrapRpcMissing = true` skips future calls.
- All `getProfile` / `upsertProfile` calls also self-heal: if the read or write reports "user_profiles not in schema cache", they call the RPC once and retry.

### RLS policies on `user_profiles`

```
SELECT  : auth.uid() = id
UPDATE  : auth.uid() = id
INSERT  : auth.uid() = id
```

The trigger and bootstrap RPC use `SECURITY DEFINER` so they can DDL or INSERT on behalf of any caller.

---

## 12. Profile Photos (avatars) ⭐

**Approach:** cropped + compressed client-side, stored as a **base64 data URL** in `user_profiles.avatar_url` (TEXT column). **No storage bucket required.**

### Limits

| | Value |
|---|---|
| Max input file size | **2 MB** (`Supabase.AVATAR_MAX_INPUT_BYTES`) |
| Accepted types | JPG, PNG, WebP |
| Output size | **512 × 512** JPEG square |
| Output quality | 0.85 |

### Flow

1. User clicks **Upload a photo** on `account-settings.html` (or the Settings tab in `account.html`).
2. File picker → `Supabase._decodeAvatarFile(file)` validates type + size. If over 2 MB, error: "Image must be 2 MB or smaller." (no modal opens).
3. **Crop modal opens** (`.crop-modal-backdrop`):
   - Drag the image to position. **Wheel-zoom anchored at the cursor** (or use the slider, 1.0×–4.0×).
   - The visible area is a perfect **circle** matching the round preview; outside the circle is dimmed.
   - The image always covers the entire circle (no checkerboard edges).
   - Esc / backdrop click / Cancel closes the modal.
4. On **Save**: the modal computes `{x, y, size}` in source pixels from the current view, calls `Supabase.uploadAvatar(file, crop)`, then `Supabase.upsertProfile(userId, { avatar_url })`.
5. The result is shown in:
   - The 80 px round preview on the account-settings card.
   - The `#userAvatar` element on `account.html`'s welcome banner.
   - The 26 px round avatar in the top-right header on every page (see §13).

### Cropper math (sketch)

```js
baseScale = stageSize / min(img.naturalWidth, img.naturalHeight)
scale     = baseScale * zoom
dispW     = img.naturalWidth  * scale
dispH     = img.naturalHeight * scale
// Offsets clamp so the image always covers the stage.
sourceCrop = {
  x: -offsetX / scale,
  y: -offsetY / scale,
  size: stageSize / scale
}
```

---

## 13. Top-Header Profile Avatar ⭐

The shared header (rendered into every page by `app.js`'s `headerHTML`) includes a **26 px round profile photo** in the "My Account" button's icon slot. It replaces the generic user SVG icon when the signed-in user has uploaded an avatar.

### How it works

- Template (`app.js`):
  ```html
  <a class="util" href="account.html" id="userAccountBtn">
    <span class="util__ic">
      {svg user icon}
      <span class="util__avatar" data-user-avatar hidden>
        <img alt="" data-user-avatar-img>
      </span>
    </span>
    <span class="util__tx"><b data-user-name>My Account</b>…</span>
  </a>
  ```
- `App.updateAuthUI()` fetches `Supabase.getProfile(userId)` (cache-aware), and if `avatar_url` is present, sets `avImg.src = url`, unhides the avatar slot, hides the SVG.
- CSS (`.util__avatar`): 26×26 round, absolute on top of the SVG, 1.5 px white ring so it sits cleanly on the green topbar.

### Refresh hook

After every successful save in `account-settings.js` (photo upload, photo remove, profile name save), the code calls:

```js
window.App.refreshHeaderAvatar();
```

This re-runs `updateAuthUI` and also:
- Dispatches a `so:avatar-changed` `CustomEvent` (in-page listeners).
- Writes `sessionStorage.so_avatar_changed = Date.now()` (cross-tab).
- A `storage` event listener on every page calls the same refresh when another tab writes that key.

**Result:** open `account-settings.html` in tab A and `cart.html` in tab B. Upload a new photo in tab A. Tab B's header avatar updates within ~1 second.

---

## 14. Signup Form

`signup.html` collects **Full Name**, **Email**, **Mobile Number** (required, tel input, 7–20 digits after normalization), **Password**, **Confirm Password**, and a Terms checkbox.

Validation:
- `full_name` ≥ 2 chars.
- Email matches `^[^\s@]+@[^\s@]+\.[^\s@]+$`.
- Phone: trimmed, then `^\+?[0-9]{7,20}$` after stripping spaces/dashes/parens.
- Password ≥ 8 chars; both password fields match.

On submit:
```js
Supabase.signUp(email, password, { full_name, phone: phoneCheck.normalized })
// Best-effort fallback (trigger is the source of truth):
Supabase.upsertProfile(data.user.id, { full_name, phone }).catch(() => {})
```

After successful signup the user is redirected **immediately** to `verify-otp.html?email=…`
(the email is also mirrored in `sessionStorage.so_pending_signup_email` so a refresh keeps
working) — **this happens even when Supabase auto-confirms the signup** (Confirm email OFF →
`signUp()` returns a session). There is no shortcut straight to `account.html` any more; the
OTP screen always comes first. It detects the auto-confirm setting itself (see §14b) and then
continues to the login page.

Full flow: **signup.html → verify-otp.html (enter code) → signin.html (log in) → the site**
(`account.html`, or `?redirect=` if they came from an Add-to-Cart attempt).

See §14b for the OTP page.

---

## 14b. OTP Verification (`verify-otp.html`)

Brand-green version of the standalone OTP screen: heading + copy, N single-digit boxes,
"Remaining time: 01:00s" countdown with a *Resend* link that unlocks at 0, then **Verify**
(primary, pill) and **Cancel** (outline, pill → back to `signup.html`).

| Piece | Where |
|-------|-------|
| Page | `verify-otp.html` (inline CSS + IIFE, same shell as the other auth pages) |
| Box count | `const OTP_LENGTH = 6` at the top of the inline script — match Supabase Auth `mailer_otp_length`. URL parameters cannot override it. |
| Countdown | `RESEND_SECONDS = 60`, formatted `mm:ss` |
| Verify | `window.Supabase.verifySignupOtp(email, token)` → `supabase.auth.verifyOtp({ email, token, type: 'email' })` |
| Resend | `window.Supabase.resendVerification(email)` → `supabase.auth.resend({ type: 'signup' })` |
| Auto-confirm guard | `detectAutoConfirm()` GETs `<project>/auth/v1/settings` (apikey header, read-only). If `mailer_autoconfirm === true` (Confirm email OFF) no OTP can ever arrive, so the boxes lock, the timer shows `—` and the primary button becomes **Continue to Sign In**. Any error → normal OTP flow. |
| Success | green banner → `goToSignin()` → `Supabase.signOut()` (drop the session `verifyOtp` opened) → `signin.html?message=otp&force=1&email=…` (+ `&redirect=` when the shopper asked for another page). After signing in there, `signin.html` continues to `redirect` (default `account.html`). |
| Sign-in hand-off | `signin.html?force=1` skips its "already signed in → account.html" bounce, so the login form is always shown after the OTP step. |

**Supabase requirement:** the *Confirm signup* email template must include the token, e.g.

```html
<p>Your Shanmuga Organics verification code is <b>{{ .Token }}</b></p>
```

Without `{{ .Token }}` the email only carries `{{ .ConfirmationURL }}` and the code field
cannot work (the link flow via `verify-email.html` still works).

---

## 14c. Supabase email OTP signup

Sign up with email/password; Confirm sign up email displays `{{ .Token }}`; verify the code in `verify-otp.html`. The phone is stored as contact information only, not verified. Configure Auth and SMTP as described in `EMAIL_OTP_SETUP.md`.

---

## 15. Conventions

- **HTML:** all lowercase, double-quoted attrs, `data-*` for JS hooks.
- **JS:** vanilla, IIFE wrapper, no transpilation. `const`/`let` only. `SITE` is the global data namespace.
- **CSS:** tokens first, no inline `style=` for layout, no `!important`.
- **Icons:** inline SVGs, defined in `app.js` (`ICONS` object) and exposed as `ic(name)`.
- **No external icon libs** — keeps page weight low and CSP-friendly.
- **Tamil** is always inside a `<... class="ta">` so the language toggle can hide it.

---

## 16. How to Run Locally

Any static server works. From the project folder:

```bash
# Python
python -m http.server 8000

# Node
npx serve .

# Or just open index.html directly
```

Then visit `http://localhost:8000/`.

> Some browsers block `localStorage` and Supabase auth on `file://` — use a local server, not double-click.

---

## 17. Database Schema & Migrations (`supabase-schema.sql`)

Run the whole file once in the Supabase **SQL editor**. All statements are idempotent. Re-running is safe.

### Tables (relevant)

| Table | Purpose |
|-------|---------|
| `user_profiles` | Per-user profile (name, phone, avatar, shipping addr, notification prefs, author fields) |
| `categories`, `products`, `orders`, `order_items`, `reviews`, `addresses`, `newsletter_subscribers`, `coupons` | Catalog + commerce |

### `user_profiles` columns (full set)

`id` (PK → auth.users), `full_name`, `phone`, `avatar_url`, `default_shipping_address/city/state/pincode`, `notify_orders/promo`, `newsletter_subscribed`, `is_author`, `is_author_published`, `author_slug`, `author_bio`, `author_avatar_url`, `author_socials` (JSONB), `author_published_at`, `created_at`, `updated_at`.

### Triggers

#### `create_user_profile()` (on `auth.users` insert)

```sql
INSERT INTO public.user_profiles (id, full_name, phone, created_at, updated_at)
VALUES (
  NEW.id,
  COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
  COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  full_name = COALESCE(EXCLUDED.full_name, public.user_profiles.full_name),
  phone     = COALESCE(EXCLUDED.phone,     public.user_profiles.phone),
  updated_at = NOW();
```

- `SECURITY DEFINER` — works even when the user is not yet signed in.
- Copies **both** `full_name` and `phone` from signup metadata. `ON CONFLICT DO UPDATE` makes it safe to re-fire.
- A `DO $$ ... UPDATE ... $$` block in the schema backfills `phone` for users who signed up before this trigger was added.

#### `update_updated_at_column()`

Standard `BEFORE UPDATE` trigger that sets `updated_at = NOW()`. Applied to `user_profiles`, `categories`, `products`, `orders`, `order_items`, `reviews`.

### Self-healing RPC: `public.bootstrap_user_profiles()`

Idempotent. Returns TEXT (`'ok'` or `'error: …'`). Does:
1. `CREATE TABLE public.user_profiles (...)` if missing (with all columns), otherwise `ALTER TABLE … ADD COLUMN IF NOT EXISTS …` for each.
2. `ENABLE ROW LEVEL SECURITY` and create the three standard policies.
3. Create the partial unique index on `author_slug`.
4. `PERFORM pg_notify('pgrst', 'reload schema')` so PostgREST sees the new table immediately.
5. `EXCEPTION WHEN OTHERS THEN RETURN 'error: ' || SQLERRM;` — surfaces the real error to JS instead of a generic 500.

`search_path = public, auth` so the FK to `auth.users(id)` resolves.

`GRANT EXECUTE TO anon, authenticated`.

### `setup.html` wizard

Auto-detects whether `bootstrap_user_profiles()` is installed by calling `Supabase.ensureUserProfilesTable()`:
- Green ✓ → "Database is set up. You can close this page."
- Red ✗ → "The bootstrap_user_profiles() function is not installed" + Copy button with the full SQL block + Open Supabase dashboard link.
- Mid-state error → "bootstrap_user_profiles() ran but failed: <real reason>" (so you see the actual SQL error).

---

## 18. Common Tasks

| Task | Where to edit |
|------|---------------|
| Add a new product | `assets/js/data.js` → `SITE.products` |
| Add a category | `assets/js/data.js` → `SITE.categories` |
| Change brand colors | `assets/css/style.css` → `:root` tokens |
| Add a new page | Copy an existing HTML file, set `<body data-page="...">`, add scripts at the bottom |
| Change Add-to-Cart flow | `assets/js/app.js` → `Cart.add` |
| Change sign-in redirect | `signin.html` IIFE (already honors `?redirect=`) |
| Change signup redirect / OTP length | `signup.html` success block → `verify-otp.html?email=…`; OTP digits = `OTP_LENGTH` in `verify-otp.html` |
| Protect a new action with auth | Use `await window.__soEnsureSupabase()` then `await window.Supabase.isAuthenticated()` |
| Add a new profile field | `supabase-schema.sql` (add column) + `Supabase.getProfile` (already selects `*`) + `account-settings.html` form + `populateForm` in `account-settings.js`. Bump cache key `so_account_profile_v2` → `_v3`. |
| Change avatar size / quality | `assets/js/supabase-client.js` constants `AVATAR_MAX_INPUT_BYTES`, `AVATAR_OUTPUT_SIZE`, `AVATAR_OUTPUT_QUALITY` |
| Re-run schema | Paste `supabase-schema.sql` in Supabase SQL editor → Run. All DDL is idempotent. |
| Backfill a missing field from `auth.users.raw_user_meta_data` | Add a `DO $$ UPDATE … FROM auth.users … $$` block to the schema. |

---

## 19. Gotchas

- **`min-width: 1180px` on `body`** — the layout breaks below this; do not remove.
- **Supabase anon key is publishable** — safe to commit, but the URL + key are tied to one project.
- **The Supabase library must be loaded before `supabase-client.js`** — `supabase-client.js` only calls `window.supabase?.createClient(...)`; if the lib is missing, `window.Supabase` is `undefined` and auth silently fails. The lazy loader in `app.js` fixes this for product pages.
- **Add to Cart on a page without `app.js` won't get the guard** — make sure every page that has an Add-to-Cart button also loads `app.js`.
- **Email confirmation** is enforced (sign-in fails with "Email not confirmed" until the user clears the OTP). The signup trigger still populates `user_profiles.phone` because it's `SECURITY DEFINER`.
- **OTP emails need `{{ .Token }}`** — the Supabase *Confirm signup* template must include it, otherwise the signup email only carries the confirmation link and `verify-otp.html` can never match a code. Set Supabase → Authentication → Providers → Email → **Email OTP Length** to the same value as `OTP_LENGTH` in `verify-otp.html` (default 6).
- **`mailer_autoconfirm` must be `false`** (Supabase → Authentication → Sign In / Providers → Email → **Confirm email** ON). With it ON(=auto-confirm), no OTP email is sent at all, `signUp()` returns a session immediately and the shopper used to land inside the site without any verification. `verify-otp.html` probes `/auth/v1/settings` and, when `mailer_autoconfirm` is `true`, locks the boxes and offers **Continue to Sign In** instead of pretending to verify. Check the current value with:
  `Invoke-RestMethod 'https://<project>.supabase.co/auth/v1/settings' -Headers @{apikey='<anon-key>'} | Select mailer_autoconfirm`
- **No service worker / offline support** — site requires connectivity for auth and Supabase reads.
- **Profile photo files > 2 MB are rejected with an error** (no silent resize). The user must pick a smaller file.
- **The bootstrap RPC must be created in Supabase** for `user_profiles` to exist. If you skip the schema file, `setup.html` walks the user through creating the RPC. The anon key alone cannot create functions — they must be created in the SQL editor once.
- **PostgREST schema cache** — the `bootstrap_user_profiles()` RPC sends `pg_notify('pgrst', 'reload schema')` at the end so the very next `select` from the client sees the new table.
- **Phone numbers** are stored as plain TEXT, normalized (spaces/dashes/parens stripped). The original formatting is not preserved; users who want it displayed with `+91 98765 43210` can edit the format client-side.
- **Avatar URLs in the DB include a `#v=Date.now()` cache-buster** so the round preview re-renders immediately on upload. Don't strip this in any consumer.

---

## 20. Quick Smoke Test

1. Open `index.html` in a browser (via local server).
2. Click any product → **Add to Cart** → you should land on `signin.html?redirect=…&message=signin` with a green banner.
3. Sign up — fill in name, email, mobile number, password. You land straight on `verify-otp.html` (green OTP screen); type the 6-digit code from the email, or wait for the countdown and hit **Resend**. On success you go to `signin.html?message=otp` with a green banner and the email pre-filled — sign in there to enter the site.
4. Sign in. You should be sent back to the original page. Click **Add to Cart** again → cart drawer opens.
5. Open `cart.html` → items appear, totals correct.
6. Open `account.html` → your email is shown in the welcome banner. Top-right header shows your initials (or a generic user icon if you haven't uploaded a photo yet).
7. Open `account-settings.html` → upload a 512×512 photo (any JPG < 2 MB). The cropper opens; drag + zoom; Save. The photo appears in the welcome banner on `account.html` AND in the top-right header on every page (and on any other open tab within ~1 s).
8. Sign out → cart is cleared (or remains as guest-cart in `localStorage`).

If any step fails, open DevTools → Console for the actual error and check the relevant file from §18.

