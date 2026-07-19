import { describe, expect, it } from 'vitest'
import { toParsedModel } from '../server-pricing'
import type { ModelMetadata } from '../server-pricing'

describe('toParsedModel', () => {
  const metadata: ModelMetadata = {
    fileName: 'test.stl',
    fileSize: 1024,
    extension: 'stl',
    volumeMm3: 25000,
    dimensionsMm: { x: 25, y: 20, z: 15 },
    triangleCount: 500,
    suggestedMaterialId: 'pla',
  }

  it('converts ModelMetadata to ParsedModel', () => {
    const result = toParsedModel(metadata)
    expect(result.fileName).toBe('test.stl')
    expect(result.fileSize).toBe(1024)
    expect(result.extension).toBe('stl')
    expect(result.volumeMm3).toBe(25000)
    expect(result.dimensionsMm.x).toBe(25)
    expect(result.triangleCount).toBe(500)
    expect(result.suggestedMaterialId).toBe('pla')
  })

  it('preserves all dimension axes', () => {
    const result = toParsedModel(metadata)
    expect(result.dimensionsMm.x).toBe(25)
    expect(result.dimensionsMm.y).toBe(20)
    expect(result.dimensionsMm.z).toBe(15)
  })

  it('handles zero volume', () => {
    const zeroVolume = { ...metadata, volumeMm3: 0 }
    const result = toParsedModel(zeroVolume)
    expect(result.volumeMm3).toBe(0)
  })

  it('handles missing suggestedMaterialId', () => {
    const noMaterial = { ...metadata, suggestedMaterialId: undefined as unknown as string }
    const result = toParsedModel(noMaterial)
    expect(result.suggestedMaterialId ?? '').toBe('')
  })
})

describe('calculateServerQuotePricing', () => {
  it('returns error for missing material', async () => {
    const { calculateServerQuotePricing } = await import('../server-pricing')
    const metadata: ModelMetadata = {
      fileName: 'test.stl', fileSize: 100, extension: 'stl', volumeMm3: 10000,
      dimensionsMm: { x: 10, y: 10, z: 10 }, triangleCount: 100, suggestedMaterialId: 'nonexistent',
    }
    const config = { materialId: 'nonexistent', color: 'red', infill: 20, layerHeight: 0.2, quantity: 1, postProcessingLevel: 'none' as const, supports: false }
    await expect(calculateServerQuotePricing(metadata, config)).rejects.toThrow()
  })
})
