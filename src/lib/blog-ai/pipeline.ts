import 'server-only'

import { revalidatePath } from 'next/cache'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { logError, logInfo, logWarn } from '@/lib/logger'
import type { BlogPost } from '@/lib/blog/types'
import { publicBlogUrl } from '@/lib/blog/seo'
import { articlePrompt, candidatePrompt, researchPrompt } from './prompts'
import { generateArticle, generateCandidates, generateEmbedding, getBlogModels, researchTopic, selectUniqueCandidate, validateArticle } from './core'
import type { BlogAISettings, BlogGenerationResult, BlogQualityValidation } from './types'

type RunRow = { id: string; schedule_key: string; status: string; attempt_number: number }
type PublishedPostSummary = Pick<BlogPost, 'id' | 'title' | 'slug' | 'excerpt' | 'tags' | 'category' | 'focus_keyword' | 'primary_keyword' | 'status'>

export type GenerationInput = {
  scheduleKey: string
  triggerType: 'scheduled' | 'manual_auto' | 'manual_custom' | 'retry'
  customTopic?: string
  createdBy?: string | null
  forceDraft?: boolean
}

export type GenerationOutcome = { runId: string; status: 'published' | 'draft' | 'failed' | 'duplicate'; blogId?: string; error?: string }

const DEFAULT_SETTINGS: BlogAISettings = {
  enabled: true, auto_publish: true, default_author_id: null, default_author_name: 'Flux3D Team',
  target_min_words: 1200, target_max_words: 2000, minimum_quality_score: 72, minimum_uniqueness_score: 72,
  preferred_categories: [], excluded_topics: [], cta_enabled: true, generation_model: null, research_model: null,
}

async function settings(): Promise<BlogAISettings> {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase.from('blog_ai_settings').select('*').eq('id', true).maybeSingle()
  if (error || !data) return DEFAULT_SETTINGS
  return { ...DEFAULT_SETTINGS, ...data } as BlogAISettings
}

async function existingPosts(): Promise<PublishedPostSummary[]> {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase.from('blog_posts')
    .select('id, title, slug, excerpt, tags, category, focus_keyword, primary_keyword, status')
    .in('status', ['published', 'draft'])
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(250)
  if (error) throw new Error(`Unable to load prior blog posts: ${error.message}`)
  return (data ?? []) as PublishedPostSummary[]
}

function compactPosts(posts: PublishedPostSummary[]) {
  return posts.slice(0, 80).map((post) => `- ${post.title} | /blog/${post.slug} | ${post.focus_keyword || post.primary_keyword || ''} | ${post.category || ''}`).join('\n')
}

function uniqueSlug(base: string, posts: PublishedPostSummary[]) {
  const reserved = new Set(posts.map((post) => post.slug))
  if (!reserved.has(base)) return base
  for (let suffix = 2; suffix < 50; suffix += 1) if (!reserved.has(`${base}-${suffix}`)) return `${base}-${suffix}`
  throw new Error('Could not allocate a unique blog slug.')
}

function appendSources(content: string, sources: Array<{ title: string; url: string }>) {
  if (!sources.length) return content
  const links = sources.map((source) => `<li><a href="${source.url}" rel="nofollow noopener noreferrer" target="_blank">${source.title}</a></li>`).join('')
  return `${content}<h2>Sources</h2><ul>${links}</ul>`
}

async function createRun(input: GenerationInput): Promise<RunRow | null> {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase.from('blog_generation_runs').insert({
    schedule_key: input.scheduleKey, trigger_type: input.triggerType, status: 'researching', requested_topic: input.customTopic || null, created_by: input.createdBy || null,
  }).select('id, schedule_key, status, attempt_number').single()
  if (error?.code === '23505') return null
  if (error) throw new Error(`Unable to create generation run: ${error.message}`)
  return data as RunRow
}

async function updateRun(id: string, patch: Record<string, unknown>) {
  const supabase = createAdminSupabaseClient()
  const { error } = await supabase.from('blog_generation_runs').update(patch).eq('id', id)
  if (error) throw new Error(`Unable to update generation run: ${error.message}`)
}

export async function runBlogGeneration(input: GenerationInput): Promise<GenerationOutcome> {
  const config = await settings()
  if (input.triggerType === 'scheduled' && !config.enabled) {
    logInfo('Scheduled blog generation skipped because automation is disabled.', { module: 'blog-ai' })
    return { runId: input.scheduleKey, status: 'duplicate' }
  }
  const run = await createRun(input)
  if (!run) return { runId: input.scheduleKey, status: 'duplicate' }

  const started = Date.now()
  try {
    logInfo('Blog AI generation started.', { module: 'blog-ai', metadata: { runId: run.id, triggerType: input.triggerType } })
    const models = getBlogModels(config)
    const posts = await existingPosts()
    const candidates = input.customTopic
      ? [{ topic: input.customTopic, title: input.customTopic, primaryKeyword: input.customTopic, category: 'Guides' as const, searchIntent: 'Educational', audience: '3D printing customers', reason: 'Admin-selected topic', trendReason: 'Admin request', score: 100 }]
      : await generateCandidates(candidatePrompt(compactPosts(posts), config.excluded_topics), models.research)
    const selected = selectUniqueCandidate(candidates, posts, config.minimum_uniqueness_score)
    if (!selected) throw new Error('No sufficiently unique topic candidate was available.')
    const candidateEmbedding = await generateEmbedding(`${selected.candidate.topic} ${selected.candidate.primaryKeyword}`, models.embedding).catch(() => null)
    if (candidateEmbedding) {
      const supabase = createAdminSupabaseClient()
      const { data: matches } = await supabase.rpc('match_blog_topic_embeddings', { query_embedding: JSON.stringify(candidateEmbedding), match_limit: 1 })
      const similarity = Array.isArray(matches) && typeof matches[0]?.similarity === 'number' ? matches[0].similarity : 0
      if (similarity > 1 - config.minimum_uniqueness_score / 100) throw new Error('Selected topic is semantically too similar to an existing article.')
    }
    await updateRun(run.id, { selected_topic: selected.candidate.topic, selected_candidate: selected.candidate, status: 'generating', model: models.generation })
    logInfo('Blog AI topic selected.', { module: 'blog-ai', metadata: { runId: run.id, topic: selected.candidate.topic, uniqueness: selected.uniqueness } })

    const research = await researchTopic(researchPrompt(selected.candidate, compactPosts(posts)), models.research)
    await updateRun(run.id, { research_data: research, status: 'generating' })
    const article = await generateArticle(articlePrompt(research, compactPosts(posts), config.target_min_words, config.target_max_words, config.cta_enabled), models.generation)
    const validation = validateArticle(article, selected.uniqueness, research.sources.map((source) => source.url), config.target_min_words, config.target_max_words, config.minimum_quality_score)
    await updateRun(run.id, { validation_data: validation, status: 'validating' })
    logInfo('Blog AI article validated.', { module: 'blog-ai', metadata: { runId: run.id, passed: validation.passed, quality: validation.overallQualityScore } })

    const safeArticle = { ...article, slug: uniqueSlug(article.slug, posts), content: appendSources(article.content, research.sources) }
    const supabase = createAdminSupabaseClient()
    const shouldPublish = validation.passed && config.auto_publish && !input.forceDraft
    const embedding = candidateEmbedding || await generateEmbedding(`${safeArticle.title} ${safeArticle.primaryKeyword} ${safeArticle.excerpt}`, models.embedding).catch((error) => {
      logWarn('Blog topic embedding failed; falling back to deterministic duplicate detection.', { module: 'blog-ai', error: error instanceof Error ? error : undefined })
      return null
    })
    const payload = blogPayload(safeArticle, research as unknown as Record<string, unknown>, validation, selected, run.id, models.generation, config, shouldPublish, embedding)
    const { data: blog, error: insertError } = await supabase.from('blog_posts').insert(payload).select('id, slug, status').single()
    if (insertError) throw new Error(`Unable to save generated blog: ${insertError.message}`)
    await updateRun(run.id, { blog_id: blog.id, status: shouldPublish ? 'published' : 'draft', completed_at: new Date().toISOString() })
    if (shouldPublish) {
      await supabase.from('blog_ai_settings').update({ last_successful_run_at: new Date().toISOString() }).eq('id', true)
      revalidatePath('/blog'); revalidatePath(`/blog/${blog.slug}`); revalidatePath('/sitemap.xml')
    }
    logInfo('Blog AI generation completed.', { module: 'blog-ai', duration: Date.now() - started, metadata: { runId: run.id, blogId: blog.id, status: blog.status } })
    return { runId: run.id, status: shouldPublish ? 'published' : 'draft', blogId: blog.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown blog generation failure.'
    await updateRun(run.id, { status: 'failed', error_message: message, completed_at: new Date().toISOString() }).catch(() => undefined)
    logError('Blog AI generation failed.', { module: 'blog-ai', error: error instanceof Error ? error : undefined, duration: Date.now() - started, metadata: { runId: run.id } })
    return { runId: run.id, status: 'failed', error: message }
  }
}

function blogPayload(article: BlogGenerationResult, research: Record<string, unknown>, validation: BlogQualityValidation, selected: { candidate: { topic: string; category: string; primaryKeyword: string; score: number }; uniqueness: number }, runId: string, model: string, config: BlogAISettings, publish: boolean, embedding: number[] | null) {
  const now = new Date().toISOString()
  return {
    title: article.title, slug: article.slug, excerpt: article.excerpt, content: article.content, category: article.category,
    tags: article.tags, author_id: config.default_author_id, author_name: config.default_author_name,
    status: publish ? 'published' : 'draft', published_at: publish ? now : null,
    seo_title: article.metaTitle, meta_description: article.metaDescription, focus_keyword: article.primaryKeyword, primary_keyword: article.primaryKeyword,
    secondary_keywords: article.secondaryKeywords, canonical_url: publicBlogUrl(article.slug), og_title: article.metaTitle,
    og_description: article.metaDescription, featured_image_alt: article.featuredImageAlt, featured_image_prompt: article.featuredImagePrompt,
    schema_type: article.faq.length ? 'FAQ' : 'Article', schema_data: { faqs: article.faq, researchSources: (research.sources as unknown[] | undefined) ?? [] },
    ai_generated: true, ai_model: model, topic_fingerprint: `${selected.candidate.primaryKeyword}:${selected.candidate.topic}`.toLowerCase(),
    topic_category: selected.candidate.category, ai_topic_score: selected.candidate.score, research_data: research,
    quality_score: validation.overallQualityScore, seo_quality_score: validation.seoScore, uniqueness_score: validation.uniquenessScore,
    readability_score: validation.readabilityScore, generation_id: runId, topic_embedding: embedding ? JSON.stringify(embedding) : null,
    seo_score: validation.seoScore, last_modified_at: now,
  }
}
