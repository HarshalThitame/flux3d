import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdminRequest } from '@/lib/admin/request'

export async function GET() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  if (process.env.ADMIN_DEBUG_MODE !== 'true') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ 
        error: 'Missing Supabase config',
      }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    const { error: materialsError } = await supabase
      .from('materials')
      .select('*')
      .limit(1)

    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_schema')
      .eq('table_schema', 'public')
      .eq('table_name', 'materials')
      .maybeSingle()

    return NextResponse.json({
      materialsTableExists: !tableError && !!tableInfo,
      materialsQueryError: materialsError?.message ?? null,
      hint: materialsError?.message?.includes('Could not find the table') 
        ? 'Run supabase/auth-schema.sql in SQL Editor, then restart Next.js server'
        : null,
    })

  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal error' 
    }, { status: 500 })
  }
}
