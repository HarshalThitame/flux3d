require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabase
    .from('shelf_categories')
    .select('*');
    
  console.log('Categories:', data.length);
  console.log(data.map(c => `${c.name} (parent: ${c.parent_category_id})`));
}

run();
