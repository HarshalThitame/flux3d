const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jqgaebdtuasenyojvbsi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data: evts, error: err2 } = await supabase.from('whatsapp_webhook_events')
    .select('id, created_at, processed_at, payload')
    .order('created_at', { ascending: false })
    .limit(1);
  console.log('Recent Webhook Event:', JSON.stringify(evts, null, 2), err2);
}
run();
