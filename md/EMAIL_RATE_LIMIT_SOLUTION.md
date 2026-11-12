# Supabase signup: email rate limit exceeded

The signup page sends an email/password signup request to Supabase Auth, which
must send a confirmation email. `email rate limit exceeded` is a **Supabase
server-side limit**, not a bad password or broken form. The page cannot bypass
the quota. It now explains the error and prevents repeat attempts in the same
tab for at least a minute (or for the `Retry-After` period if Supabase sends
one). This cooldown is only a client-side convenience, **not** an estimate of
when the project's quota resets.

## What the project owner needs to do

1. Check **Supabase Dashboard → Authentication → Rate Limits** for this project's
   current email-send limit, and check Auth logs for the actual 429. Do not
   assume a fixed limit or reset time from an old screenshot or guide.
2. For production email/password signup, configure a verified **custom SMTP**
   provider in **Authentication → SMTP Settings**, set its sender and credentials
   there, and test delivery to an address you control. Adjust email sending
   limits as appropriate after SMTP is configured. Keep credentials server-side;
   never add SMTP passwords or a service-role key to website files.
3. Until then, wait for the server to permit another send; follow `Retry-After`
   if returned. Repeated clicks or switching addresses will not resolve a
   project-wide quota. Check an existing account by signing in rather than
   repeatedly signing up. If an account was created but the email was not sent,
   check **Authentication → Users** and the resend flow after the limit clears.
4. Keep **Confirm email** enabled: this site's signup deliberately refuses
   auto-confirmed signup, and disabling it is not a production workaround.

Check Supabase's current Auth rate limits and custom SMTP documentation rather
than relying on hard-coded free-tier quotas or mail-provider offers.