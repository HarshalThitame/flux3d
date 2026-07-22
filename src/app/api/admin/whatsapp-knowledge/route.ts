import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { logAdminAction } from '@/lib/admin/auditLog'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import {
  normalizeWhatsAppKnowledgeSourceKey,
  parseWhatsAppKnowledgeTags,
} from '@/lib/admin/whatsapp-knowledge'
import { generateWhatsAppEmbedding, getWhatsappKnowledgeSeed, toKnowledgeChunk } from '@/lib/whatsapp-rag'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type KnowledgeRow = {
  id: string
  source_key: string
  title: string
  content: string
  tags: string[] | null
  priority: number | null
  active: boolean | null
  created_at: string | null
  updated_at: string | null
}

type KnowledgePayload = {
  id?: string
  sourceKey?: string
  title?: string
  content?: string
  tags?: string[] | string
  priority?: number | string
  active?: boolean | string
}

function normalizePayload(body: KnowledgePayload) {
  const sourceKey = normalizeWhatsAppKnowledgeSourceKey(String(body.sourceKey ?? '').trim())
  const title = String(body.title ?? '').trim()
  const content = String(body.content ?? '').trim()
  const tags = parseWhatsAppKnowledgeTags(body.tags ?? '')
  const priorityValue = Number(body.priority ?? 0)
  const priority = Number.isFinite(priorityValue) ? priorityValue : 0
  const active = typeof body.active === 'boolean' ? body.active : String(body.active ?? 'true') !== 'false'

  if (!sourceKey) {
    throw new Error('Source key is required.')
  }

  if (!title) {
    throw new Error('Title is required.')
  }

  if (!content) {
    throw new Error('Content is required.')
  }

  return {
    source_key: sourceKey,
    title,
    content,
    tags,
    priority,
    active,
  }
}

async function loadKnowledgeChunks() {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('whatsapp_knowledge_chunks')
    .select('id, source_key, title, content, tags, priority, active, created_at, updated_at')
    .order('priority', { ascending: false })
    .order('updated_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => toKnowledgeChunk(row as any))
}

export async function GET() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const chunks = await loadKnowledgeChunks()
    return NextResponse.json({
      chunks,
      seedCount: getWhatsappKnowledgeSeed().length,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const body = (await request.json()) as KnowledgePayload
    const payload = normalizePayload(body)
    const supabase = createAdminSupabaseClient()

    const { data: existing, error: existingError } = await supabase
      .from('whatsapp_knowledge_chunks')
      .select('id')
      .eq('source_key', payload.source_key)
      .maybeSingle()

    if (existingError) {
      throw existingError
    }

    if (existing) {
      return NextResponse.json({ error: 'Source key already exists.' }, { status: 409 })
    }

    const embedding = await generateWhatsAppEmbedding(payload.content)
    const { data, error } = await supabase
      .from('whatsapp_knowledge_chunks')
      .insert({
        ...payload,
        embedding,
      })
      .select('id, source_key, title, content, tags, priority, active, created_at, updated_at')
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error('Failed to create knowledge chunk.')
    }

    const chunk = toKnowledgeChunk(data as any)
    await logAdminAction({
      admin_id: auth.user.id,
      action: 'create_whatsapp_knowledge',
      target_type: 'whatsapp_knowledge',
      target_id: chunk.id,
      old_value: null,
      new_value: chunk as Record<string, unknown>,
    })

    return NextResponse.json({ chunk }, { status: 201 })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const body = (await request.json()) as KnowledgePayload
    if (!body.id) {
      return NextResponse.json({ error: 'Chunk id is required.' }, { status: 400 })
    }

    const payload = normalizePayload(body)
    const supabase = createAdminSupabaseClient()
    const { data: oldChunk, error: oldChunkError } = await supabase
      .from('whatsapp_knowledge_chunks')
      .select('id, source_key, title, content, tags, priority, active, created_at, updated_at')
      .eq('id', body.id)
      .maybeSingle()

    if (oldChunkError) {
      throw oldChunkError
    }

    if (!oldChunk) {
      return NextResponse.json({ error: 'Chunk not found.' }, { status: 404 })
    }

    const { data: conflict, error: conflictError } = await supabase
      .from('whatsapp_knowledge_chunks')
      .select('id')
      .eq('source_key', payload.source_key)
      .neq('id', body.id)
      .maybeSingle()

    if (conflictError) {
      throw conflictError
    }

    if (conflict) {
      return NextResponse.json({ error: 'Source key already exists.' }, { status: 409 })
    }

    const embedding = await generateWhatsAppEmbedding(payload.content)
    const { data, error } = await supabase
      .from('whatsapp_knowledge_chunks')
      .update({
        ...payload,
        embedding,
      })
      .eq('id', body.id)
      .select('id, source_key, title, content, tags, priority, active, created_at, updated_at')
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error('Failed to update knowledge chunk.')
    }

    const chunk = toKnowledgeChunk(data as any)
    await logAdminAction({
      admin_id: auth.user.id,
      action: 'update_whatsapp_knowledge',
      target_type: 'whatsapp_knowledge',
      target_id: chunk.id,
      old_value: oldChunk,
      new_value: chunk as Record<string, unknown>,
    })

    return NextResponse.json({ chunk })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const body = (await request.json()) as KnowledgePayload
    if (!body.id) {
      return NextResponse.json({ error: 'Chunk id is required.' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const { data: oldChunk, error: oldChunkError } = await supabase
      .from('whatsapp_knowledge_chunks')
      .select('id, source_key, title, content, tags, priority, active, created_at, updated_at')
      .eq('id', body.id)
      .maybeSingle()

    if (oldChunkError) {
      throw oldChunkError
    }

    if (!oldChunk) {
      return NextResponse.json({ error: 'Chunk not found.' }, { status: 404 })
    }

    const { error } = await supabase.from('whatsapp_knowledge_chunks').delete().eq('id', body.id)
    if (error) {
      throw error
    }

    await logAdminAction({
      admin_id: auth.user.id,
      action: 'delete_whatsapp_knowledge',
      target_type: 'whatsapp_knowledge',
      target_id: body.id,
      old_value: oldChunk,
      new_value: null,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
