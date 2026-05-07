import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdminRequest } from '@/lib/admin/request'

export async function GET() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ 
        error: 'Missing Supabase config',
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!serviceKey
      }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    // 1. Check if materials table exists
    await supabase
      .rpc('get_table_columns', { table_name: 'materials', schema_name: 'public' })
      .maybeSingle()

    // 2. Try direct query to materials table
    const { data: materials, error: materialsError } = await supabase
      .from('materials')
      .select('*')
      .limit(1)

    // 3. Check if table exists via information_schema
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_schema')
      .eq('table_schema', 'public')
      .eq('table_name', 'materials')
      .maybeSingle()

    return NextResponse.json({
      materialsTableExists: !tableError && !!tableInfo,
      materialsQuery: {
        data: materials,
        error: materialsError?.message,
        code: materialsError && typeof materialsError === 'object' && 'code' in materialsError
          ? String((materialsError as { code?: unknown }).code ?? '')
          : undefined
      },
      tableInfo,
      hint: materialsError?.message?.includes('Could not find the table') 
        ? 'Run supabase/auth-schema.sql in SQL Editor, then restart Next.js server'
        : 'Unknown error'
    })

  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}
