# Shanmuki Organics — Cloudflare Sign-in Email OTP Fix

## என்ன மாற்றப்பட்டது?

முன்பு `frontend/signin.html`-ல் பழைய Netlify domain-க்கு மட்டும் server-side Email OTP அனுப்பப்பட்டது. Cloudflare domain-ல் password மட்டும் கொண்டு sign-in நடந்தது. இப்போது Cloudflare Worker-ல் `/api/signin-otp/start` சேர்க்கப்பட்டுள்ளது. Email + password validate ஆன பிறகே Supabase-இடம் OTP கேட்கப்படும்; sign-in session OTP verified ஆன பிறகே browser-க்கு கிடைக்கும்.

**பாதுகாப்பு:** எந்த secret-யும் source code-ல் சேர்க்கவில்லை. `SUPABASE_PUBLISHABLE_KEY` என்பது public client key மட்டுமே. `service_role`, `sb_secret_...`, SMTP password ஆகியவற்றை source, GitHub அல்லது browser-க்கு அனுப்ப வேண்டாம்.

## GitHub-க்கு upload / Deploy

1. ZIP-ஐ extract செய்யவும்; *ZIP file-ஐ repository-க்குள் upload செய்ய வேண்டாம்*. Project source files-ஐ GitHub repository-க்கு commit/push செய்யவும். குறிப்பாக மாற்றப்பட்டவை: `frontend/signin.html`, `package.json`, `tools/otp-redirect.test.mjs`. புதிதாக வந்தவை: `cloudflare-worker.js`, `wrangler.jsonc`, `tools/cloudflare-otp.test.mjs`, இந்த guide.
2. Cloudflare → **Workers & Pages** → **shanmuki-organics** → **Settings** → **Builds** → **Production**:
   - Production branch: `main`
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
   - Root directory: `/`
3. **முக்கியம்:** screenshot-ல் உள்ள **Builds → Variables and secrets** என்பது build-time variables. Cloudflare documentation படி அவை Worker run ஆகும்போது கிடைக்காது. அதனால் Worker-ன் **Settings → Variables and Secrets** அல்லது **Settings → Bindings** பகுதியில் production **runtime** variables-ஐயும் configure செய்யவும்:
   - `SUPABASE_URL`: உங்கள் Supabase project's URL
   - `SUPABASE_PUBLISHABLE_KEY`: அதே project-ன் publishable key
   Values-ஐ உங்களுடைய Supabase dashboard-இலிருந்து copy செய்யவும். அவற்றை screenshots/ChatGPT-ல் paste செய்யத் தேவையில்லை.
4. GitHub commit வந்த பிறகு Cloudflare deployments-ல் புதிய build successful ஆனதா என்று பார்க்கவும்.

## Supabase dashboard-ல் செய்ய வேண்டியது

1. Supabase → **Authentication → URL Configuration**: **Site URL** புதிய Cloudflare HTTPS address-ஆக இருக்க வேண்டும். Password-reset / email redirects தேவைப்பட்டால் புதிய domain-ஐ Redirect URLs-ல் அனுமதிக்கவும்.
2. Supabase → **Authentication → Email Templates → Magic Link**: **email body**-ல் `{{ .Token }}` இருக்க வேண்டும். இது இல்லாவிட்டால் `signInWithOtp` 6-digit OTP-க்கு பதில் Magic Link அனுப்பும்.
3. **Authentication → Providers → Email** enabled என்பதை உறுதிப்படுத்தவும்.
4. User email-க்கு OTP mail செல்வதற்காக **Authentication → SMTP Settings**-ல் production custom SMTP provider configure செய்யவும். Built-in sender production-க்கு ஏற்றதல்ல; delivery restrictions மற்றும் rate limits இருக்கும். Supabase **Authentication → Logs / Rate Limits**-ல் send errors பார்க்கவும்.
5. OTP page 6 digits எதிர்பார்க்கிறது. Supabase project-ல் 6-digit OTP setting இருக்கிறதா என்பதை உறுதிப்படுத்தவும்.

## Test (புதிய code deploy ஆன பிறகு மட்டும்)

- `https://shanmuki-organics.shanmukioilmill.workers.dev/signin`
- ஏற்கெனவே verify செய்த test user-ன் email/password கொடுத்து Sign In அழுத்தவும்.
- `verify-otp.html?mode=signin` பக்கம் திறக்க வேண்டும்.
- Inbox/Spam-ல் 6-digit OTP பார்க்கவும்; OTP enter செய்யவும். சரியான OTP-க்கு website home page வரும்.
- தவறான password கொடுத்தால் OTP அனுப்பப்படக்கூடாது.
- `Sign-in service is not configured` என்றால் **runtime** variables விடுபட்டிருக்கலாம்.
- `Email OTP limit reached` அல்லது mail வரவில்லை என்றால் Supabase Auth Logs, rate limits, SMTP, Magic Link template பார்க்கவும்.

## Security note

இது உங்கள் பழைய Netlify-style password-check + Email OTP *user interface flow*-ஐப் பாதுகாக்கும் migration. Supabase Email OTP தானாகவே passwordless sign-in வழியும் வழங்குவதால், இது உண்மையான enforced Multi-Factor Authentication (MFA) அல்ல. கட்டாய 2FA வேண்டுமெனில் Supabase Auth MFA பயன்படுத்தி தனியாக configure செய்ய வேண்டும்.

இந்த bundle-ல் real email அனுப்பி end-to-end test செய்யப்படவில்லை; deployment மற்றும் dashboard settings உங்களால் முடிக்கப்பட்ட பிறகு தான் அது உறுதி செய்ய முடியும்.
