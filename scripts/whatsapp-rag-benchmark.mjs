import 'dotenv/config'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

const casesPath = path.join(root, 'src/data/whatsapp-rag-eval-cases.json')
const cases = JSON.parse(await fs.readFile(casesPath, 'utf8'))

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const openaiKey = process.env.OPENAI_API_KEY
const currentModel = process.env.WHATSAPP_OPENAI_MODEL?.trim() || 'gpt-4.1-mini'
const candidateModel = process.env.WHATSAPP_OPENAI_BENCHMARK_MODEL?.trim() || 'gpt-4.1'
const embeddingModel = process.env.WHATSAPP_EMBEDDING_MODEL?.trim() || 'text-embedding-3-small'
const priceTable = JSON.parse(process.env.WHATSAPP_OPENAI_TOKEN_PRICES_JSON ?? '{}')

if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
if (!openaiKey) throw new Error('Missing OPENAI_API_KEY.')

const supabase = createClient(url, key)
const openai = new OpenAI({ apiKey: openaiKey })

function normalize(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function estimateCost(modelName, usage) {
  const pricing = priceTable?.[modelName]
  if (!pricing || !usage) return null
  const inputRate = Number(pricing.inputPer1k ?? pricing.promptPer1k ?? 0)
  const outputRate = Number(pricing.outputPer1k ?? 0)
  if (!Number.isFinite(inputRate) || !Number.isFinite(outputRate)) return null
  return (usage.prompt_tokens / 1000) * inputRate + (usage.completion_tokens / 1000) * outputRate
}

function scoreAnswer(testCase, answerText) {
  const normalizedAnswer = normalize(answerText)
  const requiredHits = testCase.requiredFacts.filter((fact) => normalizedAnswer.includes(normalize(fact))).length
  const forbiddenPassed = (testCase.forbiddenClaims ?? []).every((claim) => !normalizedAnswer.includes(normalize(claim)))
  const structurePassed = answerText.length <= (testCase.maxAnswerChars ?? 1200) && answerText.split('\n').length <= 8
  return {
    groundedness: testCase.requiredFacts.length ? requiredHits / testCase.requiredFacts.length : 1,
    forbiddenPassed,
    structurePassed,
  }
}

async function getQueryEmbedding(text) {
  const response = await openai.embeddings.create({
    model: embeddingModel,
    input: text,
  })
  return response.data[0]?.embedding ?? []
}

async function getRetrievalContext(question) {
  const queryEmbedding = await getQueryEmbedding(question)
  const { data, error } = await supabase.rpc('match_whatsapp_knowledge_chunks', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_threshold: Number(process.env.WHATSAPP_RAG_MIN_SCORE ?? 0.3) || 0.3,
    match_count: Number(process.env.WHATSAPP_RAG_TOP_K ?? 4) || 4,
  })

  if (error) throw error
  const sources = Array.isArray(data) ? data : []
  const context = sources
    .map((source) => `Source: ${source.title}\n${source.content}`)
    .join('\n\n')

  return {
    context,
    sources,
  }
}

function buildPrompt(context) {
  return [
    'You are the WhatsApp assistant for Flux3D.',
    'Style: warm, polite, concise, and structured.',
    'Use only confirmed facts from the knowledge base.',
    'Do not guess or invent missing facts.',
    'Prefer 3 to 5 short bullets.',
    context ? `Relevant Flux3D knowledge base:\n${context}` : '',
  ].filter(Boolean).join('\n')
}

async function runModel(model, question, context) {
  const startedAt = Date.now()
  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    max_tokens: 180,
    messages: [
      { role: 'system', content: buildPrompt(context) },
      { role: 'user', content: `Customer message:\n${question}` },
    ],
  })

  const reply = completion.choices[0]?.message?.content?.trim() ?? ''
  return {
    model,
    reply,
    latencyMs: Date.now() - startedAt,
    usage: completion.usage ?? null,
    costUsd: estimateCost(model, completion.usage ?? null),
  }
}

const report = []

for (const testCase of cases) {
  const retrieval = await getRetrievalContext(testCase.question)
  const baseline = await runModel(currentModel, testCase.question, retrieval.context)
  const candidate = await runModel(candidateModel, testCase.question, retrieval.context)

  report.push({
    id: testCase.id,
    question: testCase.question,
    retrievalSources: retrieval.sources.map((source) => source.source_key ?? source.sourceKey ?? source.title),
    baseline: {
      ...baseline,
      score: scoreAnswer(testCase, baseline.reply),
    },
    candidate: {
      ...candidate,
      score: scoreAnswer(testCase, candidate.reply),
    },
  })
}

const summary = report.reduce((acc, item) => {
  acc.baselineGroundedness += item.baseline.score.groundedness
  acc.candidateGroundedness += item.candidate.score.groundedness
  acc.baselineLatencyMs += item.baseline.latencyMs
  acc.candidateLatencyMs += item.candidate.latencyMs
  acc.baselineCostUsd += item.baseline.costUsd ?? 0
  acc.candidateCostUsd += item.candidate.costUsd ?? 0
  return acc
}, {
  baselineGroundedness: 0,
  candidateGroundedness: 0,
  baselineLatencyMs: 0,
  candidateLatencyMs: 0,
  baselineCostUsd: 0,
  candidateCostUsd: 0,
})

const output = {
  total: report.length,
  currentModel,
  candidateModel,
  summary: {
    baselineGroundedness: summary.baselineGroundedness / report.length,
    candidateGroundedness: summary.candidateGroundedness / report.length,
    baselineLatencyMs: summary.baselineLatencyMs / report.length,
    candidateLatencyMs: summary.candidateLatencyMs / report.length,
    baselineCostUsd: summary.baselineCostUsd,
    candidateCostUsd: summary.candidateCostUsd,
  },
  cases: report,
}

console.log(JSON.stringify(output, null, 2))
