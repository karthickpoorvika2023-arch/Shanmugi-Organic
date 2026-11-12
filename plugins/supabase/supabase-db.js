/* ==========================================================================
   supabase-db.js — Database service layer for products, orders, and more
   ========================================================================== */

(function () {
  'use strict';

  const supabase = window.SupabaseClient;

  window.SupabaseDB = {

    /* ============================================ Products ================ */

    // Fetch all products
    async getProducts(options = {}) {
      if (!supabase) return { data: [], error: 'Supabase not initialized' };

      let query = supabase
        .from('products')
        .select('*, categories(*)');

      // Filter by category
      if (options.category) {
        query = query.eq('category_slug', options.category);
      }

      // Filter by featured
      if (options.featured) {
        query = query.eq('featured', true);
      }

      // Filter by bestseller
      if (options.bestseller) {
        query = query.eq('bestseller', true);
      }

      // Filter by new
      if (options.isNew) {
        query = query.eq('is_new', true);
      }

      // Search
      if (options.search) {
        query = query.or(`name.ilike.%${options.search}%,description.ilike.%${options.search}%`);
      }

      // Sort
      if (options.sortBy) {
        query = query.order(options.sortBy, { ascending: options.ascending ?? false });
      }

      // Limit
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      return { data: data || [], error };
    },

    // Get single product by slug
    async getProduct(slug) {
      if (!supabase) return { data: null, error: 'Supabase not initialized' };

      const { data, error } = await supabase
        .from('products')
        .select('*, categories(*)')
        .eq('slug', slug)
        .single();

      return { data, error };
    },

    // Get product by ID
    async getProductById(id) {
      if (!supabase) return { data: null, error: 'Supabase not initialized' };

      const { data, error } = await supabase
        .from('products')
        .select('*, categories(*)')
        .eq('id', id)
        .single();

      return { data, error };
    },

    /* ============================================ Categories ============== */

    // Fetch all categories
    async getCategories() {
      if (!supabase) return { data: [], error: 'Supabase not initialized' };

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('order', { ascending: true });

      return { data: data || [], error };
    },

    // Get category by slug
    async getCategory(slug) {
      if (!supabase) return { data: null, error: 'Supabase not initialized' };

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .single();

      return { data, error };
    },

    /* ============================================ Orders ================== */

    // Create new order
    async createOrder(orderData) {
      if (!supabase) return { data: null, error: 'Supabase not initialized' };

      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id,
          ...orderData
        })
        .select()
        .single();

      return { data, error };
    },

    // Get orders for current user
    async getMyOrders() {
      if (!supabase) return { data: [], error: 'Supabase not initialized' };

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: [], error: 'Not authenticated' };

      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, products(*))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      return { data: data || [], error };
    },

    // Get order by ID
    async getOrder(orderId) {
      if (!supabase) return { data: null, error: 'Supabase not initialized' };

      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, products(*))')
        .eq('id', orderId)
        .single();

      return { data, error };
    },

    // Track order by order number
    async trackOrder(orderNumber, email) {
      if (!supabase) return { data: null, error: 'Supabase not initialized' };

      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, products(*))')
        .eq('order_number', orderNumber)
        .eq('email', email)
        .single();

      return { data, error };
    },

    /* ============================================ Wishlist ================ */

    // Add to wishlist
    async addToWishlist(productId) {
      if (!supabase) return { data: null, error: 'Supabase not initialized' };

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: 'Not authenticated' };

      const { data, error } = await supabase
        .from('wishlist')
        .insert({ user_id: user.id, product_id: productId })
        .select()
        .single();

      return { data, error };
    },

    // Remove from wishlist
    async removeFromWishlist(productId) {
      if (!supabase) return { data: null, error: 'Supabase not initialized' };

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: 'Not authenticated' };

      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);

      return { error };
    },

    // Get user's wishlist
    async getWishlist() {
      if (!supabase) return { data: [], error: 'Supabase not initialized' };

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: [], error: 'Not authenticated' };

      const { data, error } = await supabase
        .from('wishlist')
        .select('*, products(*)')
        .eq('user_id', user.id);

      return { data: data || [], error };
    },

    /* ============================================ Reviews ================= */

    // Get reviews for a product
    async getReviews(productId) {
      if (!supabase) return { data: [], error: 'Supabase not initialized' };

      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', productId)
        .eq('approved', true)
        .order('created_at', { ascending: false });

      return { data: data || [], error };
    },

    // Submit a review
    async submitReview(reviewData) {
      if (!supabase) return { data: null, error: 'Supabase not initialized' };

      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('reviews')
        .insert({
          user_id: user?.id,
          approved: false, // Requires admin approval
          ...reviewData
        })
        .select()
        .single();

      return { data, error };
    },

    /* ============================================ Contact ================= */

    // Submit contact form
    async submitContact(contactData) {
      if (!supabase) return { data: null, error: 'Supabase not initialized' };

      const { data, error } = await supabase
        .from('contact_submissions')
        .insert(contactData)
        .select()
        .single();

      return { data, error };
    },

    // Submit bulk enquiry
    async submitBulkEnquiry(enquiryData) {
      if (!supabase) return { data: null, error: 'Supabase not initialized' };

      const { data, error } = await supabase
        .from('bulk_enquiries')
        .insert(enquiryData)
        .select()
        .single();

      return { data, error };
    },

    /* ============================================ Newsletter ============== */

    // Subscribe to newsletter
    async subscribeNewsletter(email, name = '') {
      if (!supabase) return { data: null, error: 'Supabase not initialized' };

      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .insert({ email, name, subscribed_at: new Date().toISOString() })
        .select()
        .single();

      return { data, error };
    }
  };

  console.log('Supabase DB service initialized');
})();
