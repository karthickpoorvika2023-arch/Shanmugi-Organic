# Supabase Integration Setup Guide

This guide will help you connect your Shanmuga Organics website to Supabase.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Project name**: `shanmuga-organics`
   - **Database password**: (choose a strong password)
   - **Region**: Choose closest to your users (e.g., Mumbai for India)
5. Click "Create new project" (takes ~2 minutes)

## Step 2: Get Your API Keys

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` (long string)

## Step 3: Configure Your Website

1. **Create `.env` file** in your project root:
```bash
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

2. **Update `assets/js/supabase-client.js`**:
   - Replace `SUPABASE_URL` with your Project URL
   - Replace `SUPABASE_ANON_KEY` with your anon public key

## Step 4: Set Up Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `supabase-schema.sql`
4. Paste into the SQL editor
5. Click "Run" (or press Ctrl+Enter)
6. You should see: "Success. No rows returned"

This creates all the tables: products, orders, categories, reviews, etc.

## Step 5: Install Dependencies

```bash
npm install
```

This installs `@supabase/supabase-js` library.

## Step 6: Add Sample Data (Optional)

To test with sample products, run this SQL in Supabase SQL Editor:

```sql
-- Sample products for testing
INSERT INTO products (name, name_tamil, slug, description, price, original_price, category_slug, unit, image_url, featured, bestseller, in_stock, rating, reviews_count) VALUES
  ('Coconut Oil - Wood Pressed', 'தேங்காய் எண்ணெய்', 'coconut-oil-500ml', 'Pure coconut oil extracted using traditional wooden press. No heat, no chemicals.', 350.00, 400.00, 'cold-pressed-oils', '500ml', 'assets/img/products/coconut-oil.jpg', true, true, true, 4.8, 156),
  ('Sesame Oil - Cold Pressed', 'நல்லெண்ணெய்', 'sesame-oil-500ml', 'Traditional gingelly oil cold-pressed from premium sesame seeds.', 280.00, 320.00, 'cold-pressed-oils', '500ml', 'assets/img/products/sesame-oil.jpg', true, true, true, 4.7, 142),
  ('Mappillai Samba Rice', 'மாப்பிள்ளை சம்பா', 'mappillai-samba-1kg', 'Heritage red rice variety known for strength and stamina building.', 180.00, null, 'traditional-rice', '1kg', 'assets/img/products/mappillai-samba.jpg', true, false, true, 4.9, 203),
  ('Little Millet', 'சாமை', 'little-millet-500g', 'Nutrient-dense little millet, perfect for weight management and diabetes.', 120.00, null, 'millets', '500g', 'assets/img/products/little-millet.jpg', false, true, true, 4.6, 89);
```

## Step 7: Update Your HTML Files

Add these script tags **before closing `</body>` tag** in your HTML files:

```html
<!-- Supabase JS Library (CDN) -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- Your Supabase Integration -->
<script src="assets/js/supabase-client.js"></script>
<script src="assets/js/supabase-db.js"></script>
```

**Files to update:**
- index.html
- products.html
- product.html
- cart.html
- checkout.html
- account.html
- wishlist.html
- admin.html

## Step 8: Load Products from Supabase

Replace your existing product data loading with:

```javascript
// Example: Load products in products.html
async function loadProducts() {
  const { data: products, error } = await SupabaseDB.getProducts({
    category: 'cold-pressed-oils', // or get from URL
    limit: 20
  });

  if (error) {
    console.error('Error loading products:', error);
    return;
  }

  // Render products
  products.forEach(product => {
    // Your existing rendering logic
  });
}

// Call on page load
loadProducts();
```

## Step 9: Test Your Integration

1. **Start your dev server:**
```bash
npm run dev
```

2. **Open browser console** (F12) and check for:
```
Supabase client initialized
Supabase DB service initialized
```

3. **Test loading products:**
```javascript
// In browser console
SupabaseDB.getProducts().then(console.log)
```

## Available Functions

### Products
- `SupabaseDB.getProducts(options)` - Get all products with filters
- `SupabaseDB.getProduct(slug)` - Get single product
- `SupabaseDB.getCategories()` - Get all categories

### Authentication
- `Supabase.signUp(email, password)` - Register user
- `Supabase.signIn(email, password)` - Login
- `Supabase.signOut()` - Logout
- `Supabase.getCurrentUser()` - Get logged in user

### Orders
- `SupabaseDB.createOrder(orderData)` - Place new order
- `SupabaseDB.getMyOrders()` - Get user's orders
- `SupabaseDB.trackOrder(orderNumber, email)` - Track order status

### Wishlist
- `SupabaseDB.addToWishlist(productId)` - Add to wishlist
- `SupabaseDB.removeFromWishlist(productId)` - Remove from wishlist
- `SupabaseDB.getWishlist()` - Get user's wishlist

### Reviews
- `SupabaseDB.getReviews(productId)` - Get product reviews
- `SupabaseDB.submitReview(reviewData)` - Submit review

### Contact Forms
- `SupabaseDB.submitContact(data)` - Submit contact form
- `SupabaseDB.submitBulkEnquiry(data)` - Submit bulk enquiry
- `SupabaseDB.subscribeNewsletter(email)` - Newsletter signup

## Security Notes

⚠️ **Important:**
- Never commit `.env` file to git (already in `.gitignore`)
- The `anon` key is safe to use in frontend (it's public)
- Row Level Security (RLS) policies protect your data
- User authentication is handled securely by Supabase

## Next Steps

1. ✅ Set up Supabase project
2. ✅ Run database schema
3. ✅ Configure API keys
4. ✅ Update HTML files with scripts
5. 🔄 Migrate product data to Supabase
6. 🔄 Update pages to load from Supabase
7. 🔄 Add authentication flow
8. 🔄 Implement checkout with Supabase
9. 🔄 Set up admin panel

## Troubleshooting

**Issue: "Supabase not initialized"**
- Check if you included the Supabase CDN script
- Verify your API keys are correct
- Check browser console for errors

**Issue: "FetchError: request to ... failed"**
- Check your Project URL is correct
- Verify your internet connection
- Check Supabase dashboard status

**Issue: "Row Level Security policy violation"**
- Check if RLS policies are set up correctly
- Verify you're authenticated for protected operations

## Need Help?

- 📚 [Supabase Documentation](https://supabase.com/docs)
- 💬 [Supabase Discord](https://discord.supabase.com)
- 🐛 Check browser console for detailed error messages
