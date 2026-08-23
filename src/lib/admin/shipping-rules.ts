export type ShippingRulePayload = {
  state?: unknown
  pincodeRangeStart?: unknown
  pincodeRangeEnd?: unknown
  minimumOrderValue?: unknown
  maximumWeightGrams?: unknown
  charge?: unknown
  restricted?: unknown
  isActive?: unknown
}

function optionalText(value: unknown, maxLength = 120): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, maxLength) : null
}

function nonNegativeNumber(value: unknown): number | null {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return Math.round(parsed * 100) / 100
}

function isEmptyInput(value: unknown): boolean {
  return value === undefined || value === null || value === ''
}

export function normalizeShippingRule(body: ShippingRulePayload): { data: Record<string, unknown> } | { error: string } {
  const state = optionalText(body.state)
  const pincodeRangeStart = optionalText(body.pincodeRangeStart, 10)
  const pincodeRangeEnd = optionalText(body.pincodeRangeEnd, 10)

  for (const [label, value] of [
    ['Pincode range start', pincodeRangeStart],
    ['Pincode range end', pincodeRangeEnd],
  ] as const) {
    if (value && !/^\d{1,10}$/.test(value)) {
      return { error: `${label} must contain digits only.` }
    }
  }
  if (pincodeRangeStart && pincodeRangeEnd && pincodeRangeStart > pincodeRangeEnd) {
    return { error: 'Pincode range start must be less than or equal to range end.' }
  }

  const minimumOrderValue = isEmptyInput(body.minimumOrderValue)
    ? 0
    : nonNegativeNumber(body.minimumOrderValue)
  const maximumWeightProvided = !isEmptyInput(body.maximumWeightGrams)
  const maximumWeightGrams = maximumWeightProvided ? nonNegativeNumber(body.maximumWeightGrams) : null
  const charge = isEmptyInput(body.charge) ? 0 : nonNegativeNumber(body.charge)

  if (minimumOrderValue === null) return { error: 'Minimum order value must be a number ≥ 0.' }
  if (maximumWeightProvided && maximumWeightGrams === null) return { error: 'Maximum weight must be a number ≥ 0.' }
  if (charge === null) return { error: 'Delivery charge must be a number ≥ 0.' }

  return {
    data: {
      state,
      pincode_range_start: pincodeRangeStart,
      pincode_range_end: pincodeRangeEnd,
      minimum_order_value: minimumOrderValue,
      maximum_weight_grams: maximumWeightGrams,
      charge,
      restricted: Boolean(body.restricted),
      is_active: body.isActive === undefined ? true : Boolean(body.isActive),
    },
  }
}
