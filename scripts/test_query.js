import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  const { data } = await supabase.rpc('execute_sql', { sql: "select tablename, policyname, cmd from pg_policies where tablename = 'addresses';" })
  console.log(data)
}
run()
