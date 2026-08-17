import { describe, expect, it } from 'vitest'
import { numberToWords } from '../number-to-words'

describe('numberToWords', () => {
  it('handles zero', () => {
    expect(numberToWords(0)).toBe('zero rupees only')
  })

  it('handles single digits', () => {
    expect(numberToWords(7)).toBe('seven rupees only')
  })

  it('handles tens', () => {
    expect(numberToWords(42)).toBe('forty two rupees only')
  })

  it('handles hundreds', () => {
    expect(numberToWords(305)).toBe('three hundred five rupees only')
  })

  it('handles thousands', () => {
    expect(numberToWords(1523)).toBe('one thousand five hundred twenty three rupees only')
  })

  it('handles lakhs', () => {
    expect(numberToWords(150000)).toBe('one lakh fifty thousand rupees only')
  })

  it('handles crores', () => {
    expect(numberToWords(21000000)).toBe('two crore ten lakh rupees only')
  })

  it('rounds fractional values', () => {
    expect(numberToWords(99.5)).toBe('one hundred rupees only')
    expect(numberToWords(99.4)).toBe('ninety nine rupees only')
  })

  it('clamps negative values to zero', () => {
    expect(numberToWords(-50)).toBe('zero rupees only')
  })

  it('handles full breakdown', () => {
    expect(numberToWords(12345678)).toBe('one crore twenty three lakh forty five thousand six hundred seventy eight rupees only')
  })
})