import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdminRequest } from '@/lib/admin/request'

export async function POST() {
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
        error: 'Missing Supabase configuration',
      }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
    
    if (bucketError) {
      return NextResponse.json({ 
        error: 'Bucket listing failed: ' + bucketError.message
      }, { status: 500 })
    }

    const quoteBucket = buckets?.find(b => b.name === 'quote-models')
    if (!quoteBucket) {
      return NextResponse.json({ 
        error: 'quote-models bucket not found',
      }, { status: 404 })
    }

    const testContent = 'test upload content for 42704 diagnosis'
    const testFile = new File([testContent], 'test-42704.txt', { type: 'text/plain' })
    const testPath = `test-user-${Date.now()}/test-file.txt`

    const { error: uploadError } = await supabase.storage
      .from('quote-models')
      .upload(testPath, testFile, { upsert: true })

    if (uploadError) {
      return NextResponse.json({ 
        error: 'Storage upload failed: ' + uploadError.message,
      }, { status: 500 })
    }

    await supabase.storage.from('quote-models').remove([testPath])

    return NextResponse.json({ 
      success: true, 
    })

  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal error',
    }, { status: 500 })
  }
}
