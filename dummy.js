const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8').split('\n');
let SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY;
env.forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) SUPABASE_URL = line.split('=')[1].replace(/"/g, '');
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) SUPABASE_SERVICE_ROLE_KEY = line.split('=')[1].replace(/"/g, '');
});

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
supabase.from('business_settings').select('*').limit(1).single().then(({data, error}) => {
  if (error) console.error("Error", error);
  else {
    console.log("slicer_service_url:", data.slicer_service_url);
    console.log("slicer_service_enabled:", data.slicer_service_enabled);
  }
});
