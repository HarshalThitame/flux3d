import { z } from 'zod'

export const blogCategories = ['Materials', 'Guides', 'Troubleshooting', 'Design', 'Technology', 'Business', 'Applications', 'Comparisons', 'Tips', 'Industry'] as const

export const sourceSchema = z.object({ title: z.string().min(1), url: z.string().url() })
export type BlogResearchSource = z.infer<typeof sourceSchema>

export const topicCandidateSchema = z.object({
  topic: z.string().min(8).max(180),
  title: z.string().min(8).max(180),
  primaryKeyword: z.string().min(2).max(100),
  category: z.enum(blogCategories),
  searchIntent: z.string().min(3).max(160),
  audience: z.string().min(3).max(160),
  reason: z.string().min(10).max(500),
  trendReason: z.string().min(3).max(500),
  score: z.number().min(0).max(100),
})
export type BlogTopicCandidate = z.infer<typeof topicCandidateSchema>

export const researchSchema = z.object({
  topic: z.string().min(8),
  primaryKeyword: z.string().min(2),
  secondaryKeywords: z.array(z.string().min(2)).max(8),
  searchIntent: z.string().min(3),
  targetAudience: z.string().min(3),
  whyThisTopic: z.string().min(10),
  trendingReason: z.string().min(3),
  importantFacts: z.array(z.string().min(8)).min(2).max(10),
  articleAngle: z.string().min(10),
  suggestedHeadings: z.array(z.string().min(3)).min(3).max(10),
  relatedQuestions: z.array(z.string().min(3)).max(8),
  internalLinkOpportunities: z.array(z.object({ title: z.string(), slug: z.string(), reason: z.string() })).max(5),
  sources: z.array(sourceSchema).max(8).default([]),
})
export type BlogResearch = z.infer<typeof researchSchema>

export const generatedArticleSchema = z.object({
  title: z.string().min(10).max(180),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  excerpt: z.string().min(50).max(360),
  content: z.string().min(1000),
  category: z.enum(blogCategories),
  tags: z.array(z.string().min(2)).min(2).max(8),
  primaryKeyword: z.string().min(2),
  secondaryKeywords: z.array(z.string().min(2)).max(8),
  metaTitle: z.string().min(10).max(70),
  metaDescription: z.string().min(70).max(170),
  featuredImagePrompt: z.string().min(20).max(700),
  featuredImageAlt: z.string().min(8).max(180),
  faq: z.array(z.object({ question: z.string().min(5), answer: z.string().min(10) })).max(6).default([]),
})
export type BlogGenerationResult = z.infer<typeof generatedArticleSchema>

export type BlogQualityValidation = {
  passed: boolean
  overallQualityScore: number
  seoScore: number
  uniquenessScore: number
  readabilityScore: number
  reasons: string[]
}

export type BlogAISettings = {
  enabled: boolean
  auto_publish: boolean
  default_author_id: string | null
  default_author_name: string
  target_min_words: number
  target_max_words: number
  minimum_quality_score: number
  minimum_uniqueness_score: number
  preferred_categories: string[]
  excluded_topics: string[]
  cta_enabled: boolean
  generation_model: string | null
  research_model: string | null
}
