import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('validatePricesInResponse', () => {
  let validatePricesInResponse: typeof import('@/lib/whatsapp-price-validation').validatePricesInResponse

  beforeEach(async () => {
    const mod = await import('@/lib/whatsapp-price-validation')
    validatePricesInResponse = mod.validatePricesInResponse
  })

  it('returns valid when no ₹ mentioned', () => {
    const result = validatePricesInResponse('Hello! How can I help you?', [
      { name: 'PLA+', price: 2.8 },
    ])
    expect(result.valid).toBe(true)
    expect(result.mentionedPrices).toEqual([])
    expect(result.hallucinatedPrices).toEqual([])
  })

  it('returns valid when mentioned price matches DB exactly', () => {
    const result = validatePricesInResponse(
      'The vase is ₹499.',
      [{ name: 'PLA Vase', price: 499 }],
    )
    expect(result.valid).toBe(true)
    expect(result.mentionedPrices).toEqual([499])
    expect(result.hallucinatedPrices).toEqual([])
  })

  it('returns valid when mentioned price matches with decimals', () => {
    const result = validatePricesInResponse(
      'PLA+ is ₹2.80 per gram.',
      [{ name: 'PLA+', price: 2.8 }],
    )
    expect(result.valid).toBe(true)
    expect(result.mentionedPrices).toEqual([2.8])
  })

  it('returns valid when mentioned price differs by rounding (tolerance)', () => {
    const result = validatePricesInResponse(
      'PLA+ is ₹2.8 per gram.',
      [{ name: 'PLA+', price: 2.8 }],
    )
    expect(result.valid).toBe(true)
  })

  it('detects hallucinated higher price', () => {
    const result = validatePricesInResponse(
      'The vase costs ₹999.',
      [{ name: 'PLA Vase', price: 499 }],
    )
    expect(result.valid).toBe(false)
    expect(result.hallucinatedPrices).toEqual([999])
  })

  it('detects hallucinated lower price', () => {
    const result = validatePricesInResponse(
      'PLA+ is just ₹1.50 per gram.',
      [{ name: 'PLA+', price: 2.8 }],
    )
    expect(result.valid).toBe(false)
    expect(result.hallucinatedPrices).toEqual([1.5])
  })

  it('detects hallucinated price among multiple correct ones', () => {
    const result = validatePricesInResponse(
      'PLA+ is ₹2.80 and PETG is ₹999.',
      [
        { name: 'PLA+', price: 2.8 },
        { name: 'PETG', price: 3.5 },
      ],
    )
    expect(result.valid).toBe(false)
    expect(result.hallucinatedPrices).toEqual([999])
  })

  it('returns safeResponse with all known prices on hallucination', () => {
    const result = validatePricesInResponse(
      'The vase costs ₹999.',
      [{ name: 'PLA Vase', price: 499 }],
    )
    expect(result.valid).toBe(false)
    expect(result.safeResponse).toContain("couldn't verify some of the prices")
    expect(result.safeResponse).toContain('PLA Vase')
    expect(result.safeResponse).toContain('₹499.00')
    expect(result.safeResponse).not.toContain('₹999')
  })

  it('returns valid when knownPrices is empty', () => {
    const result = validatePricesInResponse(
      'The vase costs ₹499.',
      [],
    )
    expect(result.valid).toBe(true)
  })

  it('returns valid when ₹0 is mentioned (not a product price)', () => {
    const result = validatePricesInResponse(
      'Free shipping over ₹0!',
      [{ name: 'Vase', price: 499 }],
    )
    expect(result.valid).toBe(true)
    expect(result.mentionedPrices).toEqual([])
  })

  it('handles comma-formatted prices like ₹1,200', () => {
    const result = validatePricesInResponse(
      'This product costs ₹1,200.',
      [{ name: 'Premium Item', price: 1200 }],
    )
    expect(result.valid).toBe(true)
    expect(result.mentionedPrices).toEqual([1200])
  })

  it('handles multiple prices in one response', () => {
    const result = validatePricesInResponse(
      'PLA+ is ₹2.80 and the vase is ₹499.',
      [
        { name: 'PLA+', price: 2.8 },
        { name: 'PLA Vase', price: 499 },
      ],
    )
    expect(result.valid).toBe(true)
    expect(result.mentionedPrices).toEqual([2.8, 499])
  })

  it('detects multiple hallucinated prices', () => {
    const result = validatePricesInResponse(
      'PLA+ is ₹1.00 and the vase is ₹9,999.',
      [
        { name: 'PLA+', price: 2.8 },
        { name: 'PLA Vase', price: 499 },
      ],
    )
    expect(result.valid).toBe(false)
    expect(result.hallucinatedPrices).toEqual([1, 9999])
  })

  it('matches simple price ₹5 even with trailing comma in sentence', () => {
    const result = validatePricesInResponse(
      'This costs ₹5, but the vase is ₹499.',
      [
        { name: 'Small Item', price: 5 },
        { name: 'PLA Vase', price: 499 },
      ],
    )
    expect(result.mentionedPrices).toEqual([5, 499])
    expect(result.valid).toBe(true)
  })

  it('does not match ₹, (comma without leading digit)', () => {
    const result = validatePricesInResponse(
      'This costs ₹, but I am not sure.',
      [{ name: 'PLA Vase', price: 499 }],
    )
    expect(result.mentionedPrices).toEqual([])
  })
})
