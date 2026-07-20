import { describe, expect, it } from 'vitest'
import knowledgeSeed from '@/data/whatsapp-knowledge.json'
import evalCases from '@/data/whatsapp-rag-eval-cases.json'
import type { WhatsAppKnowledgeChunk } from '@/lib/whatsapp-rag'
import {
  buildGoldenAnswerOutline,
  rankWhatsAppKnowledgeChunksOffline,
  scoreWhatsAppRagCase,
  type WhatsAppRagEvalCase,
} from '@/lib/whatsapp-rag-eval'

const corpus = knowledgeSeed as WhatsAppKnowledgeChunk[]

describe('WhatsApp offline RAG eval suite', () => {
  for (const testCase of evalCases as WhatsAppRagEvalCase[]) {
    it(`keeps ${testCase.id} grounded`, () => {
      const ranked = rankWhatsAppKnowledgeChunksOffline(testCase.question, corpus, 4)
      const answer = buildGoldenAnswerOutline(testCase)
      const scored = scoreWhatsAppRagCase(
        testCase,
        answer,
        ranked.map((item) => item.chunk.sourceKey)
      )

      expect(scored.passed, `${testCase.id} did not pass`).toBe(true)
      expect(scored.sourceCoverage).toBeGreaterThanOrEqual(testCase.expectedSourceKeys.length ? 1 : 0)
      expect(answer.length).toBeLessThanOrEqual(testCase.maxAnswerChars ?? 1200)
    })
  }
})
