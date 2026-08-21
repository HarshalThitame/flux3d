const { Client } = require('pg')

const connectionString = process.env.SUPABASE_DB_URL
if (!connectionString) {
  console.error('Usage: SUPABASE_DB_URL="postgresql://..." node scripts/verify-migration.js')
  process.exit(1)
}

async function run() {
  const client = new Client({ connectionString })
  try {
    await client.connect()
    console.log('Connected to Supabase.')

    // Check direction column
    const dirRes = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'support_ticket_messages' AND column_name = 'direction'
    `)
    console.log('direction column:', dirRes.rows[0] || 'NOT FOUND')

    // Check order_id column
    const orderRes = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'support_tickets' AND column_name = 'order_id'
    `)
    console.log('order_id column:', orderRes.rows[0] || 'NOT FOUND')

    // Check support_ticket_events table
    const eventsRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'support_ticket_events'
    `)
    console.log('support_ticket_events table:', eventsRes.rows[0] || 'NOT FOUND')

    // Check unique index
    const idxRes = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'support_ticket_messages' AND indexname = 'idx_support_ticket_messages_resend_email_id_unique'
    `)
    console.log('unique index:', idxRes.rows[0] ? 'EXISTS' : 'NOT FOUND')

    // Check trigger
    const trigRes = await client.query(`
      SELECT trigger_name
      FROM information_schema.triggers
      WHERE trigger_name = 'trg_support_tickets_event_log'
    `)
    console.log('audit trigger:', trigRes.rows[0] || 'NOT FOUND')

    // Check RPC function
    const rpcRes = await client.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public' AND routine_name = 'support_avg_first_response_time'
    `)
    console.log('RPC function:', rpcRes.rows[0] || 'NOT FOUND')

    console.log('\nAll checks complete.')
  } catch (err) {
    console.error('Verification failed:', err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

run()
