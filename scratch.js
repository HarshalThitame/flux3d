const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log('Fetching existing data...');
  
  // Get 'Lighting & Lamps' category id
  const { data: lightingCat } = await supabase
    .from('shelf_categories')
    .select('*')
    .eq('slug', 'lighting-lamps')
    .single();

  if (!lightingCat) {
    console.error('Could not find Lighting & Lamps category');
    return;
  }

  // Create new subcategories
  console.log('Creating new subcategories...');
  const newCategories = [
    { name: 'Table Lamps', slug: 'table-lamps', description: 'Beautifully designed table lamps for desks, nightstands, and living rooms.', icon_emoji: '🏮', parent_category_id: lightingCat.id, is_active: true },
    { name: 'Pendant Lights', slug: 'pendant-lights', description: 'Hanging pendant lights and ceiling lamps for dramatic lighting.', icon_emoji: '💡', parent_category_id: lightingCat.id, is_active: true },
    { name: 'Smart Home Lighting', slug: 'smart-lighting', description: 'App-controlled RGB smart lights compatible with Alexa and Google Home.', icon_emoji: '📱', parent_category_id: lightingCat.id, is_active: true },
  ];

  const { data: insertedCats, error: catErr } = await supabase
    .from('shelf_categories')
    .upsert(newCategories, { onConflict: 'slug' })
    .select();

  if (catErr) {
    console.error('Failed to create subcategories', catErr);
    return;
  }
  
  const tableLamps = insertedCats.find(c => c.slug === 'table-lamps');
  const pendantLights = insertedCats.find(c => c.slug === 'pendant-lights');
  const smartLighting = insertedCats.find(c => c.slug === 'smart-lighting');

  // Fetch products
  const { data: products } = await supabase.from('shelf_products').select('*');
  
  console.log('Categorizing products...');
  for (const product of products) {
    const categoriesToLink = [];
    const name = product.name.toLowerCase();
    
    // Categorize based on keywords
    if (name.includes('table lamp')) {
      categoriesToLink.push(tableLamps.id);
    }
    if (name.includes('pendant')) {
      categoriesToLink.push(pendantLights.id);
    }
    if (name.includes('smart') || name.includes('rgb')) {
      categoriesToLink.push(smartLighting.id);
    }
    
    // Always keep them in the parent Lighting & Lamps too (as secondary)
    // Wait, the migration already linked them to Lighting & Lamps as primary!
    // We just need to insert new rows for the subcategories.
    for (const catId of categoriesToLink) {
      if (!catId) continue;
      
      const { error: linkErr } = await supabase
        .from('shelf_product_categories')
        .upsert({
          product_id: product.id,
          category_id: catId,
          is_primary: false // Secondary categories
        }, { onConflict: 'product_id,category_id' });
        
      if (linkErr) {
        console.error(`Failed to link ${product.name} to cat ${catId}:`, linkErr.message);
      } else {
        console.log(`Linked "${product.name}" to category ID: ${catId}`);
      }
    }
  }
  
  console.log('Done!');
}

run();
