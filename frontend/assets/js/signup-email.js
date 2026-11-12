/* Signup with a Supabase email/password and a confirmation OTP. */
(function () {
  'use strict';

  const form = document.getElementById('signupForm');
  const nameInput = document.getElementById('fullName');
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('phone');
  const passwordInput = document.getElementById('password');
  const confirmInput = document.getElementById('confirmPassword');
  const submitBtn = document.getElementById('submitBtn');
  const alertBox = document.getElementById('alertBox');
  const strengthFill = document.getElementById('strengthFill');
  const strengthText = document.getElementById('strengthText');
  // Public Supabase project credentials (same values as plugins/supabase/supabase-client.js).
  // Signup uses the Auth HTTP API so a missing/blocked browser SDK cannot disable the form.
  const isLocal = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(window.location.origin);
  const local = window.__soSupabaseConfig;
  const validLocal = local && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(local.url) &&
    typeof local.publicKey === 'string' && local.publicKey.length > 10;
  const authUrl = isLocal ? (validLocal ? local.url + '/auth/v1' : null) : 'https://ufhlmdqkqdkcohpbzdux.supabase.co/auth/v1';
  const publicKey = isLocal ? (validLocal ? local.publicKey : null) : 'sb_publishable_vGSGtfcC4bX9jGtIWpAknQ_-c42WmiR';
  let submitting = false;
  // Local guard only: Supabase's email quota is shared by the whole project.
  const cooldownKey = 'so_signup_email_rate_limit_until_v1';
  let cooldownUntil = 0;
  try { cooldownUntil = Number(sessionStorage.getItem(cooldownKey)) || 0; } catch (e) { /* private mode */ }

  function emailLimitMessage(until) {
    const minutes = Math.max(1, Math.ceil((until - Date.now()) / 60000));
    return 'Email sending is temporarily limited. No verification email was sent. ' +
      'Please wait at least ' + minutes + ' minute' + (minutes === 1 ? '' : 's') +
      ' before trying again. If this continues, ask the store owner to configure custom SMTP in Supabase.';
  }

  function retryDelay(response) {
    const value = response.headers && response.headers.get('Retry-After');
    if (value) {
      const seconds = Number(value);
      if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds * 1000);
      const time = Date.parse(value);
      if (Number.isFinite(time) && time > Date.now()) return time - Date.now();
    }
    // No server-specified retry time. This only limits repeat clicks in this
    // browser; it does not claim to know when the project's quota resets.
    return 60000;
  }

  function showAlert(message) {
    alertBox.textContent = message;
    alertBox.className = 'alert alert--error is-visible';
    alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function normalisePhone(raw) {
    const digits = raw.replace(/\D/g, '');
    const local = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
    return /^[6-9]\d{9}$/.test(local) ? '+91' + local : null;
  }

  // Do not create an unconfirmed account if the project would auto-confirm it
  // without emailing a code. These project settings must also be configured
  // in Supabase itself; a browser check alone is not an authorization policy.
  async function requireEmailConfirmation() {
    if (!authUrl || !publicKey) throw new Error('Local Supabase is not configured. Start the local preview server and Docker Supabase.');
    const response = await fetch(authUrl + '/settings', {
      headers: { apikey: publicKey }
    });
    if (!response.ok) throw new Error('Could not check email verification settings. Please try again later.');
    const settings = await response.json();
    if (settings.disable_signup !== false || settings.mailer_autoconfirm !== false) {
      throw new Error('Email OTP signup is not enabled yet. The store owner must enable public signup and Confirm email in Supabase Authentication settings.');
    }
  }

  async function signUp(email, password, metadata) {
    // Supabase verifies the link before redirecting. Send the shopper directly
    // to the site's home directory instead of a verification page the host may
    // not publish (and keep subdirectory deployments working).
    const homeUrl = new URL('./', window.location.href);
    const redirect = /^https?:$/.test(homeUrl.protocol)
      ? '?redirect_to=' + encodeURIComponent(homeUrl.href) : '';
    const response = await fetch(authUrl + '/signup' + redirect, {
      method: 'POST',
      headers: { apikey: publicKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password, data: metadata })
    });
    const result = await response.json();
    if (!response.ok) {
      const message = String(result.msg || result.message || result.error_description || result.error || '');
      if (response.status === 429 && (result.code === 'over_email_send_rate_limit' || /email.*rate limit/i.test(message))) {
        cooldownUntil = Date.now() + Math.max(60000, retryDelay(response));
        try { sessionStorage.setItem(cooldownKey, String(cooldownUntil)); } catch (e) { /* private mode */ }
        throw new Error(emailLimitMessage(cooldownUntil));
      }
      if (response.status === 429) {
        throw new Error('Too many signup requests. Please wait a few minutes before trying again.');
      }
      throw new Error(result.msg || result.message || result.error_description || result.error || 'Could not create your account. Please try again.');
    }
    // When email confirmation is enabled, signup returns a user but no session.
    // Do not claim a code was sent if project settings changed during the request.
    if (result.access_token || result.session) {
      throw new Error('Email confirmation is disabled in Supabase. Please contact the store owner.');
    }
  }

  passwordInput.addEventListener('input', function () {
    const password = passwordInput.value;
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    strengthFill.className = 'password-strength__fill' + (password ? ' ' + (strength <= 2 ? 'weak' : strength <= 3 ? 'medium' : 'strong') : '');
    strengthText.textContent = password ? (strength <= 2 ? 'Weak password' : strength <= 3 ? 'Medium strength' : 'Strong password') : '';
  });

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (submitting) return;
    alertBox.className = 'alert';
    if (Date.now() < cooldownUntil) { showAlert(emailLimitMessage(cooldownUntil)); return; }

    const fullName = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = normalisePhone(phoneInput.value);
    const password = passwordInput.value;
    if (fullName.length < 2) { showAlert('Please enter your full name.'); nameInput.focus(); return; }
    if (!emailInput.validity.valid || !email) { showAlert('Please enter a valid email address.'); emailInput.focus(); return; }
    if (!phone) { showAlert('Please enter a valid 10-digit Indian mobile number (+91).'); phoneInput.focus(); return; }
    if (password.length < 8) { showAlert('Password must be at least 8 characters long.'); passwordInput.focus(); return; }
    if (password !== confirmInput.value) { showAlert('Passwords do not match.'); confirmInput.focus(); return; }
    if (!document.getElementById('terms').checked) { showAlert('Please accept the terms and conditions.'); return; }

    submitting = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending email code…';
    try {
      await requireEmailConfirmation();
      await signUp(email, password, { full_name: fullName, phone: phone });
      try { sessionStorage.setItem('so_pending_signup_email', email); } catch (e) { /* private mode */ }
      window.location.href = 'verify-otp.html?email=' + encodeURIComponent(email);
    } catch (error) {
      console.error('Email signup failed:', error);
      showAlert((error && error.message) || 'Could not send the email code. Please try again.');
    } finally {
      submitting = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
    }
  });

  if (window.Supabase && typeof window.Supabase.isAuthenticated === 'function') {
    window.Supabase.isAuthenticated().then(function (authenticated) {
      if (authenticated) window.location.href = 'account.html';
    }).catch(function (error) {
      console.warn('Could not check signup session:', error);
    });
  }
})();