import { NextResponse } from 'next/server'
import { createAdminSupabaseClient, isCurrentUserAdmin } from '@/lib/admin/server'
import { makeExcerptFromContent, stripHtml } from '@/lib/blog/seo'
import type { BlogPost } from '@/lib/blog/types'

export const dynamic = 'force-dynamic'

type AiAction =
  | 'generate-seo-title'
  | 'generate-meta-description'
  | 'suggest-focus-keyword'
  | 'generate-faq'
  | 'improve-readability'
  | 'generate-social-caption'
  | 'suggest-internal-links'

type AiBody = {
  action?: AiAction
  title?: string
  excerpt?: string
  content?: string
  focusKeyword?: string
}

const validActions = new Set<AiAction>([
  'generate-seo-title',
  'generate-meta-description',
  'suggest-focus-keyword',
  'generate-faq',
  'improve-readability',
  'generate-social-caption',
  'suggest-internal-links',
])

function trimTo(value: string, max: number) {
  if (value.length <= max) return value
  return `${value.slice(0, max - 3).replace(/\s+\S*$/, '').trim()}...`
}

function parseJson(text: string) {
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      return JSON.parse(match[0])
    } catch {
      return null
    }
  }
}

async function fetchPublishedPosts() {
  try {
    const supabase = createAdminSupabaseClient()
    const { data } = await supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, tags, focus_keyword, category, status')
      .eq('status', 'published')
      .limit(50)
      .returns<Pick<BlogPost, 'id' | 'title' | 'slug' | 'excerpt' | 'tags' | 'focus_keyword' | 'category' | 'status'>[]>()

    return data || []
  } catch {
    return []
  }
}

function scoreInternalLinks(content: string, posts: Awaited<ReturnType<typeof fetchPublishedPosts>>) {
  const text = stripHtml(content).toLowerCase()

  return posts
    .map((post) => {
      const terms = [
        post.title,
        post.focus_keyword || '',
        post.category || '',
        ...(post.tags || []),
      ]
        .flatMap((term) => term.toLowerCase().split(/[\s,-]+/))
        .filter((term) => term.length > 3)

      const score = terms.reduce((total, term) => total + (text.includes(term) ? 1 : 0), 0)
      return { post, score }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ post }) => ({
      title: post.title,
      slug: post.slug,
      url: `/blog/${post.slug}`,
      reason: post.focus_keyword || post.category || 'Related published blog post',
    }))
}

function fallbackResponse(action: AiAction, body: AiBody, posts: Awaited<ReturnType<typeof fetchPublishedPosts>>) {
  const title = body.title?.trim() || 'Flux3D Blog Post'
  const focus = body.focusKeyword?.trim() || '3D printing Pune'
  const excerpt = body.excerpt?.trim() || makeExcerptFromContent(body.content || '', title, 150)
  const contentText = stripHtml(body.content || '')
  const internalLinks = scoreInternalLinks(body.content || '', posts)

  switch (action) {
    case 'generate-seo-title':
      return {
        titles: [
          trimTo(`${focus} Guide | Flux3D`, 60),
          trimTo(`${title} for 3D Printing Buyers`, 60),
          trimTo(`Best ${focus} Tips from Flux3D`, 60),
        ],
      }
    case 'generate-meta-description':
      return {
        metaDescription: trimTo(
          `${excerpt || title} Learn practical 3D printing tips from Flux3D for faster, cleaner prototypes in India.`,
          155
        ),
      }
    case 'suggest-focus-keyword':
      return {
        focusKeyword: focus,
        secondaryKeywords: ['rapid prototyping Pune', '3D printing service India', 'SLA printing Pune'],
      }
    case 'generate-faq':
      return {
        faqs: [
          {
            question: `What is the main benefit of ${focus}?`,
            answer: trimTo(`${title} explains how Flux3D uses practical 3D printing workflows to improve prototype speed, quality, and reliability.`, 220),
          },
          {
            question: 'How fast can Flux3D deliver 3D printed parts?',
            answer: 'Many prototype jobs can be completed quickly depending on material, geometry, finish, and queue size.',
          },
          {
            question: 'Which materials are suitable for this use case?',
            answer: 'Common choices include PLA, PETG, ABS, resin, and engineering materials depending on strength, detail, and heat requirements.',
          },
          {
            question: 'Can Flux3D help with design for manufacturing?',
            answer: 'Yes. Flux3D can review part geometry, wall thickness, tolerances, orientation, and finishing requirements before printing.',
          },
          {
            question: 'How do I request a quote?',
            answer: 'Upload your model or share project details through Flux3D to receive pricing and production guidance.',
          },
        ],
      }
    case 'improve-readability':
      return {
        content: body.content || `<p>${contentText}</p>`,
      }
    case 'generate-social-caption':
      return {
        linkedinCaption: trimTo(`New on the Flux3D blog: ${title}\n\n${excerpt}\n\n#3DPrinting #RapidPrototyping #Flux3D`, 650),
        whatsappCaption: trimTo(`New Flux3D blog: ${title}\n${excerpt}`, 280),
      }
    case 'suggest-internal-links':
      return { links: internalLinks }
    default:
      return {}
  }
}

function buildPrompt(action: AiAction, body: AiBody, posts: Awaited<ReturnType<typeof fetchPublishedPosts>>) {
  const title = body.title || ''
  const excerpt = body.excerpt || ''
  const focusKeyword = body.focusKeyword || ''
  const content = trimTo(stripHtml(body.content || ''), 5000)
  const postsList = posts
    .slice(0, 20)
    .map((post) => `- ${post.title} (/blog/${post.slug}) ${post.focus_keyword ? `keyword: ${post.focus_keyword}` : ''}`)
    .join('\n')

  const responseShapes: Record<AiAction, string> = {
    'generate-seo-title': '{"titles":["Title option 1","Title option 2","Title option 3"]}',
    'generate-meta-description': '{"metaDescription":"120 to 160 character meta description"}',
    'suggest-focus-keyword': '{"focusKeyword":"primary keyword","secondaryKeywords":["keyword 1","keyword 2","keyword 3"]}',
    'generate-faq': '{"faqs":[{"question":"Question?","answer":"Answer."}]}',
    'improve-readability': '{"content":"Improved HTML content preserving headings and links"}',
    'generate-social-caption': '{"linkedinCaption":"...","whatsappCaption":"..."}',
    'suggest-internal-links': '{"links":[{"title":"Post title","slug":"post-slug","url":"/blog/post-slug","reason":"why it matches"}]}',
  }

  return `You are an SEO editor for Flux3D, a 3D printing and rapid prototyping business in India.
Return only valid JSON matching this shape: ${responseShapes[action]}

Action: ${action}
Post title: ${title}
Focus keyword: ${focusKeyword}
Excerpt: ${excerpt}
Content draft:
${content}

Existing published posts for internal links:
${postsList || 'No published posts available.'}`
}

async function callClaude(action: AiAction, body: AiBody, posts: Awaited<ReturnType<typeof fetchPublishedPosts>>) {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
  if (!apiKey) return null

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-5',
      max_tokens: action === 'improve-readability' ? 1800 : 900,
      temperature: 0.4,
      system: 'You write concise, conversion-focused SEO content and return strict JSON only.',
      messages: [
        {
          role: 'user',
          content: buildPrompt(action, body, posts),
        },
      ],
    }),
  })

  if (!response.ok) return null

  const data = await response.json()
  const text = Array.isArray(data.content)
    ? data.content
        .filter((block: { type?: string; text?: string }) => block.type === 'text' && block.text)
        .map((block: { text: string }) => block.text)
        .join('\n')
    : ''

  return parseJson(text)
}

export async function POST(request: Request) {
  try {
    if (!(await isCurrentUserAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json() as AiBody
    const action = body.action

    if (!action || !validActions.has(action)) {
      return NextResponse.json({ error: 'Missing AI action.' }, { status: 400 })
    }

    const posts = await fetchPublishedPosts()
    const claudeResult = await callClaude(action, body, posts)

    return NextResponse.json(claudeResult || fallbackResponse(action, body, posts))
  } catch {
    return NextResponse.json({ error: 'Failed to run AI action.' }, { status: 500 })
  }
}
