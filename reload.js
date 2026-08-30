const { Client } = require('pg');

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query("NOTIFY pgrst, 'reload schema'");
  await client.end();
}
run().catch(console.error);
