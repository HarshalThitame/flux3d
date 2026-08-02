const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const connectionString = process.env.SUPABASE_CONNECTION_STRING

if (!connectionString) {
  console.error('SUPABASE_CONNECTION_STRING env var is required')
  process.exit(1)
}

const migrationFile = process.argv[2] || '20260728000000_email_system.sql'
const sqlFile = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile)
const sql = fs.readFileSync(sqlFile, 'utf-8')

// Supabase's direct :5432 endpoint uses a self-signed certificate. node-postgres'
// connection-string parser treats sslmode=require as verify-full (rejecting it),
// so strip any sslmode param and enable SSL via the `ssl` option with
// rejectUnauthorized:false instead. The connection is still encrypted.
const normalized = connectionString.replace(/(.*[?&])?sslmode=[^&]*&?/g, '$1').replace(/[?&]$/, '')

const client = new Client({
  connectionString: normalized,
  ssl: { rejectUnauthorized: false },
})

async function run() {
  try {
    await client.connect()
    console.log('Connected to Supabase PostgreSQL')
    await client.query(sql)
    console.log('Migration applied successfully')
  } catch (err) {
    console.error('Migration failed:', err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

run()
