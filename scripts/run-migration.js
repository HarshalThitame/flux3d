const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const connectionString = process.env.SUPABASE_CONNECTION_STRING

if (!connectionString) {
  console.error('SUPABASE_CONNECTION_STRING env var is required')
  process.exit(1)
}

const sqlFile = path.join(__dirname, '..', 'supabase', 'migrations', '20260728000000_email_system.sql')
const sql = fs.readFileSync(sqlFile, 'utf-8')

const client = new Client({ connectionString })

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
