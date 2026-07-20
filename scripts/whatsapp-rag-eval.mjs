import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

const casesPath = path.join(root, 'src/data/whatsapp-rag-eval-cases.json')
const corpusPath = path.join(root, 'src/data/whatsapp-knowledge.json')

const cases = JSON.parse(await fs.readFile(casesPath, 'utf8'))
const corpus = JSON.parse(await fs.readFile(corpusPath, 'utf8'))

function normalize(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function tokenize(value) {
  return normalize(value).split(/\s+/g).map((token) => {
    if (['ship', 'ships', 'shipped', 'shipping'].includes(token)) return 'shipping'
    if (['deliver', 'delivers', 'delivered', 'delivery'].includes(token)) return 'delivery'
    if (['quote', 'quotation', 'quoted'].includes(token)) return 'quote'
    if (['price', 'pricing', 'cost', 'costs', 'costing'].includes(token)) return 'pricing'
    if (['international', 'internationally'].includes(token)) return 'international'
    if (['confirm', 'confirmed', 'confirmation'].includes(token)) return 'confirm'
    return token
  }).filter((token) => token.length > 2)
}

function scoreChunk(question, chunk) {
  const questionTokens = tokenize(question)
  const chunkTokens = new Set(tokenize([chunk.title, chunk.content, ...(chunk.tags ?? [])].join(' ')))
  let overlap = 0
  for (const token of questionTokens) {
    if (chunkTokens.has(token)) overlap += 1
  }
  return overlap + Number(chunk.priority ?? 0) * 0.02
}

function rankChunks(question, chunks, limit = 4) {
  return [...chunks]
    .map((chunk) => ({ chunk, score: scoreChunk(question, chunk) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

function scoreCase(testCase, answerText, matchedSourceKeys) {
  const normalizedAnswer = normalize(answerText)
  const sourceCoverage = testCase.expectedSourceKeys.length
    ? testCase.expectedSourceKeys.filter((key) => matchedSourceKeys.includes(key)).length / testCase.expectedSourceKeys.length
    : 1
  const factCoverage = testCase.requiredFacts.length
    ? testCase.requiredFacts.filter((fact) => normalizedAnswer.includes(normalize(fact))).length / testCase.requiredFacts.length
    : 1
  const forbiddenClaimsPassed = (testCase.forbiddenClaims ?? []).every((claim) => !normalizedAnswer.includes(normalize(claim)))
  const structurePassed = answerText.length <= (testCase.maxAnswerChars ?? 1200) && answerText.split('\n').length <= 8
  return {
    sourceCoverage,
    factCoverage,
    forbiddenClaimsPassed,
    structurePassed,
    passed: sourceCoverage >= 1 && factCoverage >= 0.8 && forbiddenClaimsPassed && structurePassed,
  }
}

function buildGoldenAnswerOutline(testCase) {
  if (testCase.responseKind === 'clarify') {
    return ['Hi, thanks for reaching out to Flux3D.', ...testCase.requiredFacts.map((fact) => `- ${fact}`)].join('\n')
  }
  return ['Hi, thanks for reaching out to Flux3D.', ...testCase.requiredFacts.map((fact) => `- ${fact}`)].join('\n')
}

const report = []
let passCount = 0

for (const testCase of cases) {
  const ranked = rankChunks(testCase.question, corpus, 4)
  const answer = buildGoldenAnswerOutline(testCase)
  const score = scoreCase(testCase, answer, ranked.map((item) => item.chunk.sourceKey))
  if (score.passed) passCount += 1
  report.push({
    id: testCase.id,
    question: testCase.question,
    matchedSourceKeys: ranked.map((item) => item.chunk.sourceKey),
    ...score,
  })
}

const output = {
  total: cases.length,
  passed: passCount,
  failed: cases.length - passCount,
  cases: report,
}

console.log(JSON.stringify(output, null, 2))

if (passCount !== cases.length) {
  process.exitCode = 1
}
