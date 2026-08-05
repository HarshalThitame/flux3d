import { describe, expect, it } from 'vitest'
import { validateMaterialPayload } from '@/app/api/admin/materials/route'

describe('validateMaterialPayload', () => {
  it('rejects when name is missing', () => {
    expect(() => validateMaterialPayload({ name: '  ', stock: 'Healthy' })).toThrow(
      'Material name is required.'
    )
  })

  it('rejects invalid price per gram', () => {
    expect(() => validateMaterialPayload({ name: 'PLA', pricePerGram: -1, density: 1.2, stock: 'Healthy' })).toThrow(
      'Price per gram must be a valid number.'
    )
  })

  it('rejects invalid density', () => {
    expect(() => validateMaterialPayload({ name: 'PLA', pricePerGram: 2.8, density: -5, stock: 'Healthy' })).toThrow(
      'Density must be a valid number.'
    )
  })

  it('rejects unknown stock state', () => {
    expect(() =>
      validateMaterialPayload({ name: 'PLA', pricePerGram: 2.8, density: 1.2, stock: 'Unknown' as 'Healthy' })
    ).toThrow('Stock state is invalid.')
  })

  it('applies defaults for optional fields', () => {
    const result = validateMaterialPayload({ name: 'PLA', pricePerGram: 2.8, density: 1.24, stock: 'Healthy' })
    expect(result).toMatchObject({
      name: 'PLA',
      icon: '🧩',
      machineRate: 180,
      multiplier: 1,
      difficultyFactor: 1.1,
      difficultyLevel: 'Easy',
      heatResistance: 'Low',
      strengthRating: 'Medium',
      finishQuality: 'Good',
      recommendedFor: '',
      keyProperties: [],
      bestFor: [],
      colors: [],
      samplePhoto: '',
      stock: 'Healthy',
    })
  })

  it('trims whitespace and filters empty colors/key properties', () => {
    const result = validateMaterialPayload({
      name: '  ABS ',
      pricePerGram: 3.5,
      density: 1.04,
      colors: [' red ', '', '#ffffff'],
      keyProperties: [' durable ', ''],
      stock: 'Low',
    })
    expect(result.name).toBe('ABS')
    expect(result.colors).toEqual(['red', '#ffffff'])
    expect(result.keyProperties).toEqual(['durable'])
    expect(result.stock).toBe('Low')
  })

  it('keeps numeric fields as numbers', () => {
    const result = validateMaterialPayload({
      name: 'PETG',
      pricePerGram: 4,
      density: 1.27,
      machineRate: 200,
      multiplier: 1.5,
      difficultyFactor: 1.3,
      stock: 'Healthy',
    })
    expect(result.pricePerGram).toBe(4)
    expect(result.density).toBe(1.27)
    expect(result.machineRate).toBe(200)
    expect(result.multiplier).toBe(1.5)
    expect(result.difficultyFactor).toBe(1.3)
  })
})
