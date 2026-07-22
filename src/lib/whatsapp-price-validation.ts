const PRICE_PATTERN = /₹(\d+(?:,\d{3})*(?:\.\d{1,2})?)/g

export type ValidationResult = {
  valid: boolean
  safeResponse: string
  mentionedPrices: number[]
  hallucinatedPrices: number[]
}

export function validatePricesInResponse(
  response: string,
  knownPrices: Array<{ name: string; price: number }>,
): ValidationResult {
  if (!knownPrices.length) {
    return { valid: true, safeResponse: response, mentionedPrices: [], hallucinatedPrices: [] }
  }

  const matches = [...response.matchAll(PRICE_PATTERN)]
  const mentionedPrices = matches
    .map((m) => parseFloat(m[1].replace(/,/g, '')))
    .filter((p) => p > 0)

  if (!mentionedPrices.length) {
    return { valid: true, safeResponse: response, mentionedPrices: [], hallucinatedPrices: [] }
  }

  const hallucinatedPrices = mentionedPrices.filter((mentioned) =>
    !knownPrices.some((known) => Math.abs(mentioned - known.price) < 0.01),
  )

  if (hallucinatedPrices.length > 0) {
    const safeList = knownPrices.map((p) => `• ${p.name} — ₹${p.price.toFixed(2)}`).join('\n')
    return {
      valid: false,
      safeResponse: `I couldn't verify some of the prices mentioned. Here are our current prices from the database:\n${safeList}\n\nWould you like to place an order or need more details?`,
      mentionedPrices,
      hallucinatedPrices,
    }
  }

  return { valid: true, safeResponse: response, mentionedPrices, hallucinatedPrices: [] }
}
