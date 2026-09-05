const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function run() {
  await client.connect();
  const res = await client.query("SELECT id, email, is_admin FROM profiles WHERE is_admin = true");
  console.log("Admins:", res.rows);
  await client.end();
}
run();
