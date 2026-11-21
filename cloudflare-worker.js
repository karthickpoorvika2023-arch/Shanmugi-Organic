/*
 * Cloudflare Worker: serve the existing static storefront and handle
 * password-checked, email-OTP sign-in. No service-role or SMTP secrets needed.
 * Runtime bindings: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY.
 */
const OTP_START_PATH = '/api/signin-otp/start';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

async function sendSignInOtp(request, env) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const origin = request.headers.get('Origin');
  const targetOrigin = new URL(request.url).origin;
  if ((origin && origin !== targetOrigin) || request.headers.get('Sec-Fetch-Site') === 'cross-site') {
    return json({ error: 'Forbidden' }, 403);
  }
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) {
    return json({ error: 'Expected JSON request' }, 415);
  }
  if (Number(request.headers.get('Content-Length') || 0) > 2048) {
    return json({ error: 'Invalid request' }, 400);
  }

  let body;
  try {
    const raw = await request.text();
    if (raw.length > 2048) return json({ error: 'Invalid request' }, 400);
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const password = body?.password;
  if (
    email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    typeof password !== 'string' || password.length < 6 || password.length > 1024
  ) {
    return json({ error: 'Invalid request' }, 400);
  }

  // These must be Worker RUNTIME variables, not just Workers Builds variables.
  const rawUrl = env?.SUPABASE_URL;
  const key = env?.SUPABASE_PUBLISHABLE_KEY;
  let supabaseUrl;
  try {
    supabaseUrl = new URL(rawUrl);
    if (supabaseUrl.protocol !== 'https:' || supabaseUrl.username || supabaseUrl.password ||
        supabaseUrl.search || supabaseUrl.hash || supabaseUrl.pathname !== '/') {
      throw new Error('Invalid URL');
    }
  } catch {
    return json({ error: 'Sign-in service is not configured' }, 503);
  }
  if (typeof key !== 'string' || !key.trim()) {
    return json({ error: 'Sign-in service is not configured' }, 503);
  }

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'apikey': key
  };

  try {
    // Supabase verifies the password first. Its issued session remains on the
    // server; never return/store the password session in the browser.
    const passwordResponse = await fetch(new URL('/auth/v1/token?grant_type=password', supabaseUrl), {
      method: 'POST', headers,
      body: JSON.stringify({ email, password }),
      redirect: 'manual'
    });
    if (!passwordResponse.ok) {
      if (passwordResponse.status === 400 || passwordResponse.status === 401 || passwordResponse.status === 422) {
        return json({ error: 'Invalid email or password' }, 401);
      }
      if (passwordResponse.status === 429) {
        return json({ error: 'Too many login attempts. Please try again later.' }, 429);
      }
      return json({ error: 'Sign-in temporarily unavailable. Please try again later.' }, 503);
    }
    const passwordResult = await passwordResponse.json();
    if (!passwordResult?.user?.id || !passwordResult?.access_token) {
      return json({ error: 'Sign-in temporarily unavailable. Please try again later.' }, 503);
    }

    // Request a code only for an existing account after password validation.
    // The Supabase Magic Link email template must contain {{ .Token }} to
    // deliver a 6-digit code (otherwise Supabase sends a link).
    const otpResponse = await fetch(new URL('/auth/v1/otp', supabaseUrl), {
      method: 'POST', headers,
      body: JSON.stringify({ email, create_user: false }),
      redirect: 'manual'
    });
    if (!otpResponse.ok) {
      if (otpResponse.status === 429) {
        return json({ error: 'Email OTP limit reached. Please try again later.' }, 429);
      }
      return json({ error: 'Could not send OTP. Check Supabase Auth email settings.' }, 503);
    }
    return json({ sent: true });
  } catch {
    // Do not log password, session/JWT, OTP or API key.
    return json({ error: 'Sign-in service unavailable. Please try again.' }, 503);
  }
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === OTP_START_PATH) return sendSignInOtp(request, env);
    if (path.startsWith('/api/')) return json({ error: 'Not found' }, 404);
    return env.ASSETS.fetch(request);
  }
};
