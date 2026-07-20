import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

const knowledgePath = path.join(root, 'src/data/whatsapp-knowledge.json')
const knowledge = JSON.parse(await fs.readFile(knowledgePath, 'utf8'))

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const openaiKey = process.env.OPENAI_API_KEY
const model = process.env.WHATSAPP_EMBEDDING_MODEL?.trim() || 'text-embedding-3-small'

if (!url || !key) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
}

if (!openaiKey) {
  throw new Error('Missing OPENAI_API_KEY.')
}

const supabase = createClient(url, key)
const openai = new OpenAI({ apiKey: openaiKey })

const { data: embeddings } = await openai.embeddings.create({
  model,
  input: knowledge.map((item) => item.content),
})

const rows = knowledge.map((item, index) => ({
  source_key: item.sourceKey,
  title: item.title,
  content: item.content,
  tags: item.tags,
  priority: item.priority,
  embedding: embeddings[index].embedding,
  active: true,
}))

const { error } = await supabase.from('whatsapp_knowledge_chunks').upsert(rows, {
  onConflict: 'source_key',
})

if (error) {
  throw error
}

console.log(`Synced ${rows.length} WhatsApp knowledge chunks.`)
