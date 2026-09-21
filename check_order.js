const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:Extreme$9623023477@db.jqgaebdtuasenyojvbsi.supabase.co:5432/postgres',
});

async function run() {
  await client.connect();
  
  try {
    // First let's check the tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log("Tables:", res.rows.map(r => r.table_name));

    // Guessing table name might be orders or instant_orders
    for (const table of ['orders', 'instant_orders', 'users', 'customers']) {
      if (res.rows.find(r => r.table_name === table)) {
        try {
            const tableData = await client.query(`SELECT * FROM ${table} ORDER BY created_at DESC LIMIT 5`);
            console.log(`\nRecent ${table}:`, JSON.stringify(tableData.rows, null, 2));
        } catch (e) {
            console.log(`Error querying ${table}:`, e.message);
        }
      }
    }

  } finally {
    await client.end();
  }
}

run().catch(console.error);
