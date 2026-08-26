import { Client } from 'pg'
import { readFileSync } from 'fs'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

const file = process.argv[2]
if (!file) {
  console.error('Usage: node run-migration.mjs <sql-file>')
  process.exit(1)
}

const sql = readFileSync(file, 'utf8')
const client = new Client({ connectionString })

await client.connect()
try {
  await client.query(sql)
  console.log('Migration applied successfully')
} catch (err) {
  console.error('Migration failed:', err.message)
  process.exit(1)
} finally {
  await client.end()
}
