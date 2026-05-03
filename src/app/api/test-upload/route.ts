import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ 
        step: 'config', 
        error: 'Missing Supabase configuration',
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!serviceKey
      }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    // 1. Check bucket exists
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
    
    if (bucketError) {
      return NextResponse.json({ 
        step: 'list_buckets', 
        error: bucketError.message,
        code: bucketError.code 
      }, { status: 500 })
    }

    const quoteBucket = buckets?.find(b => b.name === 'quote-models')
    if (!quoteBucket) {
      return NextResponse.json({ 
        step: 'bucket_check', 
        error: 'quote-models bucket not found',
        buckets: buckets?.map(b => b.name) 
      }, { status: 404 })
    }

    // 2. Try to upload a test file
    const testContent = 'test upload content for 42704 diagnosis'
    const testFile = new File([testContent], 'test-42704.txt', { type: 'text/plain' })
    const testPath = `test-user-${Date.now()}/test-file.txt`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('quote-models')
      .upload(testPath, testFile, { upsert: true })

    if (uploadError) {
      return NextResponse.json({ 
        step: 'storage_upload',
        error: uploadError.message,
        errorDetails: uploadError,
        code: (uploadError as any).code,
        hint: 'This is the exact 42704 error. Check RLS policies on storage.objects'
      }, { status: 500 })
    }

    // 3. Clean up
    await supabase.storage.from('quote-models').remove([testPath])

    return NextResponse.json({ 
      success: true, 
      message: 'Test upload successful - no 42704 error',
      path: testPath 
    })

  } catch (error) {
    return NextResponse.json({ 
      step: 'unknown', 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
