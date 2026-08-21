const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const connectionString = process.env.SUPABASE_DB_URL
if (!connectionString) {
  console.error('Usage: SUPABASE_DB_URL="postgresql://..." node scripts/run-migration.js [migration-file]')
  process.exit(1)
}

const migrationFile = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, '..', 'supabase/migrations/20260823000000_support_system_enterprise.sql')

async function run() {
  const client = new Client({ connectionString })
  try {
    await client.connect()
    console.log('Connected to Supabase.')

    const sql = fs.readFileSync(migrationFile, 'utf8')
    console.log(`Executing migration: ${path.basename(migrationFile)}`)

    await client.query(sql)
    console.log('Migration applied successfully.')
  } catch (err) {
    console.error('Migration failed:', err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

run()
