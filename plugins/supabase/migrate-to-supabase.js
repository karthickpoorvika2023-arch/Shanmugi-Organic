/* ==========================================================================
   migrate-to-supabase.js — Migration script to import existing data to Supabase
   Run this once after setting up your Supabase database
   ========================================================================== */

(async function () {
  'use strict';

  console.log('=== Supabase Data Migration ===\n');

  // Check if Supabase is available
  if (!window.SupabaseClient) {
    console.error('❌ Supabase client not initialized. Make sure you:');
    console.error('   1. Included Supabase CDN script');
    console.error('   2. Updated API keys in supabase-client.js');
    return;
  }

  // Check if SITE data is available
  if (!window.SITE || !window.SITE.products) {
    console.error('❌ SITE data not found. Make sure data.js is loaded.');
    return;
  }

  const supabase = window.SupabaseClient;
  const SITE = window.SITE;

  console.log('✓ Supabase connected');
  console.log('✓ Local data loaded\n');

  let successCount = 0;
  let errorCount = 0;

  // ========================================================================
  // Step 1: Migrate Categories
  // ========================================================================
  console.log('📁 Migrating Categories...');

  if (SITE.categories && SITE.categories.length > 0) {
    for (let i = 0; i < SITE.categories.length; i++) {
      const cat = SITE.categories[i];

      const categoryData = {
        name: cat.name,
        name_tamil: cat.nameTa || null,
        slug: cat.slug,
        description: cat.desc || null,
        icon: cat.icon || null,
        image_url: cat.img || null,
        order_index: i + 1
      };

      const { data, error } = await supabase
        .from('categories')
        .upsert(categoryData, { onConflict: 'slug' })
        .select();

      if (error) {
        console.error(`  ❌ Error migrating category "${cat.name}":`, error.message);
        errorCount++;
      } else {
        console.log(`  ✓ Migrated: ${cat.name}`);
        successCount++;
      }
    }

    console.log(`\n✅ Categories: ${successCount} migrated, ${errorCount} errors\n`);
  } else {
    console.log('  ⚠️  No categories found to migrate\n');
  }

  // Reset counters
  successCount = 0;
  errorCount = 0;

  // ========================================================================
  // Step 2: Migrate Products
  // ========================================================================
  console.log('📦 Migrating Products...');

  if (SITE.products && SITE.products.length > 0) {
    for (const product of SITE.products) {
      const productData = {
        name: product.name,
        name_tamil: product.nameTa || null,
        slug: product.slug,
        description: product.desc || null,
        short_description: product.shortDesc || null,
        category_slug: product.cat || null,

        // Pricing
        price: product.price,
        original_price: product.oldPrice || null,
        discount_percentage: product.oldPrice ?
          Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) : null,

        // Product details
        unit: product.unit || 'ml',
        stock_quantity: product.stock || 100,
        sku: product.sku || `SKU-${product.slug.toUpperCase()}`,

        // Images
        image_url: product.img || null,
        images: product.images || null,

        // Features
        featured: product.featured || false,
        bestseller: product.bestseller || false,
        is_new: product.isNew || false,
        in_stock: product.inStock !== false,

        // Ratings
        rating: product.rating || 0,
        reviews_count: product.reviews || 0
      };

      const { data, error } = await supabase
        .from('products')
        .upsert(productData, { onConflict: 'slug' })
        .select();

      if (error) {
        console.error(`  ❌ Error migrating product "${product.name}":`, error.message);
        errorCount++;
      } else {
        console.log(`  ✓ Migrated: ${product.name} (${product.slug})`);
        successCount++;
      }
    }

    console.log(`\n✅ Products: ${successCount} migrated, ${errorCount} errors\n`);
  } else {
    console.log('  ⚠️  No products found to migrate\n');
  }

  // ========================================================================
  // Step 3: Verify Migration
  // ========================================================================
  console.log('🔍 Verifying migration...');

  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('*');

  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('*');

  if (!catError && !prodError) {
    console.log(`\n✅ Migration Complete!`);
    console.log(`   Categories in database: ${categories.length}`);
    console.log(`   Products in database: ${products.length}`);
    console.log('\n📝 Next steps:');
    console.log('   1. Update supabase-adapter.js: Set USE_SUPABASE = true');
    console.log('   2. Reload your website');
    console.log('   3. Products will now load from Supabase\n');
  } else {
    console.error('❌ Verification failed:', catError || prodError);
  }

})();
