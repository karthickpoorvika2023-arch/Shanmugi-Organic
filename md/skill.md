# Shanmuga Organics — Version_1 project record

> Snapshot of the local project structure inspected on 2026-10-22. Project root: `c:\Users\Admin\Desktop\Ai OmeniRouter & Open Router\To Day Working\Version_1`. This Markdown file is an **inventory and working guide, not a copy of the source contents**. The accompanying `Version_1-source-snapshot.zip` in the project root holds the actual source snapshot; see its exclusions below. Older detailed notes were preserved in `md/skill-legacy.md`; some paths and claims there predate the current folder layout.

## Saved version / recovery

- `Version_1-source-snapshot.zip` is a local archive of the source tree at the time of this record, including `frontend/`, `plugins/`, `backend/`, `tools/`, `md/` and root README/package/lock/example-env/gitignore files. Extract it into a **separate empty folder** if you need to recover this source version; then run `npm install` and `npm run build` from that folder.
- Excluded deliberately: regenerated `dist/`, reinstallable `node_modules/`, real `.env` files, private editor/connection settings (`.mcp.json`, `.agents/`, `.claude/`, `.vscode/`) and the ZIP itself. These exclusions mean it is a **source snapshot, not a full-system backup**; Supabase-hosted database contents/dashboard settings and live credentials are not captured. Keep the ZIP private and make an off-device copy if you need disaster recovery.
- This archive is **not regenerated automatically** when later changes are made. Recreate a new archive and update this note after completing another version.

## Where to work

**OwnPay integration (2026-10-24):** `backend/supabase/functions/ownpay-checkout/` contains the new server-side payment flow; `backend/schemas/ownpay-checkout.sql` is the required migration; `tools/gen-payment-catalog.mjs` generates its fixed catalog. Setup/security limitations and deployment steps are in `md/OWNPAY_SETUP.md`. Frontend checkout no longer creates unpaid confirmed orders. Nothing is live until an INR-capable OwnPay server/provider, credentials, SQL migration, Edge Function, and storefront are configured and tested. Public order writes must be disabled for security; this temporarily breaks the legacy browser-admin order status editor.

- `frontend/`: actual site pages, browser JS, CSS and images. Edit here, **not** in `dist/`.
- `plugins/supabase/`: browser Supabase initialization, DB integration and migration code; `plugins/cms/`: site/admin content editor JS and CSS. Page script paths reference these as `/plugins/...`.
- `backend/schemas/`: SQL setup/migrations; `backend/fixes/`: targeted SQL fixes. Run SQL manually in the appropriate Supabase project after review. `backend/supabase/functions/phone-signup/` exists but contains no source files in this snapshot; do not assume there is a deployed function.
- `tools/`: local Node preview server, SVG generation, build and tests. `md/`: setup/troubleshooting docs and email template.
- `dist/`: generated publish output; **`npm run build` deletes and recreates it**. `node_modules/`: installed dependencies. Neither is source or an independent second website.
- `.agents/`, `.claude/`, `.vscode/`, `.mcp.json`: editor/tooling configuration, not site runtime. Do not reproduce private connection/configuration values in documentation or publish them.

## Current stack and commands

Static multipage HTML + CSS + vanilla browser JavaScript; Supabase JS v2 for hosted authentication/database. The root `package.json` is an ES module Node project and declares `@supabase/supabase-js` as a dependency; there is **no framework bundler**. Some pages load Supabase JS from a CDN, while signup loads `plugins/supabase/supabase.umd.js`. Check the particular HTML page's existing script order before changing it; not every page loads identical scripts.

From the project root (see absolute path above):

```text
npm install
npm run dev           # preview at http://localhost:4173/; serves frontend/ and plugins/
npm test              # signup, email verification and layout test scripts
npm run test:signup   # signup test alone
npm run test:layout   # layout test alone
npm run test:smoke    # HTTP CMS checks; needs the appropriate local server context
npm run build         # generates SVGs in frontend/assets/img and recreates dist/
```

Use the preview server or a correctly rooted Live Server rather than `file://`. Publish the **contents** of `dist/`, including its `assets/` and `plugins/` folders. `tools/build-site.mjs` copies `frontend/`, `plugins/`, and only `backend/schemas/supabase-content-schema.sql` (for the CMS Copy SQL action). Never publish other backend SQL, `.env`, dependencies or editor connection settings. `tools/gen-assets.mjs` regenerates SVG assets: edits to generated SVGs may be overwritten. See root `README.md` and `md/README.md` for further instructions; where older instructions disagree with the current scripts/folder tree, follow `package.json` and the source files.

## Features / status in this snapshot

- Storefront: catalog, product pages, categories, cart, checkout, wishlist, accounts, admin, CMS, order-tracking and informational pages. `frontend/assets/js/data.js` defines local catalog data; `app.js` manages shared application state, `pages.js` renders pages and checkout; `shell.js` manages shared UI. Supabase-related browser code lives in `plugins/supabase/`.
- Signup: `frontend/assets/js/signup-email.js` uses Supabase email/password signup, checks email-confirmation settings first, and routes to `frontend/verify-otp.html`. Mobile number is contact data, **not** phone verification. `frontend/verify-otp.html` sets `OTP_LENGTH = 6`; the **Confirm sign up** template is `md/CONFIRM_SIGNUP_OTP_TEMPLATE.html` and needs `{{ .Token }}`. Match the Supabase dashboard's mailer OTP length and enable Confirm email; see `md/EMAIL_OTP_SETUP.md`. Do not include real OTPs, passwords, SMTP credentials or secret keys in this file.
- Checkout is a **demonstration**, not a working payment gateway. `frontend/assets/js/pages.js` displays UPI/card/netbanking/COD choices, creates a browser-local order and asynchronously *attempts* to push it to Supabase for admin display. It does **not** charge money, tokenize cards or reliably commit a paid order. Its success message explicitly states that nothing is charged/shipped. Do not label orders paid or claim payments work merely because checkout shows those options. A branded payment checkout / provider integration remains an **unimplemented future decision**: confirm target country, payment methods, provider and order flow before designing it; protect payment confirmation on a trusted backend and never collect card secrets in site JS.
- Database schemas and RLS live under `backend/schemas/`; SQL files are not proof they were applied to the live project. Real email delivery, SMTP configuration, live Supabase settings, deployed site and payment setup cannot be established from this folder alone.

## Source file inventory (relative to project root)

The following lists the non-generated project source and documentation as inspected. Image filenames are included for orientation. Installed dependencies and generated `dist/` content are excluded because they are regenerated; local-only editor configuration files are listed by location only, without copying their contents.

### Root and editor metadata

```text
README.md
package.json
package-lock.json
.env.example
.gitignore
.mcp.json
.vscode/settings.json
.claude/launch.json
.claude/settings.local.json
.agents/plugins/magicpath/mcp_config.json
.agents/plugins/magicpath/plugin.json
```

### Backend

```text
backend/fixes/FIX_ADMIN_CUSTOMERS.sql
backend/fixes/FIX_ADMIN_ORDERS.sql
backend/fixes/FIX_PRODUCTS_SYNC.sql
backend/schemas/supabase-banners-schema.sql
backend/schemas/supabase-categories-schema.sql
backend/schemas/supabase-content-schema.sql
backend/schemas/supabase-migration-user-profiles.sql
backend/schemas/supabase-products-schema.sql
backend/schemas/supabase-schema.sql
```

### Frontend HTML (32 pages)

```text
frontend/about.html
frontend/account.html
frontend/account-settings.html
frontend/admin.html
frontend/bulk-enquiry.html
frontend/cart.html
frontend/categories.html
frontend/checkout.html
frontend/contact.html
frontend/faqs.html
frontend/forgot-password.html
frontend/index.html
frontend/migrate.html
frontend/our-story.html
frontend/privacy.html
frontend/product.html
frontend/products.html
frontend/recipes.html
frontend/reset-password.html
frontend/returns.html
frontend/setup.html
frontend/shipping.html
frontend/signin.html
frontend/signup.html
frontend/store-locator.html
frontend/supabase-checker.html
frontend/terms.html
frontend/track-order.html
frontend/verify-email.html
frontend/verify-otp.html
frontend/wholesale.html
frontend/wishlist.html
```

### Frontend styles and scripts

```text
frontend/assets/css/admin.css
frontend/assets/css/style.css
frontend/assets/js/account-settings.js
frontend/assets/js/admin.js
frontend/assets/js/app.js
frontend/assets/js/auth-ui.js
frontend/assets/js/data.js
frontend/assets/js/pages.js
frontend/assets/js/shell.js
frontend/assets/js/signup-email.js
```

### Frontend images (87 files)

```text
frontend/assets/img/favicon.svg
frontend/assets/img/leaf-spray.svg
frontend/assets/img/logo.png
frontend/assets/img/logo.svg
frontend/assets/img/logo-light.svg
frontend/assets/img/avatars/a1.svg
frontend/assets/img/avatars/a2.svg
frontend/assets/img/avatars/a3.svg
frontend/assets/img/avatars/a4.svg
frontend/assets/img/avatars/a5.svg
frontend/assets/img/categories/bath-body-care.svg
frontend/assets/img/categories/cold-pressed-oils.svg
frontend/assets/img/categories/flour-varieties.svg
frontend/assets/img/categories/ghee-honey.svg
frontend/assets/img/categories/health-mix.svg
frontend/assets/img/categories/herbs-hair-care.svg
frontend/assets/img/categories/instant-foods.svg
frontend/assets/img/categories/millets.svg
frontend/assets/img/categories/pickles-powders.svg
frontend/assets/img/categories/traditional-rice.svg
frontend/assets/img/pay/mastercard.svg
frontend/assets/img/pay/rupay.svg
frontend/assets/img/pay/upi.svg
frontend/assets/img/pay/visa.svg
frontend/assets/img/products/a2-ghee.svg
frontend/assets/img/products/amla-powder.svg
frontend/assets/img/products/badam-health-mix.svg
frontend/assets/img/products/castor-oil.svg
frontend/assets/img/products/coconut-oil.svg
frontend/assets/img/products/cow-ghee.svg
frontend/assets/img/products/curry-leaf-podi.svg
frontend/assets/img/products/forest-honey.svg
frontend/assets/img/products/groundnut-oil.svg
frontend/assets/img/products/health-mix-powder.svg
frontend/assets/img/products/herbal-hair-oil.svg
frontend/assets/img/products/hibiscus-hair-powder.svg
frontend/assets/img/products/idli-podi.svg
frontend/assets/img/products/instant-kanji-mix.svg
frontend/assets/img/products/instant-ragi-malt.svg
frontend/assets/img/products/kambu-flour.svg
frontend/assets/img/products/kambu-millet.svg
frontend/assets/img/products/karuppu-kavuni.svg
frontend/assets/img/products/kichadi-samba.svg
frontend/assets/img/products/lemon-pickle.svg
frontend/assets/img/products/mango-pickle.svg
frontend/assets/img/products/mappillai-samba.svg
frontend/assets/img/products/millet-dosa-mix.svg
frontend/assets/img/products/millet-mix.svg
frontend/assets/img/products/multani-mitti-soap.svg
frontend/assets/img/products/mustard-oil.svg
frontend/assets/img/products/nattu-sakkarai.svg
frontend/assets/img/products/neem-powder.svg
frontend/assets/img/products/neem-soap.svg
frontend/assets/img/products/pickle-combo.svg
frontend/assets/img/products/ponni-rice.svg
frontend/assets/img/products/ragi-flour.svg
frontend/assets/img/products/ragi-millet.svg
frontend/assets/img/products/rice-flour.svg
frontend/assets/img/products/samai-millet.svg
frontend/assets/img/products/sambar-powder.svg
frontend/assets/img/products/sandal-soap.svg
frontend/assets/img/products/sathu-maavu.svg
frontend/assets/img/products/seeraga-samba.svg
frontend/assets/img/products/sesame-oil.svg
frontend/assets/img/products/shikakai-powder.svg
frontend/assets/img/products/sunflower-oil.svg
frontend/assets/img/products/thinai-millet.svg
frontend/assets/img/products/turmeric-soap.svg
frontend/assets/img/products/varagu-millet.svg
frontend/assets/img/products/wheat-flour.svg
frontend/assets/img/recipes/dosa.svg
frontend/assets/img/recipes/ghee-sweet.svg
frontend/assets/img/recipes/herbal-hair.svg
frontend/assets/img/recipes/kanji.svg
frontend/assets/img/recipes/millet-upma.svg
frontend/assets/img/recipes/podi-rice.svg
frontend/assets/img/scenes/banner-oils.svg
frontend/assets/img/scenes/banner-rice.svg
frontend/assets/img/scenes/banner-soaps.svg
frontend/assets/img/scenes/farm.svg
frontend/assets/img/scenes/hero.svg
frontend/assets/img/scenes/hero-slide-1.jpg
frontend/assets/img/scenes/hero-slide-2.jpg
frontend/assets/img/scenes/hero-slide-3.jpg
frontend/assets/img/scenes/hero-slide-4.jpg
frontend/assets/img/scenes/hero-slide-5.jpg
frontend/assets/img/scenes/map.svg
```

### Plugins and tools

```text
plugins/cms/admin-content.js
plugins/cms/content-cms.css
plugins/cms/content-cms.js
plugins/supabase/migrate-to-supabase.js
plugins/supabase/supabase.umd.js
plugins/supabase/supabase-adapter.js
plugins/supabase/supabase-client.js
plugins/supabase/supabase-db.js
tools/admin-login-browser.test.mjs
tools/build-site.mjs
tools/gen-assets.mjs
tools/layout.test.mjs
tools/serve.mjs
tools/signup-browser.test.mjs
tools/signup-email.test.mjs
tools/smoke-cms.mjs
tools/verify-email.test.mjs
```

### Documentation

```text
md/404_ERROR_FIXED.md
md/404_FIXED_FINAL.md
md/ACCOUNT_PAGE_COMPLETE.md
md/AUTH_SYSTEM_GUIDE.md
md/CONFIRM_SIGNUP_OTP_TEMPLATE.html
md/EMAIL_OTP_SETUP.md
md/EMAIL_RATE_LIMIT_SOLUTION.md
md/PASSWORD_RESET_FIXED.md
md/README.md
md/README_AUTH_IMPLEMENTATION.md
md/SUPABASE_SETUP.md
md/SUPABASE_SETUP_GUIDE.md
md/VERIFY_EMAIL_REDIRECT.md
md/skill-legacy.md    # archived previous guide (not authoritative for current paths)
md/skill.md           # this file
```

## Working rules for subsequent changes

1. Read the affected page/script and its tests before editing. Update `frontend/` and `plugins/`, then run `npm test` and `npm run build` as appropriate. Treat `dist/` as generated output.
2. Check actual Supabase dashboard settings before claiming a live auth/payment flow works; protect backend authorization and never put service-role/SMTP/payment secrets in browser assets.
3. Keep this inventory/current-status section updated after structure or flow changes. Preserve future versions with new archives or source control, not just this guide.