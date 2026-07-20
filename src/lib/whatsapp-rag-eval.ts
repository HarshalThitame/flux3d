import type { WhatsAppKnowledgeChunk } from '@/lib/whatsapp-rag'

export type WhatsAppRagEvalCase = {
  id: string
  question: string
  expectedSourceKeys: string[]
  requiredFacts: string[]
  forbiddenClaims?: string[]
  responseKind: 'answer' | 'clarify'
  maxAnswerChars?: number
}

export type WhatsAppRagEvalResult = {
  sourceCoverage: number
  factCoverage: number
  forbiddenClaimsPassed: boolean
  structurePassed: boolean
  passed: boolean
  matchedSourceKeys: string[]
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(/\s+/g)
    .map((token) => {
      if (['ship', 'ships', 'shipped', 'shipping'].includes(token)) return 'shipping'
      if (['deliver', 'delivers', 'delivered', 'delivery'].includes(token)) return 'delivery'
      if (['quote', 'quotation', 'quoted'].includes(token)) return 'quote'
      if (['price', 'pricing', 'cost', 'costs', 'costing'].includes(token)) return 'pricing'
      if (['international', 'internationally'].includes(token)) return 'international'
      if (['confirm', 'confirmed', 'confirmation'].includes(token)) return 'confirm'
      return token
    })
    .filter((token) => token.length > 2)
}

function chunkTokens(chunk: Pick<WhatsAppKnowledgeChunk, 'title' | 'content' | 'tags'>) {
  return new Set(tokenize([chunk.title, chunk.content, ...(chunk.tags ?? [])].join(' ')))
}

export function rankWhatsAppKnowledgeChunksOffline(
  question: string,
  corpus: WhatsAppKnowledgeChunk[],
  limit = 4
) {
  const questionTokens = tokenize(question)
  const tokenSet = new Set(questionTokens)

  return corpus
    .map((chunk) => {
      const tokens = chunkTokens(chunk)
      let overlap = 0
      for (const token of questionTokens) {
        if (tokens.has(token)) overlap += 1
      }
      const titleBoost = tokenize(chunk.title).some((token) => tokenSet.has(token)) ? 1.5 : 0
      const tagBoost = (chunk.tags ?? []).some((tag) => tokenSet.has(normalizeText(tag))) ? 1 : 0
      return {
        chunk,
        score: overlap + titleBoost + tagBoost + chunk.priority * 0.02,
      }
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
}

export function buildGoldenAnswerOutline(testCase: WhatsAppRagEvalCase) {
  if (testCase.responseKind === 'clarify') {
    return [
      'Hi, thanks for reaching out to Flux3D.',
      'Please share the minimum details needed so I can confirm the answer.',
      ...testCase.requiredFacts.map((fact) => `- ${fact}`),
    ].join('\n')
  }

  return [
    'Hi, thanks for reaching out to Flux3D.',
    ...testCase.requiredFacts.map((fact) => `- ${fact}`),
    'Please share any missing file, quantity, or deadline details if you want a confirmed next step.',
  ].join('\n')
}

export function scoreWhatsAppRagCase(
  testCase: WhatsAppRagEvalCase,
  answerText: string,
  matchedSourceKeys: string[]
): WhatsAppRagEvalResult {
  const normalizedAnswer = normalizeText(answerText)
  const sourceHits = testCase.expectedSourceKeys.filter((key) => matchedSourceKeys.includes(key))
  const sourceCoverage = testCase.expectedSourceKeys.length
    ? sourceHits.length / testCase.expectedSourceKeys.length
    : 1
  const factHits = testCase.requiredFacts.filter((fact) => normalizedAnswer.includes(normalizeText(fact)))
  const factCoverage = testCase.requiredFacts.length ? factHits.length / testCase.requiredFacts.length : 1
  const forbiddenClaimsPassed = (testCase.forbiddenClaims ?? []).every(
    (claim) => !normalizedAnswer.includes(normalizeText(claim))
  )
  const structurePassed = answerText.length <= (testCase.maxAnswerChars ?? 1200) && answerText.split('\n').length <= 8
  const passed =
    sourceCoverage >= 1 &&
    factCoverage >= 0.8 &&
    forbiddenClaimsPassed &&
    structurePassed

  return {
    sourceCoverage,
    factCoverage,
    forbiddenClaimsPassed,
    structurePassed,
    passed,
    matchedSourceKeys: matchedSourceKeys.filter((key) => testCase.expectedSourceKeys.includes(key)),
  }
}
