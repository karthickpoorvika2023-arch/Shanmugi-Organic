# Shanmuga Organics - Supabase Backend Integration

Complete backend integration for your e-commerce website using Supabase.

## Project folders

```text
frontend/                HTML pages, assets/css, assets/js, assets/img
backend/schemas/         Supabase database schemas and migrations
backend/fixes/           SQL repair scripts (run manually when needed)
backend/supabase/        Supabase functions directory (currently no deployed function source)
plugins/supabase/        Browser-side Supabase client, DB adapter, migration helper
plugins/cms/             Content editor runtime, admin editor, editor stylesheet
tools/                   Local preview server, asset generator, automated tests
node_modules/            npm-installed dependencies (not source; ignored by Git)
```

Install dependencies with `npm install`, then run `npm run dev` from the project
root and visit `http://localhost:4173/`. Page URLs such as `/signin.html` are
unchanged. Run `npm test` for the signup and layout checks and `npm run test:smoke`
for HTTP checks. `npm run build` regenerates SVGs in `frontend/assets/img` and
packages the deployable static site in `dist/`. Upload **only the contents of
`dist/`** to a static host; the local server reads `frontend/` and `plugins/`
directly. Do not publish `backend/`, `.env`, or `node_modules/`.

Supabase JS itself is loaded via jsDelivr CDN in the pages (and lazily on some
pages), not copied into `plugins/`; the Google Fonts stylesheet also needs a
network connection. Supabase provides the hosted backend: SQL files here are
setup/migration scripts, not an application server. Only the CMS setup SQL is
available from the local preview at `/supabase-content-schema.sql` for its
editor's Copy SQL action; the build includes this one SQL file in `dist/` while
keeping the other backend scripts out of the static site.
The editor/MCP
configuration in `.agents/` and `.mcp.json` is separate from website plugins.

The older setup notes below refer to the pre-reorganization file locations;
use the folder map above when following them.

## 📋 What's Been Set Up

### 1. **Database Schema** (`backend/schemas/supabase-schema.sql`)
Complete PostgreSQL schema with:
- ✅ Products table with pricing, inventory, ratings
- ✅ Categories table with multilingual support
- ✅ Orders & Order Items tables
- ✅ Wishlist functionality
- ✅ Reviews & Ratings system
- ✅ Contact form submissions
- ✅ Bulk enquiry tracking
- ✅ Newsletter subscribers
- ✅ Row Level Security (RLS) policies
- ✅ Automatic triggers and functions

### 2. **JavaScript Integration Files**

#### `plugins/supabase/supabase-client.js`
- Supabase client initialization
- Authentication helpers (sign in, sign up, sign out)
- User session management

#### `plugins/supabase/supabase-db.js`
- Complete database service layer
- CRUD operations for all tables
- Product queries with filters
- Order management
- Wishlist operations
- Reviews system
- Form submissions

#### `plugins/supabase/supabase-adapter.js`
- Bridge between Supabase and your existing code
- Converts Supabase data to SITE format
- Feature toggle (USE_SUPABASE flag)
- Backward compatible with existing data.js

### 3. **Migration Tools**

#### `frontend/migrate.html`
- Beautiful web UI for data migration
- Real-time progress tracking
- Visual feedback for each step
- Error handling and validation

#### `assets/js/migrate-to-supabase.js`
- Console-based migration script
- Batch data import
- Verification step

### 4. **Documentation**

#### `SUPABASE_SETUP.md`
- Step-by-step setup guide
- API configuration instructions
- Troubleshooting tips
- Security best practices

## 🚀 Quick Start

### Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Create new project: `shanmuga-organics`
3. Note your **Project URL** and **anon key**

### Step 2: Configure API Keys

Edit `plugins/supabase/supabase-client.js`:

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

### Step 3: Set Up Database

1. Open Supabase SQL Editor
2. Copy/paste entire `backend/schemas/supabase-schema.sql`
3. Run the script (creates all tables)

### Step 4: Install Dependencies

```bash
npm install
```

### Step 5: Migrate Your Data

Open `frontend/migrate.html` in your browser:

```bash
npm run dev
# Then visit: http://localhost:4173/migrate.html
```

Click "Start Migration" and wait for completion.

### Step 6: Enable Supabase

Edit `plugins/supabase/supabase-adapter.js`:

```javascript
const USE_SUPABASE = true; // Change from false to true
```

### Step 7: Test!

Reload your website. Products now load from Supabase! 🎉

## 📊 Database Structure

```
categories
├── id (uuid)
├── name
├── name_tamil
├── slug
└── ...

products
├── id (uuid)
├── name
├── slug
├── category_slug → categories
├── price
├── original_price
├── featured
├── bestseller
└── ...

orders
├── id (uuid)
├── order_number
├── user_id → auth.users
├── customer_name
├── total
├── status
└── ...

order_items
├── id (uuid)
├── order_id → orders
├── product_id → products
├── quantity
└── ...

wishlist
├── user_id → auth.users
├── product_id → products
└── ...

reviews
├── product_id → products
├── rating
├── comment
└── ...
```

## 🔧 API Usage Examples

### Load Products

```javascript
// Get all products
const { data } = await SupabaseDB.getProducts();

// Filter by category
const { data } = await SupabaseDB.getProducts({
  category: 'cold-pressed-oils'
});

// Get featured products
const { data } = await SupabaseDB.getProducts({
  featured: true,
  limit: 8
});

// Search products
const { data } = await SupabaseDB.getProducts({
  search: 'coconut',
  sortBy: 'price',
  ascending: true
});
```

### Authentication

```javascript
// Sign up
await Supabase.signUp('user@example.com', 'password123');

// Sign in
await Supabase.signIn('user@example.com', 'password123');

// Check if logged in
const isAuth = await Supabase.isAuthenticated();

// Get current user
const user = await Supabase.getCurrentUser();

// Sign out
await Supabase.signOut();
```

### Place Order

```javascript
const orderData = {
  customer_name: 'John Doe',
  customer_email: 'john@example.com',
  customer_phone: '+91 9876543210',
  shipping_address: '123 Main St',
  shipping_city: 'Erode',
  shipping_state: 'Tamil Nadu',
  shipping_pincode: '638001',
  subtotal: 1000.00,
  shipping_cost: 50.00,
  total: 1050.00,
  payment_method: 'cod'
};

const { data, error } = await SupabaseDB.createOrder(orderData);
```

### Wishlist

```javascript
// Add to wishlist (requires login)
await SupabaseAdapter.addToWishlist(productId);

// Remove from wishlist
await SupabaseAdapter.removeFromWishlist(productId);

// Get wishlist
const { wishlist } = await SupabaseAdapter.getWishlist();
```

### Submit Forms

```javascript
// Contact form
await SupabaseAdapter.submitContact({
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+91 9876543210',
  subject: 'Product inquiry',
  message: 'I want to know more about coconut oil...'
});

// Bulk enquiry
await SupabaseAdapter.submitBulkEnquiry({
  company_name: 'ABC Retail',
  contact_person: 'Jane Smith',
  email: 'jane@abc.com',
  phone: '+91 9876543210',
  products: 'Coconut Oil, Sesame Oil',
  quantity: '100 bottles each',
  message: 'Need quote for bulk order'
});

// Newsletter
await SupabaseAdapter.subscribeNewsletter('user@example.com', 'John Doe');
```

## 🔐 Security Features

- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Users can only access their own orders and wishlist
- ✅ Public read access for products and categories
- ✅ Reviews require approval before showing
- ✅ Secure authentication with Supabase Auth
- ✅ API keys safe for frontend (anon key)

## 📱 Next Steps

### Immediate
1. ✅ Set up Supabase project
2. ✅ Run database schema
3. ✅ Update API keys
4. ✅ Migrate data
5. ✅ Enable Supabase in adapter

### Soon
- 🔄 Add user authentication UI
- 🔄 Build admin dashboard
- 🔄 Implement real-time order tracking
- 🔄 Add product reviews UI
- 🔄 Set up email notifications
- 🔄 Add payment gateway integration

### Future
- 📊 Analytics dashboard
- 🔔 Push notifications
- 📧 Email marketing automation
- 🎯 Personalized recommendations
- 📱 Mobile app with same backend

## 🐛 Troubleshooting

**Products not loading?**
- Check browser console for errors
- Verify API keys are correct
- Make sure `USE_SUPABASE = true` in adapter

**Migration failed?**
- Check if schema was run successfully
- Verify internet connection
- Check Supabase dashboard for errors

**Authentication not working?**
- Check if user exists in Supabase Auth
- Verify RLS policies are set up
- Check console for specific errors

## 📚 Resources

- [Supabase Docs](https://supabase.com/docs)
- [JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth](https://supabase.com/docs/guides/auth)

## 💡 Tips

1. **Always test in development first** before enabling in production
2. **Keep your .env file secure** - never commit to git
3. **Use Supabase Dashboard** to monitor queries and performance
4. **Set up database backups** in Supabase settings
5. **Add indexes** for frequently queried fields
6. **Monitor API usage** to stay within free tier limits

## 🎯 Support

For issues or questions:
1. Check `SUPABASE_SETUP.md` for detailed instructions
2. Review browser console for error messages
3. Check Supabase Dashboard logs
4. Refer to Supabase documentation

---

Built with ❤️ for Shanmuga Organics
