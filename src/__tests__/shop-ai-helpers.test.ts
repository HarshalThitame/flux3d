import { describe, expect, it } from 'vitest'
import { buildShopAiContext, parseAllJson, parseJsonArray, stripFences } from '@/lib/shop/ai'

describe('buildShopAiContext', () => {
  it('builds context with product name and tone', () => {
    const { tone, context } = buildShopAiContext({ kind: 'tags', name: 'LED Desk Lamp' })
    expect(context).toContain('LED Desk Lamp')
    expect(tone).toContain('professional')
  })

  it('includes category and tags when provided', () => {
    const { context } = buildShopAiContext({
      kind: 'tags',
      name: 'Dragon Figurine',
      category: 'Decor',
      tags: ['dragon', 'gaming'],
    })
    expect(context).toContain('Decor')
    expect(context).toContain('dragon')
  })

  it('applies the requested tone', () => {
    const { tone } = buildShopAiContext({ kind: 'all', name: 'X', tone: 'playful' })
    expect(tone).toContain('playful')
  })
})

describe('stripFences', () => {
  it('removes markdown code fences', () => {
    expect(stripFences('```json\n{"tags": ["a"]}\n```')).toBe('{"tags": ["a"]}')
    expect(stripFences('plain text')).toBe('plain text')
  })
})

describe('parseJsonArray', () => {
  it('parses a JSON object with a tags key', () => {
    expect(parseJsonArray('{"tags": ["Size", "Color", "3D Print"]}')).toEqual(['Size', 'Color', '3D Print'])
  })

  it('parses a raw JSON array', () => {
    expect(parseJsonArray('["a", "b"]')).toEqual(['a', 'b'])
  })

  it('falls back to comma-separated parsing', () => {
    expect(parseJsonArray('dragon, gaming, desk toy')).toEqual(['dragon', 'gaming', 'desk toy'])
  })

  it('filters empty values', () => {
    expect(parseJsonArray('{"tags": ["a", "", "  b  "]}')).toEqual(['a', 'b'])
  })
})

describe('parseAllJson', () => {
  it('parses a complete listing JSON', () => {
    const raw = JSON.stringify({
      short_description: 'A stunning lamp.',
      long_description: '<h2>Features</h2><p>Great.</p>',
      meta_title: 'LED Desk Lamp',
      meta_description: 'Buy the best lamp.',
      tags: ['led', 'lamp'],
      occasion_tags: ['Office Desk'],
    })
    const result = parseAllJson(raw)
    expect(result.short_description).toBe('A stunning lamp.')
    expect(result.long_description).toContain('<h2>')
    expect(result.meta_title).toBe('LED Desk Lamp')
    expect(result.tags).toEqual(['led', 'lamp'])
    expect(result.occasion_tags).toEqual(['Office Desk'])
  })

  it('returns safe defaults on invalid JSON', () => {
    const result = parseAllJson('not json at all')
    expect(result.tags).toEqual([])
    expect(result.short_description).toBe('')
  })
})
