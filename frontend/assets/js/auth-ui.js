/* ==========================================================================
   auth-ui.js — Authentication UI helper for header user button
   ========================================================================== */
(function () {
  'use strict';

  // Update user button in header based on auth state
  async function updateUserButton() {
    // Wait for Supabase to be ready
    if (!window.Supabase || !window.SupabaseClient) {
      console.log('Supabase not loaded yet, retrying...');
      setTimeout(updateUserButton, 100);
      return;
    }

    try {
      const isAuth = await window.Supabase.isAuthenticated();
      const userBtn = document.getElementById('userAccountBtn');
      const userNameEl = document.querySelector('[data-user-name]');

      if (!userBtn) return;

      if (isAuth) {
        // User is signed in - show their name
        const user = await window.Supabase.getCurrentUser();

        if (user && userNameEl) {
          // Try to get name from metadata or use email
          const fullName = user.user_metadata?.full_name || user.email?.split('@')[0];
          const firstName = fullName.split(' ')[0];

          // Update button text
          userNameEl.textContent = firstName || 'My Account';
          userBtn.setAttribute('title', 'View your account');
        }

        // Link goes to account page
        userBtn.href = 'account.html';
      } else {
        // User is not signed in - show sign in option
        if (userNameEl) {
          userNameEl.textContent = 'Sign In';
        }

        // Link goes to sign in page
        userBtn.href = 'signin.html';
        userBtn.setAttribute('title', 'Sign in to your account');
      }
    } catch (error) {
      console.error('Error updating user button:', error);
    }
  }

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateUserButton);
  } else {
    updateUserButton();
  }

  // Listen for auth state changes
  if (window.SupabaseClient?.auth) {
    window.SupabaseClient.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      updateUserButton();
    });
  }

  // Export for manual refresh if needed
  window.AuthUI = {
    updateUserButton: updateUserButton
  };
})();
