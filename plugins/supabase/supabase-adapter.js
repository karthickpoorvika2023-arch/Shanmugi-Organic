/* ==========================================================================
   supabase-adapter.js — Bridge between Supabase and existing SITE data structure
   Load this after supabase-db.js and before data.js
   ========================================================================== */

(function () {
  'use strict';

  // Configuration flag to enable/disable Supabase
  const USE_SUPABASE = false; // Set to true when Supabase is configured

  window.SupabaseAdapter = {
    enabled: USE_SUPABASE,

    /* Load products from Supabase and convert to SITE format */
    async loadProducts() {
      if (!this.enabled) return null;

      const { data: products, error } = await window.SupabaseDB.getProducts();

      if (error) {
        console.error('Error loading products from Supabase:', error);
        return null;
      }

      // Convert Supabase format to existing SITE format
      return products.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        cat: p.category_slug,
        price: parseFloat(p.price),
        oldPrice: p.original_price ? parseFloat(p.original_price) : null,
        unit: p.unit,
        img: p.image_url,
        desc: p.short_description || p.description,
        featured: p.featured,
        bestseller: p.bestseller,
        isNew: p.is_new,
        inStock: p.in_stock,
        rating: parseFloat(p.rating) || 0,
        reviews: p.reviews_count || 0,
        sku: p.sku
      }));
    },

    /* Load categories from Supabase */
    async loadCategories() {
      if (!this.enabled) return null;

      const { data: categories, error } = await window.SupabaseDB.getCategories();

      if (error) {
        console.error('Error loading categories from Supabase:', error);
        return null;
      }

      // Convert to existing SITE format
      return categories.map(c => ({
        slug: c.slug,
        name: c.name,
        nameTa: c.name_tamil,
        icon: c.icon,
        img: c.image_url,
        desc: c.description
      }));
    },

    /* Initialize - load data from Supabase if enabled */
    async init() {
      if (!this.enabled) {
        console.log('Supabase adapter disabled - using local data');
        return;
      }

      console.log('Loading data from Supabase...');

      try {
        // Load products and categories in parallel
        const [products, categories] = await Promise.all([
          this.loadProducts(),
          this.loadCategories()
        ]);

        // Merge Supabase data into SITE instead of replacing it, so the
        // local catalog's categories can never be silently hidden by a
        // partial/out-of-sync database table. Supabase rows UPDATE matching
        // slugs (name / Tamil / image / description) and ADD new ones.
        if (products && products.length > 0) {
          window.SITE.products = products;
          console.log(`Loaded ${products.length} products from Supabase`);
        }

        if (categories && categories.length > 0) {
          const localCats = window.SITE.categories;
          const bySlug = {};
          localCats.forEach(c => { bySlug[c.slug] = c; });
          let updated = 0, added = 0;
          categories.forEach(sc => {
            const lc = bySlug[sc.slug];
            if (lc) {
              if (sc.name) lc.name = sc.name;
              if (sc.nameTa) lc.ta = sc.nameTa;
              if (sc.img) lc.img = sc.img;
              if (sc.desc) lc.blurb = sc.desc;
              updated++;
            } else {
              localCats.push({
                slug: sc.slug,
                name: sc.name || sc.slug,
                ta: sc.nameTa || '',
                blurb: sc.desc || '',
                img: sc.img || ''
              });
              bySlug[sc.slug] = localCats[localCats.length - 1];
              added++;
            }
          });
          console.log(`Categories: ${localCats.length} total (${updated} updated, ${added} added from Supabase)`);
        }

        return true;
      } catch (err) {
        console.error('Failed to load data from Supabase:', err);
        return false;
      }
    },

    /* Save order to Supabase */
    async createOrder(orderData) {
      if (!this.enabled) return { success: false, error: 'Supabase not enabled' };

      const { data, error } = await window.SupabaseDB.createOrder(orderData);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, order: data };
    },

    /* Newsletter signup */
    async subscribeNewsletter(email, name = '') {
      if (!this.enabled) return { success: false, error: 'Supabase not enabled' };

      const { data, error } = await window.SupabaseDB.subscribeNewsletter(email, name);

      if (error) {
        // Check if already subscribed
        if (error.code === '23505') {
          return { success: false, error: 'Email already subscribed' };
        }
        return { success: false, error: error.message };
      }

      return { success: true, data };
    },

    /* Submit contact form */
    async submitContact(formData) {
      if (!this.enabled) return { success: false, error: 'Supabase not enabled' };

      const { data, error } = await window.SupabaseDB.submitContact(formData);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    },

    /* Submit bulk enquiry */
    async submitBulkEnquiry(formData) {
      if (!this.enabled) return { success: false, error: 'Supabase not enabled' };

      const { data, error } = await window.SupabaseDB.submitBulkEnquiry(formData);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    },

    /* Track order */
    async trackOrder(orderNumber, email) {
      if (!this.enabled) return { success: false, error: 'Supabase not enabled' };

      const { data, error } = await window.SupabaseDB.trackOrder(orderNumber, email);

      if (error) {
        return { success: false, error: 'Order not found' };
      }

      return { success: true, order: data };
    },

    /* Get user's orders */
    async getMyOrders() {
      if (!this.enabled) return { success: false, error: 'Supabase not enabled' };

      const isAuth = await window.Supabase.isAuthenticated();
      if (!isAuth) {
        return { success: false, error: 'Not authenticated' };
      }

      const { data, error } = await window.SupabaseDB.getMyOrders();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, orders: data };
    },

    /* Wishlist operations */
    async addToWishlist(productId) {
      if (!this.enabled) return { success: false, error: 'Supabase not enabled' };

      const isAuth = await window.Supabase.isAuthenticated();
      if (!isAuth) {
        return { success: false, error: 'Please login to add to wishlist' };
      }

      const { data, error } = await window.SupabaseDB.addToWishlist(productId);

      if (error) {
        if (error.code === '23505') {
          return { success: false, error: 'Already in wishlist' };
        }
        return { success: false, error: error.message };
      }

      return { success: true, data };
    },

    async removeFromWishlist(productId) {
      if (!this.enabled) return { success: false, error: 'Supabase not enabled' };

      const { error } = await window.SupabaseDB.removeFromWishlist(productId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    },

    async getWishlist() {
      if (!this.enabled) return { success: false, error: 'Supabase not enabled' };

      const isAuth = await window.Supabase.isAuthenticated();
      if (!isAuth) {
        return { success: false, error: 'Not authenticated' };
      }

      const { data, error } = await window.SupabaseDB.getWishlist();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, wishlist: data };
    }
  };

  console.log('Supabase adapter initialized');
})();
