const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function run() {
  await client.connect();
  const res = await client.query("SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime'");
  console.log("Realtime Tables:", res.rows);
  await client.end();
}
run();
