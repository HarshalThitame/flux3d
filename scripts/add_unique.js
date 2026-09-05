const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function run() {
  await client.connect();
  try {
    await client.query(`ALTER TABLE whatsapp_messages ADD CONSTRAINT whatsapp_messages_meta_message_id_key UNIQUE (meta_message_id);`);
    console.log("Successfully added unique constraint");
  } catch (err) {
    console.error("Error:", err.message);
  }
  await client.end();
}
run();
