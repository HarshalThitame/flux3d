const { Client } = require('pg')

const connectionString = process.env.SUPABASE_CONNECTION_STRING

if (!connectionString) {
  console.error('SUPABASE_CONNECTION_STRING env var is required')
  process.exit(1)
}

const normalized = connectionString.replace(/(.*[?&])?sslmode=[^&]*&?/g, '$1').replace(/[?&]$/, '')

const client = new Client({
  connectionString: normalized,
  ssl: { rejectUnauthorized: false },
})

async function run() {
  try {
    await client.connect()
    const res = await client.query(
      `UPDATE public.business_settings
       SET currency_symbol = '₹',
           updated_at = COALESCE(updated_at, now())
       WHERE currency_symbol IS DISTINCT FROM '₹'`,
    )
    console.log(`Updated ${res.rowCount} row(s)`)
  } catch (err) {
    console.error('Update failed:', err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

run()