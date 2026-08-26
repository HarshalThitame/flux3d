import { Client } from 'pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

const client = new Client({ connectionString })
await client.connect()

try {
  const tables = ['orders', 'quotes', 'shelf_orders', 'payment_refunds', 'payment_events']
  for (const table of tables) {
    const { rows } = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
      [table]
    )
    console.log(`\n${table} columns:`)
    rows.forEach(r => console.log(`  - ${r.column_name}`))
  }
} catch (err) {
  console.error(err)
} finally {
  await client.end()
}
