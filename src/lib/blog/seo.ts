export const BLOG_PUBLIC_ORIGIN = 'https://flux3d.in'

export const BLOG_SCHEMA_TYPES = [
  'Article',
  'HowTo',
  'FAQ',
  'Review',
  'Product',
  'LocalBusiness',
] as const

export type BlogSchemaType = (typeof BLOG_SCHEMA_TYPES)[number]

export type FaqItem = {
  question: string
  answer: string
}

export type HowToStep = {
  name: string
  text: string
}

export type BlogSchemaData = {
  faqs?: FaqItem[]
  steps?: HowToStep[]
  socialCaption?: {
    linkedin?: string
    whatsapp?: string
  }
  [key: string]: unknown
}

export type SeoCheckStatus = 'pass' | 'warn' | 'fail'

export type SeoCheck = {
  id: string
  label: string
  status: SeoCheckStatus
  detail: string
  points: number
  earned: number
}

export type SeoAnalysis = {
  score: number
  label: 'Needs Work' | 'Fair' | 'Good'
  color: 'red' | 'orange' | 'green'
  wordCount: number
  readingTimeMinutes: number
  keywordDensity: number
  keywordOccurrences: number
  h2Count: number
  h3Count: number
  internalLinkCount: number
  externalLinkCount: number
  imageCount: number
  missingAltCount: number
  longestParagraphWords: number
  checks: {
    focus: SeoCheck[]
    content: SeoCheck[]
    technical: SeoCheck[]
  }
}

type SeoInput = {
  title: string
  seoTitle?: string
  metaDescription?: string
  slug: string
  focusKeyword?: string
  content: string
  featuredImage?: string
  featuredImageAlt?: string
  ogImageUrl?: string
  schemaType?: string
  canonicalUrl?: string
}

const transitionWords = [
  'also',
  'because',
  'therefore',
  'however',
  'instead',
  'first',
  'second',
  'finally',
  'for example',
  'in addition',
  'as a result',
  'meanwhile',
  'similarly',
  'next',
]

export function slugifyTitle(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

export function splitCsv(value?: string | string[] | null) {
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean)
  }

  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function uniqueStrings(values: Array<string | null | undefined>) {
  const seen = new Set<string>()
  const result: string[] = []

  values.forEach((value) => {
    const trimmed = value?.trim()
    if (!trimmed) return
    const key = trimmed.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    result.push(trimmed)
  })

  return result
}

export function publicBlogUrl(slug: string) {
  return `${BLOG_PUBLIC_ORIGIN}/blog/${slugifyTitle(slug) || slug}`
}

export function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

export function sanitizeBlogHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+=(["']).*?\1/gi, '')
    .replace(/\son\w+=\{[^}]*\}/gi, '')
    .replace(/javascript:/gi, '')
}

export function wordCountFromHtml(html: string) {
  const text = stripHtml(html)
  if (!text) return 0
  return text.split(/\s+/).filter(Boolean).length
}

export function estimateReadingTimeMinutes(wordCount: number) {
  return Math.max(1, Math.ceil(wordCount / 200))
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function countKeywordOccurrences(text: string, keyword?: string) {
  const normalizedKeyword = keyword?.trim()
  if (!normalizedKeyword) return 0
  const pattern = new RegExp(`\\b${escapeRegExp(normalizedKeyword)}\\b`, 'gi')
  return text.match(pattern)?.length || 0
}

export function calculateKeywordDensity(text: string, keyword?: string) {
  const plain = text.trim()
  const words = plain ? plain.split(/\s+/).filter(Boolean).length : 0
  if (!words || !keyword?.trim()) return { occurrences: 0, density: 0 }

  const occurrences = countKeywordOccurrences(plain, keyword)
  const keywordWords = keyword.trim().split(/\s+/).filter(Boolean).length || 1
  const density = (occurrences * keywordWords * 100) / words

  return {
    occurrences,
    density: Number(density.toFixed(2)),
  }
}

export type BlogHeading = {
  level: 2 | 3
  text: string
  id: string
}

export function extractHeadings(html: string): BlogHeading[] {
  const headings: BlogHeading[] = []
  const usedIds = new Map<string, number>()
  const pattern = /<h([23])[^>]*>([\s\S]*?)<\/h\1>/gi
  let match: RegExpExecArray | null

  while ((match = pattern.exec(html))) {
    const level = Number(match[1]) as 2 | 3
    const text = stripHtml(match[2])
    if (!text) continue
    const baseId = slugifyTitle(text) || `section-${headings.length + 1}`
    const count = usedIds.get(baseId) || 0
    usedIds.set(baseId, count + 1)
    const id = count ? `${baseId}-${count + 1}` : baseId
    headings.push({ level, text, id })
  }

  return headings
}

export function addHeadingIds(html: string, headings: BlogHeading[]) {
  let index = 0

  return html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi, (match, level, attrs, inner) => {
    const heading = headings[index]
    index += 1
    if (!heading) return match
    if (/\sid=(["']).*?\1/i.test(attrs)) return match
    return `<h${level}${attrs} id="${heading.id}">${inner}</h${level}>`
  })
}

function extractParagraphWordCounts(html: string) {
  const paragraphs: string[] = []
  const paragraphPattern = /<p[^>]*>([\s\S]*?)<\/p>/gi
  let match: RegExpExecArray | null

  while ((match = paragraphPattern.exec(html))) {
    const text = stripHtml(match[1])
    if (text) paragraphs.push(text)
  }

  if (!paragraphs.length) {
    paragraphs.push(
      ...stripHtml(html)
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
    )
  }

  return paragraphs.map((paragraph) => paragraph.split(/\s+/).filter(Boolean).length)
}

function countLinks(html: string) {
  let internal = 0
  let external = 0
  const linkPattern = /<a\s+[^>]*href=(["'])(.*?)\1[^>]*>/gi
  let match: RegExpExecArray | null

  while ((match = linkPattern.exec(html))) {
    const href = match[2]
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      continue
    }

    if (href.startsWith('/') || href.includes('flux3d.in')) {
      internal += 1
    } else if (/^https?:\/\//i.test(href)) {
      external += 1
    }
  }

  return { internal, external }
}

function imageAltReport(html: string, featuredImage?: string, featuredImageAlt?: string) {
  let count = featuredImage ? 1 : 0
  let missing = featuredImage && !featuredImageAlt?.trim() ? 1 : 0
  const imagePattern = /<img\b([^>]*)>/gi
  let match: RegExpExecArray | null

  while ((match = imagePattern.exec(html))) {
    count += 1
    const attrs = match[1]
    const altMatch = attrs.match(/\salt=(["'])(.*?)\1/i)
    if (!altMatch || !altMatch[2].trim()) {
      missing += 1
    }
  }

  return { count, missing }
}

function sentenceCount(text: string) {
  return text.split(/[.!?]+/).map((sentence) => sentence.trim()).filter(Boolean).length
}

function passiveVoicePercentage(text: string) {
  const sentences = sentenceCount(text)
  if (!sentences) return 0

  const passiveMatches = text.match(/\b(?:is|are|was|were|be|been|being|get|gets|got)\s+\w+(?:ed|en)\b/gi)
  return Number((((passiveMatches?.length || 0) * 100) / sentences).toFixed(1))
}

function hasTransitionWords(text: string) {
  const normalized = text.toLowerCase()
  return transitionWords.some((word) => normalized.includes(word))
}

function makeCheck(
  id: string,
  label: string,
  status: SeoCheckStatus,
  detail: string,
  points: number
): SeoCheck {
  const earned = status === 'pass' ? points : status === 'warn' ? points / 2 : 0
  return { id, label, status, detail, points, earned }
}

export function analyzeBlogSeo(input: SeoInput): SeoAnalysis {
  const contentText = stripHtml(input.content)
  const wordCount = wordCountFromHtml(input.content)
  const readingTimeMinutes = estimateReadingTimeMinutes(wordCount)
  const headings = extractHeadings(input.content)
  const h2Count = headings.filter((heading) => heading.level === 2).length
  const h3Count = headings.filter((heading) => heading.level === 3).length
  const first100Words = contentText.split(/\s+/).slice(0, 100).join(' ')
  const focusKeyword = input.focusKeyword?.trim() || ''
  const keywordInSlug = focusKeyword
    ? slugifyTitle(input.slug).includes(slugifyTitle(focusKeyword))
    : false
  const keywordStats = calculateKeywordDensity(contentText, focusKeyword)
  const links = countLinks(input.content)
  const images = imageAltReport(input.content, input.featuredImage, input.featuredImageAlt)
  const paragraphCounts = extractParagraphWordCounts(input.content)
  const longestParagraphWords = paragraphCounts.length ? Math.max(...paragraphCounts) : 0
  const passivePercent = passiveVoicePercentage(contentText)
  const cleanSlug = Boolean(input.slug) && input.slug === slugifyTitle(input.slug) && !/\s|[A-Z]/.test(input.slug)
  const shortSlug = input.slug.length > 0 && input.slug.length <= 75
  const metaDescriptionLength = input.metaDescription?.length || 0
  const seoTitleLength = input.seoTitle?.length || 0
  const schemaSelected = BLOG_SCHEMA_TYPES.includes(input.schemaType as BlogSchemaType)

  const focus = [
    makeCheck(
      'focus-title',
      'Focus keyword present in SEO Title',
      focusKeyword && input.seoTitle?.toLowerCase().includes(focusKeyword.toLowerCase()) ? 'pass' : 'fail',
      focusKeyword ? `Target: ${focusKeyword}` : 'Add a focus keyword first',
      6
    ),
    makeCheck(
      'focus-first-100',
      'Focus keyword in first 100 words',
      focusKeyword && first100Words.toLowerCase().includes(focusKeyword.toLowerCase()) ? 'pass' : 'fail',
      `${Math.min(wordCount, 100)} words checked`,
      6
    ),
    makeCheck(
      'focus-h2',
      'Focus keyword in at least 1 H2 heading',
      focusKeyword &&
        headings.some(
          (heading) => heading.level === 2 && heading.text.toLowerCase().includes(focusKeyword.toLowerCase())
        )
        ? 'pass'
        : 'fail',
      `${h2Count} H2 headings found`,
      6
    ),
    makeCheck(
      'focus-description',
      'Focus keyword in Meta Description',
      focusKeyword && input.metaDescription?.toLowerCase().includes(focusKeyword.toLowerCase()) ? 'pass' : 'fail',
      `${metaDescriptionLength}/160 characters`,
      6
    ),
    makeCheck(
      'focus-slug',
      'Focus keyword in URL slug',
      focusKeyword && keywordInSlug ? 'pass' : 'fail',
      input.slug || 'Slug is empty',
      6
    ),
    makeCheck(
      'focus-density',
      'Focus keyword density between 0.5% and 2.5%',
      focusKeyword && keywordStats.density >= 0.5 && keywordStats.density <= 2.5 ? 'pass' : 'warn',
      `${keywordStats.density}% (${keywordStats.occurrences} uses)`,
      6
    ),
  ]

  const content = [
    makeCheck(
      'word-count',
      'Word count >= 800 words',
      wordCount >= 800 ? 'pass' : wordCount >= 500 ? 'warn' : 'fail',
      `${wordCount} words`,
      8
    ),
    makeCheck(
      'h2-count',
      'At least 2 H2 headings used',
      h2Count >= 2 ? 'pass' : h2Count === 1 ? 'warn' : 'fail',
      `${h2Count} H2 headings`,
      5
    ),
    makeCheck(
      'h3-count',
      'At least 1 H3 subheading used',
      h3Count >= 1 ? 'pass' : 'fail',
      `${h3Count} H3 headings`,
      4
    ),
    makeCheck(
      'paragraph-length',
      'Paragraphs under 150 words',
      longestParagraphWords <= 150 ? 'pass' : longestParagraphWords <= 180 ? 'warn' : 'fail',
      `Longest paragraph: ${longestParagraphWords} words`,
      5
    ),
    makeCheck(
      'passive-voice',
      'No passive voice above 20%',
      passivePercent <= 20 ? 'pass' : 'warn',
      `${passivePercent}% estimated passive voice`,
      2
    ),
    makeCheck(
      'transition-words',
      'Transition words used',
      hasTransitionWords(contentText) ? 'pass' : 'warn',
      hasTransitionWords(contentText) ? 'Found' : 'Add words like because, however, finally',
      2
    ),
    makeCheck(
      'internal-link',
      'At least 1 internal link',
      links.internal >= 1 ? 'pass' : 'fail',
      `${links.internal} internal links`,
      5
    ),
    makeCheck(
      'external-link',
      'At least 1 external link',
      links.external >= 1 ? 'pass' : 'fail',
      `${links.external} external links`,
      5
    ),
    makeCheck(
      'featured-image',
      'Featured image added',
      input.featuredImage ? 'pass' : 'fail',
      input.featuredImage ? 'Featured image set' : 'Add a featured image',
      5
    ),
    makeCheck(
      'image-alt',
      'All images have alt text',
      images.count > 0 && images.missing === 0 ? 'pass' : images.count === 0 ? 'warn' : 'fail',
      images.count === 0 ? 'No images found' : `${images.missing} missing alt text`,
      5
    ),
    makeCheck(
      'reading-time',
      'Reading time calculated',
      readingTimeMinutes >= 1 ? 'pass' : 'fail',
      `${readingTimeMinutes} min read`,
      3
    ),
  ]

  const technical = [
    makeCheck(
      'seo-title-length',
      'SEO Title length 50-60 characters',
      seoTitleLength >= 50 && seoTitleLength <= 60 ? 'pass' : seoTitleLength > 0 && seoTitleLength <= 70 ? 'warn' : 'fail',
      `${seoTitleLength}/60 characters`,
      4
    ),
    makeCheck(
      'meta-description-length',
      'Meta Description 120-160 characters',
      metaDescriptionLength >= 120 && metaDescriptionLength <= 160
        ? 'pass'
        : metaDescriptionLength > 0
          ? 'warn'
          : 'fail',
      `${metaDescriptionLength}/160 characters`,
      4
    ),
    makeCheck(
      'clean-slug',
      'Slug is short, clean, contains keyword',
      cleanSlug && shortSlug && (!focusKeyword || keywordInSlug) ? 'pass' : cleanSlug ? 'warn' : 'fail',
      cleanSlug ? `${input.slug.length} characters` : 'Use lowercase letters, numbers, and hyphens only',
      3
    ),
    makeCheck(
      'og-image',
      'OG image uploaded (1200x630px)',
      input.ogImageUrl ? 'pass' : 'fail',
      input.ogImageUrl ? 'OG image set' : 'Add a social sharing image',
      2
    ),
    makeCheck(
      'schema-type',
      'Schema type selected',
      schemaSelected ? 'pass' : 'fail',
      input.schemaType || 'Missing schema type',
      1
    ),
    makeCheck(
      'canonical',
      'Canonical URL set',
      input.canonicalUrl || input.slug ? 'pass' : 'fail',
      input.canonicalUrl || (input.slug ? publicBlogUrl(input.slug) : 'Missing canonical URL'),
      1
    ),
  ]

  const earned = [...focus, ...content, ...technical].reduce((total, check) => total + check.earned, 0)
  const score = Math.min(100, Math.round(earned))

  return {
    score,
    label: score >= 75 ? 'Good' : score >= 50 ? 'Fair' : 'Needs Work',
    color: score >= 75 ? 'green' : score >= 50 ? 'orange' : 'red',
    wordCount,
    readingTimeMinutes,
    keywordDensity: keywordStats.density,
    keywordOccurrences: keywordStats.occurrences,
    h2Count,
    h3Count,
    internalLinkCount: links.internal,
    externalLinkCount: links.external,
    imageCount: images.count,
    missingAltCount: images.missing,
    longestParagraphWords,
    checks: { focus, content, technical },
  }
}

export function makeExcerptFromContent(content: string, fallback = '', length = 155) {
  const source = stripHtml(fallback || content)
  if (source.length <= length) return source
  return `${source.slice(0, length).replace(/\s+\S*$/, '').trim()}...`
}
