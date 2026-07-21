import OpenAI from 'openai'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import knowledgeSeed from '@/data/whatsapp-knowledge.json'

const EMBEDDING_MODEL = process.env.WHATSAPP_EMBEDDING_MODEL?.trim() || 'text-embedding-3-small'
const RAG_TOP_K = Math.max(1, Number(process.env.WHATSAPP_RAG_TOP_K ?? 4) || 4)
const RAG_MIN_SCORE = Number(process.env.WHATSAPP_RAG_MIN_SCORE ?? 0.3) || 0.3

let openaiClient: OpenAI | null = null
function getRagOpenAI() {
  if (!openaiClient && process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openaiClient
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

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
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

function toKnowledgeChunk(row: KnowledgeRow): WhatsAppKnowledgeChunk {
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

  const databaseChunks = await listWhatsAppKnowledgeChunks()
  const activeDatabaseChunks = databaseChunks.filter((chunk) => chunk.active)

  if (activeDatabaseChunks.length > 0) {
    const rpcMatches = await searchDatabaseKnowledge(queryEmbedding)
    const matchedSources = rpcMatches.length > 0
      ? rpcMatches.map((match) => ({
          sourceKey: match.sourceKey,
          title: match.title,
          score: Number(match.score.toFixed(3)),
          content: match.content,
        }))
      : scoreCorpus(activeDatabaseChunks, queryEmbedding).map(({ chunk, score }) => ({
          sourceKey: chunk.sourceKey,
          title: chunk.title,
          score: Number(score.toFixed(3)),
          content: chunk.content,
        }))

    return buildRagContextResult(matchedSources, 'database')
  }

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

export function getWhatsappKnowledgeSeed() {
  return knowledgeSeed as WhatsAppKnowledgeSeed[]
}
