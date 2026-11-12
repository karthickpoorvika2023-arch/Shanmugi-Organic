# Email confirmation → Home

The signup form requests the site's home URL as Supabase's `redirect_to`. After
Supabase confirms the email, the visitor should arrive at that URL. Older
confirmation links may still target `verify-email.html`; this page is included
in the static build and redirects to Home only after verification succeeds.

Production setup (required; changing the site files alone cannot update an
already-sent email or the Supabase project's settings):

1. Deploy **the contents of `dist/`** at the web root. Confirm that the same
   public origin serves `/` and `/verify-email.html` (or the equivalent paths
   if hosted in a subdirectory). Do not deploy an unrelated Next.js app at
   those paths. `npm run build` regenerates `dist/`.
2. In the **same Supabase project used by the site**, go to Authentication →
   URL Configuration. Set **Site URL** to the *actual public Home URL* with the
   correct `https://` host. Add that URL to **Redirect URLs** (including the
   trailing `/`), and add the old `verify-email.html` URL if old links must
   continue working. Do not use `~`, a placeholder host, or localhost for
   production links.
3. Check Authentication → Email Templates → **Confirm signup**. The confirmation
   button should point to `{{ .ConfirmationURL }}`. A hard-coded link to
   `{{ .SiteURL }}/verify-email.html` without a token does not confirm email.
   If the template uses a custom `token_hash` link, it must send the token hash
   and type to a deployed verification handler (this project's
   `verify-email.html` supports that form).
4. Request a **new** confirmation message and inspect its destination. Old
   emails already contain their original URL and cannot be changed by a new
   deployment; the originally issued token may also have expired or been used.

The six-digit email OTP screen is a separate route: verifying that code sends
the visitor to Sign In. This document concerns clicking the confirmation link
inside the email. A failed or expired confirmation must not be treated as a
successful verification.