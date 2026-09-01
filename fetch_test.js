require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const id = '0aef7929-a9ff-4b4a-81ce-90262fc07e4b';
  const { data, error } = await supabase
    .from('shelf_products')
    .select('*, category:shelf_categories(name), product_categories:shelf_product_categories(category_id, is_primary, category:shelf_categories(name)), shelf_skus(id, stock_quantity, low_stock_threshold, is_available)')
    .eq('id', id)
    .maybeSingle();
    
  console.log('Error:', error);
  console.log('Data:', JSON.stringify(data, null, 2));
}

run();
