import { describe, expect, it } from 'vitest'
import { duplicateScore, validateArticle } from '../core'
import { isScheduledBlogDay, kolkataScheduleKey } from '../schedule'

describe('blog AI deterministic guards', () => {
  it('recognizes reversed PLA/PETG comparisons as similar', () => {
    const score = duplicateScore(
      { topic: 'PETG or PLA for functional prints', title: 'PETG vs PLA: which filament should you choose?', primaryKeyword: 'PETG vs PLA' },
      { title: 'PLA vs PETG: Which Is Better?', slug: 'pla-vs-petg', focus_keyword: 'PLA vs PETG', primary_keyword: 'PLA vs PETG', category: 'Comparisons', excerpt: 'A material comparison for 3D printed parts.' },
    )
    expect(score).toBeGreaterThanOrEqual(45)
  })

  it('rejects unsafe, too-short content', () => {
    const result = validateArticle({ title: 'PLA printing guide for durable parts', slug: 'pla-printing-guide', excerpt: 'A concise guide to choosing PLA settings for functional parts and prototypes.', content: '<h2>Start</h2><p>Short content.</p><script>alert(1)</script>', category: 'Guides', tags: ['PLA', 'FDM'], primaryKeyword: 'PLA printing', secondaryKeywords: [], metaTitle: 'PLA printing guide', metaDescription: 'Practical PLA settings for strong and reliable 3D printed functional parts.', featuredImagePrompt: 'A clean FDM printer producing a PLA functional prototype in a bright workshop.', featuredImageAlt: 'PLA prototype printing on an FDM printer', faq: [] }, 95, [], 1200, 2000, 72)
    expect(result.passed).toBe(false)
    expect(result.reasons.length).toBeGreaterThan(0)
  })

  it('creates one IST schedule key for a calendar date', () => {
    expect(kolkataScheduleKey(new Date('2026-10-04T19:00:00.000Z'))).toBe('2026-10-05:blog-generation')
    expect(isScheduledBlogDay(new Date('2026-10-04T19:00:00.000Z'))).toBe(true)
  })
})
