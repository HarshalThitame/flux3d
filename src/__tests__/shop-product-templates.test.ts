import { describe, expect, it } from 'vitest'
import { productTemplates, templateLongDescription } from '@/lib/shop/templates'

const validOptionTypes = ['swatch_color', 'button', 'dropdown', 'toggle', 'text_input']

describe('productTemplates', () => {
  it('has at least one template', () => {
    expect(productTemplates.length).toBeGreaterThan(0)
  })

  it('has unique ids', () => {
    const ids = productTemplates.map((template) => template.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has a name, emoji, and description on every template', () => {
    for (const template of productTemplates) {
      expect(template.name.length).toBeGreaterThan(0)
      expect(template.emoji.length).toBeGreaterThan(0)
      expect(template.description.length).toBeGreaterThan(0)
    }
  })

  it('uses only valid variant option types', () => {
    for (const template of productTemplates) {
      for (const variant of template.variants) {
        expect(validOptionTypes).toContain(variant.option_type)
      }
    }
  })

  it('has non-empty values on discrete variant options', () => {
    for (const template of productTemplates) {
      for (const variant of template.variants) {
        if (variant.option_type !== 'toggle' && variant.option_type !== 'text_input') {
          expect(variant.values.length).toBeGreaterThan(0)
        }
      }
    }
  })

  it('has search tags on every template', () => {
    for (const template of productTemplates) {
      expect(template.tags.length).toBeGreaterThan(0)
    }
  })
})

describe('templateLongDescription', () => {
  it('substitutes the product name placeholder', () => {
    const template = productTemplates[0]
    const result = templateLongDescription(template, 'My Dragon')
    expect(result).toContain('My Dragon')
    expect(result).not.toContain('{{name}}')
  })

  it('falls back to the template name when no product name is given', () => {
    const template = productTemplates[0]
    const result = templateLongDescription(template, '')
    expect(result).not.toContain('{{name}}')
  })
})
