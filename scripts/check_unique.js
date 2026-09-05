const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT conname, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    WHERE conrelid = 'whatsapp_messages'::regclass
      AND contype = 'u'
  `);
  console.log("Unique constraints:", res.rows);
  await client.end();
}
run();
