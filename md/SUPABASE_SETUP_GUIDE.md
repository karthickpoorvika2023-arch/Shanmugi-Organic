# Supabase Setup Guide - Complete Configuration

## Step 1: Configure Email Templates

Go to your Supabase Dashboard: https://app.supabase.com/project/ufhlmdqkqdkcohpbzdux

### Authentication → URL Configuration
1. Navigate to **Authentication** → **URL Configuration**
2. Set the **Site URL** to your domain: `https://yourdomain.com` (or `http://localhost:3000` for local testing)

### Authentication → Email Templates

#### 1. Confirm Signup Template
- **Subject**: `Verify Your Email - Shanmuga Organics`
- **Confirmation URL**: Replace with `https://yourdomain.com/verify-email.html`
- Or for local testing: `http://localhost:3000/verify-email.html`

#### 2. Reset Password Template  
- **Subject**: `Reset Your Password - Shanmuga Organics`
- **Confirmation URL**: Replace with `https://yourdomain.com/reset-password.html`
- Or for local testing: `http://localhost:3000/reset-password.html`

#### 3. Magic Link Template (Optional)
- **Subject**: `Sign In to Shanmuga Organics`
- Keep the default URL or customize as needed

---

## Step 2: Run Database Migration

1. Go to **SQL Editor** in your Supabase Dashboard
2. Click **New Query**
3. Copy and paste the entire contents of `supabase-migration-user-profiles.sql`
4. Click **Run** or press `Ctrl+Enter`

This will:
- ✅ Create the `user_profiles` table
- ✅ Set up Row Level Security (RLS) policies
- ✅ Create auto-trigger to create profiles on signup
- ✅ Migrate any existing users to have profiles

---

## Step 3: Run Main Schema (If Not Done Already)

If you haven't set up the main database schema yet:

1. Go to **SQL Editor** 
2. Click **New Query**
3. Copy and paste the entire contents of `supabase-schema.sql`
4. Click **Run** or press `Ctrl+Enter`

This creates all the tables for:
- Products, Categories, Orders
- Wishlist, Reviews
- Contact submissions, Bulk enquiries
- Newsletter subscribers

---

## Step 4: Test Authentication

### Test Signup Flow
1. Go to `http://localhost:3000/signup.html` (or your domain)
2. Create a test account
3. Check your email for verification link
4. Click the verification link
5. You should be redirected to `verify-email.html`
6. Then redirected to sign in

### Test Sign In
1. Go to `http://localhost:3000/signin.html`
2. Sign in with your verified account
3. You should be redirected to `account.html`

### Test Password Reset
1. Go to `http://localhost:3000/forgot-password.html`
2. Enter your email
3. Check your email for reset link
4. Click the link
5. Enter new password on `reset-password.html`
6. Sign in with new password

---

## Step 5: Verify Database

After creating a user, check that data is being saved:

1. Go to **Table Editor** in Supabase Dashboard
2. Select **auth** schema → **users** table
3. You should see your test user
4. Select **public** schema → **user_profiles** table
5. You should see a matching profile with the user's name

---

## Step 6: Configure Email Provider (Optional but Recommended)

For production, set up a custom SMTP provider for better email deliverability:

1. Go to **Authentication** → **Providers** → **Email**
2. Enable **Custom SMTP**
3. Configure with your email service (SendGrid, Mailgun, AWS SES, etc.)

### Recommended Providers:
- **SendGrid**: Free tier includes 100 emails/day
- **Mailgun**: Free tier includes 5,000 emails/month
- **AWS SES**: $0.10 per 1,000 emails

---

## Step 7: Security Checklist

Before going to production:

- [ ] Set up custom SMTP email provider
- [ ] Configure proper Site URL in Authentication settings
- [ ] Update email redirect URLs to production domain
- [ ] Enable email rate limiting in Authentication settings
- [ ] Set up proper CORS settings if using custom domain
- [ ] Enable 2FA for your Supabase admin account
- [ ] Review and test all RLS policies

---

## Troubleshooting

### User can signup but no profile created
- Check if the trigger `on_auth_user_created` exists
- Run the migration SQL again
- Check Supabase logs for errors

### Email verification not working
- Verify email templates have correct redirect URLs
- Check spam folder
- Verify SMTP settings if using custom provider

### Cannot sign in after verification
- Check if email was actually verified in `auth.users` table
- Look for `email_confirmed_at` timestamp
- Try password reset flow as alternative

### RLS Policy Errors
- Make sure all policies are created
- Check that RLS is enabled on all tables
- Verify user is authenticated before accessing protected data

---

## File Structure

```
New site 3/
├── signin.html                          # Sign in page
├── signup.html                          # Sign up page
├── forgot-password.html                 # Request password reset
├── reset-password.html                  # Reset password with token
├── verify-email.html                    # Email verification landing
├── account.html                         # User account dashboard
├── assets/
│   └── js/
│       └── supabase-client.js          # Supabase initialization
├── supabase-schema.sql                 # Main database schema
├── supabase-migration-user-profiles.sql # User profiles migration
└── SUPABASE_SETUP_GUIDE.md             # This file
```

---

## Next Steps

After authentication is working:

1. Build out the `account.html` page to show user profile
2. Add ability to edit profile information
3. Display user's orders, wishlist, reviews
4. Implement cart and checkout with user association
5. Add admin panel to manage orders and users

---

## Support

If you encounter issues:
- Check Supabase logs in Dashboard
- Review browser console for JavaScript errors
- Verify all SQL migrations ran successfully
- Check that CORS and Site URL are configured correctly

For Supabase-specific help:
- Documentation: https://supabase.com/docs
- Discord Community: https://discord.supabase.com
