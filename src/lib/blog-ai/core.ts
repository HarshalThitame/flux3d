import 'server-only'

import OpenAI from 'openai'
import { z } from 'zod'
import { sanitizeBlogHtml, slugifyTitle, stripHtml, wordCountFromHtml } from '@/lib/blog/seo'
import type { BlogPost } from '@/lib/blog/types'
import { BLOG_VOICE } from './prompts'
import { generatedArticleSchema, researchSchema, topicCandidateSchema, type BlogGenerationResult, type BlogQualityValidation, type BlogResearch, type BlogResearchSource, type BlogTopicCandidate } from './types'

// The automation runs three times every week; Luna keeps a complete
// research/write/validation run within the requested low per-article budget.
const DEFAULT_GENERATION_MODEL = 'gpt-6-luna'
const DEFAULT_RESEARCH_MODEL = 'gpt-6-luna'
const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small'

export function getBlogModels(settings?: { generation_model?: string | null; research_model?: string | null }) {
  return {
    generation: settings?.generation_model?.trim() || process.env.OPENAI_BLOG_MODEL?.trim() || DEFAULT_GENERATION_MODEL,
    research: settings?.research_model?.trim() || process.env.OPENAI_BLOG_RESEARCH_MODEL?.trim() || DEFAULT_RESEARCH_MODEL,
    embedding: process.env.OPENAI_BLOG_EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL,
  }
}

function client() {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured.')
  return new OpenAI({ apiKey, timeout: 90_000, maxRetries: 1 })
}

const candidatesSchema = z.object({ candidates: z.array(topicCandidateSchema).min(5).max(10) })

function jsonSchema(name: string, schema: Record<string, unknown>) {
  return { format: { type: 'json_schema' as const, name, strict: true, schema } }
}

function schemaForCandidates(): Record<string, unknown> {
  return { type: 'object', additionalProperties: false, required: ['candidates'], properties: { candidates: { type: 'array', minItems: 5, maxItems: 10, items: { type: 'object', additionalProperties: false, required: ['topic', 'title', 'primaryKeyword', 'category', 'searchIntent', 'audience', 'reason', 'trendReason', 'score'], properties: { topic: { type: 'string' }, title: { type: 'string' }, primaryKeyword: { type: 'string' }, category: { type: 'string', enum: ['Materials', 'Guides', 'Troubleshooting', 'Design', 'Technology', 'Business', 'Applications', 'Comparisons', 'Tips', 'Industry'] }, searchIntent: { type: 'string' }, audience: { type: 'string' }, reason: { type: 'string' }, trendReason: { type: 'string' }, score: { type: 'number' } } } } } }
}

function schemaForResearch(): Record<string, unknown> {
  const link = { type: 'object', additionalProperties: false, required: ['title', 'slug', 'reason'], properties: { title: { type: 'string' }, slug: { type: 'string' }, reason: { type: 'string' } } }
  return { type: 'object', additionalProperties: false, required: ['topic', 'primaryKeyword', 'secondaryKeywords', 'searchIntent', 'targetAudience', 'whyThisTopic', 'trendingReason', 'importantFacts', 'articleAngle', 'suggestedHeadings', 'relatedQuestions', 'internalLinkOpportunities', 'sources'], properties: { topic: { type: 'string' }, primaryKeyword: { type: 'string' }, secondaryKeywords: { type: 'array', items: { type: 'string' } }, searchIntent: { type: 'string' }, targetAudience: { type: 'string' }, whyThisTopic: { type: 'string' }, trendingReason: { type: 'string' }, importantFacts: { type: 'array', items: { type: 'string' } }, articleAngle: { type: 'string' }, suggestedHeadings: { type: 'array', items: { type: 'string' } }, relatedQuestions: { type: 'array', items: { type: 'string' } }, internalLinkOpportunities: { type: 'array', items: link }, sources: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['title', 'url'], properties: { title: { type: 'string' }, url: { type: 'string' } } } } } }
}

function schemaForArticle(): Record<string, unknown> {
  const strings = (min = 0) => ({ type: 'string', minLength: min })
  return { type: 'object', additionalProperties: false, required: ['title', 'slug', 'excerpt', 'content', 'category', 'tags', 'primaryKeyword', 'secondaryKeywords', 'metaTitle', 'metaDescription', 'featuredImagePrompt', 'featuredImageAlt', 'faq'], properties: { title: strings(10), slug: strings(3), excerpt: strings(50), content: strings(1000), category: { type: 'string', enum: ['Materials', 'Guides', 'Troubleshooting', 'Design', 'Technology', 'Business', 'Applications', 'Comparisons', 'Tips', 'Industry'] }, tags: { type: 'array', items: strings(2) }, primaryKeyword: strings(2), secondaryKeywords: { type: 'array', items: strings(2) }, metaTitle: strings(10), metaDescription: strings(70), featuredImagePrompt: strings(20), featuredImageAlt: strings(8), faq: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['question', 'answer'], properties: { question: strings(5), answer: strings(10) } } } } }
}

function parseResponse<T>(text: string, schema: z.ZodType<T>): T {
  try { return schema.parse(JSON.parse(text)) } catch (error) { throw new Error(`AI structured output failed validation: ${error instanceof Error ? error.message : 'unknown error'}`) }
}

function sourceList(response: { output?: unknown[] }): BlogResearchSource[] {
  const seen = new Set<string>()
  const sources: BlogResearchSource[] = []
  for (const item of response.output ?? []) {
    if (!item || typeof item !== 'object') continue
    const action = (item as { action?: { sources?: unknown } }).action
    const raw = action?.sources
    if (!Array.isArray(raw)) continue
    for (const entry of raw) {
      if (!entry || typeof entry !== 'object') continue
      const value = entry as { url?: unknown; title?: unknown }
      if (typeof value.url !== 'string' || typeof value.title !== 'string' || seen.has(value.url)) continue
      const parsed = z.object({ title: z.string().min(1), url: z.string().url() }).safeParse(value)
      if (parsed.success) { seen.add(parsed.data.url); sources.push(parsed.data) }
    }
  }
  return sources.slice(0, 8)
}

export async function generateCandidates(prompt: string, model: string): Promise<BlogTopicCandidate[]> {
  const response = await client().responses.create({ model, instructions: BLOG_VOICE, input: prompt, text: jsonSchema('blog_topic_candidates', schemaForCandidates()), max_output_tokens: 1800, store: false })
  return parseResponse(response.output_text, candidatesSchema).candidates
}

export async function researchTopic(prompt: string, model: string): Promise<BlogResearch> {
  const response = await client().responses.create({ model, instructions: BLOG_VOICE, input: prompt, tools: [{ type: 'web_search' }], tool_choice: 'required', include: ['web_search_call.action.sources'], text: jsonSchema('blog_research', schemaForResearch()), max_output_tokens: 3000, store: false })
  const research = parseResponse(response.output_text, researchSchema)
  return { ...research, sources: sourceList(response) }
}

export async function generateArticle(prompt: string, model: string): Promise<BlogGenerationResult> {
  const response = await client().responses.create({ model, instructions: BLOG_VOICE, input: prompt, text: jsonSchema('blog_article', schemaForArticle()), max_output_tokens: 6000, store: false })
  const article = parseResponse(response.output_text, generatedArticleSchema)
  return { ...article, content: sanitizeBlogHtml(article.content), slug: slugifyTitle(article.slug) }
}

export function fingerprint(value: string) {
  return stripHtml(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter((word) => word.length > 2).sort().join('|')
}

function tokenSet(value: string) { return new Set(fingerprint(value).split('|').filter(Boolean)) }
function jaccard(left: string, right: string) {
  const a = tokenSet(left); const b = tokenSet(right)
  if (!a.size || !b.size) return 0
  let overlap = 0; for (const token of a) if (b.has(token)) overlap++
  return overlap / new Set([...a, ...b]).size
}

type DuplicateComparablePost = Pick<BlogPost, 'title' | 'slug' | 'focus_keyword' | 'primary_keyword' | 'category' | 'excerpt'>

export function duplicateScore(candidate: Pick<BlogTopicCandidate, 'topic' | 'title' | 'primaryKeyword'>, post: DuplicateComparablePost) {
  const candidateText = `${candidate.topic} ${candidate.title} ${candidate.primaryKeyword}`
  const postText = `${post.title} ${post.slug} ${post.focus_keyword || post.primary_keyword || ''} ${post.category || ''} ${post.excerpt || ''}`
  const title = jaccard(candidate.title, post.title)
  const keyword = jaccard(candidate.primaryKeyword, post.focus_keyword || post.primary_keyword || '')
  const topic = jaccard(candidateText, postText)
  return Math.round((title * 0.45 + keyword * 0.25 + topic * 0.3) * 100)
}

export type RankedTopicCandidate = {
  candidate: BlogTopicCandidate
  uniqueness: number
  composite: number
}

export function rankUniqueCandidates(candidates: BlogTopicCandidate[], posts: DuplicateComparablePost[], minimumUniqueness: number): RankedTopicCandidate[] {
  return candidates.map((candidate) => {
    const similarity = Math.max(0, ...posts.map((post) => duplicateScore(candidate, post)))
    const uniqueness = 100 - similarity
    return { candidate, uniqueness, composite: candidate.score * 0.65 + uniqueness * 0.35 }
  }).filter((entry) => entry.uniqueness >= minimumUniqueness).sort((a, b) => b.composite - a.composite)
}

export function selectUniqueCandidate(candidates: BlogTopicCandidate[], posts: DuplicateComparablePost[], minimumUniqueness: number) {
  return rankUniqueCandidates(candidates, posts, minimumUniqueness)[0] ?? null
}

export async function generateEmbedding(text: string, model: string): Promise<number[] | null> {
  if (!text.trim()) return null
  const result = await client().embeddings.create({ model, input: text.slice(0, 8000) })
  return result.data[0]?.embedding ?? null
}

export function validateArticle(article: BlogGenerationResult, uniquenessScore: number, sourceUrls: string[], minWords: number, maxWords: number, minimumQuality: number): BlogQualityValidation {
  const reasons: string[] = []
  const plain = stripHtml(article.content)
  const words = wordCountFromHtml(article.content)
  const headingCount = (article.content.match(/<h2\b/gi) || []).length
  const forbidden = /<(script|style|iframe|object|embed)\b|javascript:|\b(TODO|lorem ipsum|insert .* here)\b/i.test(article.content)
  const urls = [...article.content.matchAll(/href=["']([^"']+)["']/gi)].map((match) => match[1])
  const fakeUrl = urls.some((url) => /^https?:/i.test(url) && !sourceUrls.includes(url))
  if (words < minWords) reasons.push(`Content has ${words} words; at least ${minWords} are required.`)
  if (words > maxWords + 350) reasons.push(`Content has ${words} words; it exceeds the configured range.`)
  if (headingCount < 2) reasons.push('Article needs at least two H2 sections.')
  if (forbidden) reasons.push('Article contains unsafe or incomplete content.')
  if (fakeUrl) reasons.push('Article contains an unverified external link.')
  if (uniquenessScore < 60) reasons.push('Topic is too similar to an existing post.')
  const seoScore = Math.max(0, Math.min(100, 35 + (article.metaTitle.length <= 70 ? 15 : 0) + (article.metaDescription.length <= 170 ? 15 : 0) + (article.slug.length > 5 ? 10 : 0) + (article.primaryKeyword && plain.toLowerCase().includes(article.primaryKeyword.toLowerCase()) ? 15 : 0) + (headingCount >= 3 ? 10 : 0)))
  const readabilityScore = Math.max(0, Math.min(100, 100 - Math.max(0, words / Math.max(1, (plain.match(/[.!?]/g) || []).length) - 24) * 2))
  const overallQualityScore = Math.round(seoScore * 0.35 + uniquenessScore * 0.35 + readabilityScore * 0.3)
  if (overallQualityScore < minimumQuality) reasons.push(`Quality score ${overallQualityScore} is below ${minimumQuality}.`)
  return { passed: reasons.length === 0, overallQualityScore, seoScore, uniquenessScore, readabilityScore: Math.round(readabilityScore), reasons }
}
