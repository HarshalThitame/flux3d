import { describe, expect, it } from 'vitest'
import {
  validateName,
  validateLine1,
  validateCity,
  validateState,
  validatePincode,
} from '../address-validator'

describe('WhatsApp Address Validator', () => {
  describe('validateName', () => {
    it('should validate names correctly', () => {
      expect(validateName('John Doe').valid).toBe(true)
      expect(validateName('A').valid).toBe(false) // too short
      expect(validateName('12345').valid).toBe(false) // only numbers
    })
  })

  describe('validateLine1', () => {
    it('should validate address line 1 correctly', () => {
      expect(validateLine1('42, MG Road').valid).toBe(true)
      expect(validateLine1('Road').valid).toBe(false) // too short
    })
  })

  describe('validateCity', () => {
    it('should validate city correctly', () => {
      expect(validateCity('Mumbai').valid).toBe(true)
      expect(validateCity('M').valid).toBe(false) // too short
      expect(validateCity('123').valid).toBe(false) // only numbers
    })
  })

  describe('validateState', () => {
    it('should validate Indian states correctly', () => {
      expect(validateState('Maharashtra').valid).toBe(true)
      expect(validateState('delhi').valid).toBe(true)
      expect(validateState('abcd').valid).toBe(false) // invalid state
    })
  })

  describe('validatePincode', () => {
    it('should validate Indian pincodes correctly', () => {
      expect(validatePincode('400001').valid).toBe(true)
      expect(validatePincode('400 001').valid).toBe(true) // format-cleanable
      expect(validatePincode('12345').valid).toBe(false) // too short
      expect(validatePincode('1234567').valid).toBe(false) // too long
      expect(validatePincode('99999').valid).toBe(false) // wrong digits
      expect(validatePincode('000001').valid).toBe(false) // invalid pincode range
    })
  })
})
