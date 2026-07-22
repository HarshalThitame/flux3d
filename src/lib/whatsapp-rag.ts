import OpenAI from 'openai'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import knowledgeSeed from '@/data/whatsapp-knowledge.json'

const EMBEDDING_MODEL = process.env.WHATSAPP_EMBEDDING_MODEL?.trim() || 'text-embedding-3-small'
const RAG_TOP_K = Math.max(1, Number(process.env.WHATSAPP_RAG_TOP_K ?? 4) || 4)
const RAG_MIN_SCORE = Number(process.env.WHATSAPP_RAG_MIN_SCORE ?? 0.3) || 0.3

function getRagOpenAI() {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null
  return new OpenAI({ apiKey: key })
}

let seedCorpusPromise: Promise<WhatsAppKnowledgeChunk[]> | null = null

export type WhatsAppKnowledgeChunk = {
  id: string
  sourceKey: string
  title: string
  content: string
  tags: string[]
  priority: number
  active: boolean
  createdAt: string | null
  updatedAt: string | null
  embedding?: number[]
}

type WhatsAppKnowledgeSeed = {
  sourceKey: string
  title: string
  content: string
  tags: string[]
  priority: number
}

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
  embedding: string | number[] | null
}

type KnowledgeMatchRow = {
  id: string
  source_key: string
  title: string
  content: string
  tags: string[] | null
  priority: number | null
  active: boolean | null
  created_at: string | null
  updated_at: string | null
  similarity: number | string | null
}

export type WhatsAppKnowledgeChunkRecord = {
  id: string
  sourceKey: string
  title: string
  content: string
  tags: string[]
  priority: number
  active: boolean
  createdAt: string | null
  updatedAt: string | null
  embedding?: number[]
}

type RagContextResult = {
  context: string
  sources: Array<{
    sourceKey: string
    title: string
    score: number
    content: string
  }>
  mode: 'database' | 'seed' | 'none'
  confidence: number
}

let cachedServiceClient: any = null
function getServiceClient() {
  if (cachedServiceClient) return cachedServiceClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  cachedServiceClient = createClient(url, key)
  return cachedServiceClient
}

function parseVector(value: string | number[] | null | undefined): number[] {
  if (Array.isArray(value)) {
    return value.map((item) => Number(item)).filter((item) => Number.isFinite(item))
  }

  if (typeof value !== 'string') {
    return []
  }

  return value
    .replace(/^\s*\[/, '')
    .replace(/\]\s*$/, '')
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item))
}

function cosineSimilarity(left: number[], right: number[]) {
  if (!left.length || left.length !== right.length) return 0

  let dot = 0
  let leftNorm = 0
  let rightNorm = 0

  for (let i = 0; i < left.length; i += 1) {
    const l = left[i]
    const r = right[i]
    dot += l * r
    leftNorm += l * l
    rightNorm += r * r
  }

  if (leftNorm === 0 || rightNorm === 0) return 0
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm))
}

export function toKnowledgeChunk(row: KnowledgeRow): WhatsAppKnowledgeChunk {
  return {
    id: row.id,
    sourceKey: row.source_key,
    title: row.title,
    content: row.content,
    tags: row.tags ?? [],
    priority: Number(row.priority ?? 0),
    active: Boolean(row.active ?? true),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    embedding: parseVector(row.embedding),
  }
}

function toMatchSource(row: KnowledgeMatchRow) {
  return {
    id: row.id,
    sourceKey: row.source_key,
    title: row.title,
    content: row.content,
    tags: row.tags ?? [],
    priority: Number(row.priority ?? 0),
    active: Boolean(row.active ?? true),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    score: Number(row.similarity ?? 0),
  }
}

async function generateEmbeddings(texts: string[]) {
  const client = getRagOpenAI()
  if (!client) {
    console.warn('[rag] Missing OpenAI API key — embeddings unavailable')
    return texts.map(() => [])
  }

  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  })

  return response.data.map((item) => item.embedding)
}

export async function generateWhatsAppEmbedding(text: string) {
  const [embedding] = await generateEmbeddings([text])
  return embedding ?? []
}

function scoreCorpus(
  corpus: WhatsAppKnowledgeChunk[],
  queryEmbedding: number[]
): Array<{
  chunk: WhatsAppKnowledgeChunk
  score: number
}> {
  return corpus
    .filter((chunk) => Array.isArray(chunk.embedding) && chunk.embedding.length > 0)
    .map((chunk) => ({
      chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding!) + chunk.priority * 0.01,
    }))
    .filter(({ score }) => score >= RAG_MIN_SCORE)
    .sort((left, right) => right.score - left.score)
    .slice(0, RAG_TOP_K)
}

async function searchDatabaseKnowledge(queryEmbedding: number[]) {
  const supabase = getServiceClient()
  if (!supabase) return [] as Array<ReturnType<typeof toMatchSource>>

  const { data, error } = await supabase.rpc('match_whatsapp_knowledge_chunks', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_threshold: RAG_MIN_SCORE,
    match_count: RAG_TOP_K,
  })

  if (error || !Array.isArray(data)) {
    return [] as Array<ReturnType<typeof toMatchSource>>
  }

  return data.map((row) => toMatchSource(row as KnowledgeMatchRow))
}

export async function listWhatsAppKnowledgeChunks(): Promise<WhatsAppKnowledgeChunkRecord[]> {
  const supabase = getServiceClient()
  if (!supabase) {
    return []
  }

  const { data, error } = await supabase
    .from('whatsapp_knowledge_chunks')
    .select('id, source_key, title, content, tags, priority, active, created_at, updated_at, embedding')
    .order('priority', { ascending: false })
    .order('updated_at', { ascending: false })

  if (error || !Array.isArray(data)) {
    return []
  }

  return data.map((row) => toKnowledgeChunk(row as KnowledgeRow))
}

async function loadSeedCorpus(): Promise<WhatsAppKnowledgeChunk[]> {
  if (seedCorpusPromise) {
    return seedCorpusPromise
  }

  seedCorpusPromise = (async () => {
    const localDocs = knowledgeSeed as WhatsAppKnowledgeSeed[]
    const embeddings = await generateEmbeddings(localDocs.map((doc) => doc.content))

    return localDocs.map((doc, index) => ({
      id: doc.sourceKey,
      ...doc,
      active: true,
      createdAt: null,
      updatedAt: null,
      embedding: embeddings[index] ?? [],
    }))
  })().catch((error) => {
    console.error('[rag] Failed to load seed corpus:', error)
    seedCorpusPromise = null // Allow retry on next call
    return []
  })

  return seedCorpusPromise
}

function buildRagContextResult(
  sources: Array<{
    sourceKey: string
    title: string
    score: number
    content: string
  }>,
  mode: 'database' | 'seed'
): RagContextResult {
  if (sources.length === 0) {
    return { context: '', sources: [], mode: 'none', confidence: 0 }
  }

  const context = sources
    .map((source, index) => `${index + 1}. ${source.title}: ${source.content}`)
    .join('\n')

  return {
    context,
    sources,
    mode,
    confidence: Number(sources[0]?.score.toFixed(3) ?? 0),
  }
}

export async function getWhatsAppRagContext(query: string): Promise<RagContextResult> {
  if (!query.trim() || !process.env.OPENAI_API_KEY) {
    return { context: '', sources: [], mode: 'none', confidence: 0 }
  }

  const [queryEmbedding] = await generateEmbeddings([query])
  if (!queryEmbedding) {
    return { context: '', sources: [], mode: 'none', confidence: 0 }
  }

  // Try DB RPC first (efficient HNSW index search, no full-table-scan)
  const rpcMatches = await searchDatabaseKnowledge(queryEmbedding)
  if (rpcMatches.length > 0) {
    const matchedSources = rpcMatches.map((match) => ({
      sourceKey: match.sourceKey,
      title: match.title,
      score: Number(match.score.toFixed(3)),
      content: match.content,
    }))
    return buildRagContextResult(matchedSources, 'database')
  }

  // RPC returned no matches — load chunks for in-memory fallback (only when DB has data)
  const databaseChunks = await listWhatsAppKnowledgeChunks()
  const activeDatabaseChunks = databaseChunks.filter((chunk) => chunk.active)
  if (activeDatabaseChunks.length > 0) {
    const scored = scoreCorpus(activeDatabaseChunks, queryEmbedding).map(({ chunk, score }) => ({
      sourceKey: chunk.sourceKey,
      title: chunk.title,
      score: Number(score.toFixed(3)),
      content: chunk.content,
    }))
    return buildRagContextResult(scored, 'database')
  }

  // DB table is empty — fall back to seed corpus
  console.warn('[rag] whatsapp_knowledge_chunks table is empty — using seed corpus. Run sync-whatsapp-knowledge to populate it.')
  const seedCorpus = await loadSeedCorpus()
  const scored = scoreCorpus(seedCorpus, queryEmbedding).map(({ chunk, score }) => ({
    sourceKey: chunk.sourceKey,
    title: chunk.title,
    score: Number(score.toFixed(3)),
    content: chunk.content,
  }))

  return buildRagContextResult(scored, 'seed')
}

export async function syncWhatsAppKnowledgeChunks() {
  const supabase = getServiceClient()
  if (!supabase) {
    throw new Error('Missing Supabase service role configuration.')
  }

  const docs = knowledgeSeed as WhatsAppKnowledgeSeed[]
  const embeddings = await generateEmbeddings(docs.map((doc) => doc.content))

  const rows = docs.map((doc, index) => ({
    source_key: doc.sourceKey,
    title: doc.title,
    content: doc.content,
    tags: doc.tags,
    priority: doc.priority,
    embedding: embeddings[index],
    active: true,
  }))

  const { error } = await supabase.from('whatsapp_knowledge_chunks').upsert(rows, {
    onConflict: 'source_key',
  })

  if (error) {
    throw error
  }
}

export async function syncProductKnowledgeChunks() {
  const supabase = getServiceClient()
  if (!supabase) {
    throw new Error('Missing Supabase service role configuration.')
  }

  const chunks: WhatsAppKnowledgeSeed[] = []

  // Fetch all active materials
  const { data: materials, error: materialError } = await supabase
    .from('materials')
    .select('id, name, summary, best_for, key_properties, price_per_unit, price_per_gram, sample_photo')

  if (materialError) {
    console.error('[rag] Failed to fetch materials for sync:', materialError)
  } else if (materials?.length) {
    for (const m of materials) {
      const price = m.price_per_unit || m.price_per_gram
      const priceStr = price ? `starting at ₹${Number(price).toFixed(2)}` : 'contact for pricing'
      chunks.push({
        sourceKey: `material_${m.id}`,
        title: `${m.name} — 3D Printing Material`,
        content: `${m.name} is a 3D printing material ${priceStr}. ${m.summary ?? ''}${m.best_for?.length ? ` Best for: ${Array.isArray(m.best_for) ? m.best_for.join(', ') : m.best_for}.` : ''}${m.key_properties?.length ? ` Properties: ${Array.isArray(m.key_properties) ? m.key_properties.join(', ') : m.key_properties}.` : ''}`,
        tags: ['material', m.name?.toLowerCase() ?? ''],
        priority: 7,
      })
    }
  }

  // Fetch all active products
  const { data: products, error: productError } = await supabase
    .from('shelf_products')
    .select('id, name, description, base_price, tags, category_id')
    .eq('is_active', true)
    .eq('is_archived', false)

  if (productError) {
    console.error('[rag] Failed to fetch products for sync:', productError)
  } else if (products?.length) {
    for (const p of products) {
      chunks.push({
        sourceKey: `product_${p.id}`,
        title: `${p.name} — 3D Printed Product`,
        content: `${p.name} — ₹${Number(p.base_price).toFixed(2)}. ${p.description ?? ''}${p.tags?.length ? ` Tags: ${Array.isArray(p.tags) ? p.tags.join(', ') : p.tags}.` : ''}`,
        tags: ['product', ...(Array.isArray(p.tags) ? p.tags : [])],
        priority: 6,
      })
    }
  }

  if (!chunks.length) {
    return { syncedCount: 0, source: 'product_sync' }
  }

  const embeddings = await generateEmbeddings(chunks.map((c) => c.content))

  const rows = chunks.map((chunk, index) => ({
    source_key: chunk.sourceKey,
    title: chunk.title,
    content: chunk.content,
    tags: chunk.tags,
    priority: chunk.priority,
    embedding: embeddings[index],
    active: true,
  }))

  const { error } = await supabase.from('whatsapp_knowledge_chunks').upsert(rows, {
    onConflict: 'source_key',
  })

  if (error) {
    throw error
  }

  return { syncedCount: rows.length, source: 'product_sync' }
}

export function getWhatsappKnowledgeSeed() {
  return knowledgeSeed as WhatsAppKnowledgeSeed[]
}

export type OrderResult = {
  orderNumber: string
  status: string
  placedAt: string | null
  total: number
  items: number
}

export type StructuredDataResult = {
  materials: string
  products: string
  orderStatus: string
  orderResults: OrderResult[]
  totalMatches: number
  materialPrices: Array<{ name: string; price: number }>
  productPrices: Array<{ name: string; price: number }>
}

const EMPTY_STRUCTURED_RESULT = (): StructuredDataResult => ({
  materials: '', products: '', orderStatus: '', orderResults: [],
  totalMatches: 0, materialPrices: [], productPrices: [],
})

const NON_PRODUCT_KEYWORDS = new Set(['pricing', 'shipping', 'stock', 'delivery', 'courier', 'dispatch', 'track', 'tracking', 'available', 'availability'])

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '')
}

export async function fetchStructuredData(
  keywords: string[],
  intent: WhatsAppIntent,
  phoneNumber?: string,
): Promise<StructuredDataResult> {
  if (!keywords.length) {
    return EMPTY_STRUCTURED_RESULT()
  }

  const supabase = getServiceClient()
  if (!supabase) {
    return EMPTY_STRUCTURED_RESULT()
  }

  // Separate searchable keywords from intent descriptors
  const searchTerms = keywords.filter((k) => !NON_PRODUCT_KEYWORDS.has(k))
  if (!searchTerms.length) {
    return EMPTY_STRUCTURED_RESULT()
  }

  const ilikeConditions = searchTerms.map((k) => `name.ilike.%${k}%`)
  let materialsData = ''
  let productsData = ''
  let orderStatusData = ''
  let orderResults: OrderResult[] = []
  let materialPrices: Array<{ name: string; price: number }> = []
  let productPrices: Array<{ name: string; price: number }> = []
  let totalMatches = 0

  // Always query materials table when search terms are present
  const { data: materialData, error: materialError } = await supabase
    .from('materials')
    .select('name, price_per_unit, price_per_gram, summary, best_for, key_properties')
    .or(ilikeConditions.join(','))
    .limit(5)

  if (materialError) {
    console.error('[rag] Materials query failed:', materialError)
  } else if (materialData?.length) {
    const valid = materialData.filter((m: any) => {
      const price = m.price_per_unit || m.price_per_gram
      return price && Number(price) > 0
    })
    materialsData = valid
      .map((m: any) => {
        const price = m.price_per_unit || m.price_per_gram
        const formattedPrice = Number(price).toFixed(2)
        return `Material: ${m.name} | From ₹${formattedPrice} | ${m.summary ?? ''}`
      })
      .join('\n')
    materialPrices = valid.map((m: any) => ({
      name: m.name,
      price: Number(m.price_per_unit || m.price_per_gram),
    }))
    if (materialsData) totalMatches += materialData.length
  }

  // Query orders table when intent is 'order' or keywords contain order identifiers (e.g. order numbers)
  const isOrderQuery = intent === 'order' || searchTerms.some((k) => /^\d{4,}$/.test(k))
  if (isOrderQuery && supabase) {
    const orderNumber = searchTerms.find((k) => /^\d{4,}$/.test(k))

    // Resolve user_id from phone number to filter orders by the calling user
    let userId: string | null = null
    if (phoneNumber) {
      const normalizedPhone = normalizePhone(phoneNumber)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .or(`phone_number.eq.${normalizedPhone},phone_number.eq.+${normalizedPhone}`)
        .maybeSingle()
      userId = profile?.id ?? null
    }

    let orderQuery = supabase
      .from('shelf_orders')
      .select('order_number, order_status, total_amount, placed_at, items')

    if (userId) {
      orderQuery = orderQuery.eq('user_id', userId)
    }

    if (orderNumber) {
      orderQuery = orderQuery.ilike('order_number', `%${orderNumber}%`)
    }

    const { data: orderData } = await orderQuery
      .order('placed_at', { ascending: false })
      .limit(3)

    if (orderData?.length) {
      orderResults = orderData.map((o: any) => ({
        orderNumber: o.order_number,
        status: o.order_status,
        placedAt: o.placed_at,
        total: Number(o.total_amount) || 0,
        items: Array.isArray(o.items) ? o.items.length : 0,
      }))
      orderStatusData = orderResults
        .map((o) => `Order #${o.orderNumber} — Status: ${o.status} — Placed: ${o.placedAt ?? 'N/A'} — Total: ₹${o.total.toFixed(2)}`)
        .join('\n')
      totalMatches += orderData.length
    } else {
      orderStatusData = 'No orders found for this number.'
    }
  }

  // Always query shelf_products when search terms are present
  const { data: productData, error: productError } = await supabase
    .from('shelf_products')
    .select('name, base_price, description, tags, is_active')
    .or(ilikeConditions.join(','))
    .eq('is_active', true)
    .eq('is_archived', false)
    .limit(5)

  if (productError) {
    console.error('[rag] Products query failed:', productError)
  } else if (productData?.length) {
    const valid = productData.filter((p: any) => p.base_price && Number(p.base_price) > 0)
    productsData = valid
      .map((p: any) => {
        const formattedPrice = Number(p.base_price).toFixed(2)
        return `Product: ${p.name} | ₹${formattedPrice} | ${(p.description ?? '').slice(0, 100)}`
      })
      .join('\n')
    productPrices = valid.map((p: any) => ({
      name: p.name,
      price: Number(p.base_price),
    }))
    if (productsData) totalMatches += productData.length
  }

  return { materials: materialsData, products: productsData, orderStatus: orderStatusData, orderResults, totalMatches, materialPrices, productPrices }
}

export type WhatsAppIntent = 'pricing' | 'shipping' | 'order' | 'materials' | 'contact' | 'greeting' | 'general'
