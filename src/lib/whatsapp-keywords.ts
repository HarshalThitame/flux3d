const KNOWN_MATERIALS = [
  'pla', 'pla+', 'pla plus', 'abs', 'petg', 'petg+', 'asa', 'tpu', 'resin',
  'nylon', 'polycarbonate', 'carbon fiber', 'carbon fibre',
  'wood', 'wood fill', 'metal fill', 'metal', 'silk', 'marble',
  'glow in the dark', 'transparent', 'clear',
]

export function extractSearchKeywords(message: string): string[] {
  const text = message.toLowerCase()
  const keywords: string[] = []

  for (const material of KNOWN_MATERIALS) {
    const hasWordBoundary = material.includes(' ')
      ? text.includes(material)
      : new RegExp(`\\b${material}\\b`).test(text)
    if (hasWordBoundary) {
      keywords.push(material)
    }
  }

  const numbers = text.match(/\b\d{4,}\b/g)
  if (numbers) keywords.push(...numbers)

  if (/\b(price|pricing|cost|rate|quote|quotation)\b/.test(text)) keywords.push('pricing')
  if (/\b(stock|available|in stock|out of stock|availability)\b/.test(text)) keywords.push('stock')
  if (/\b(shipping|delivery|courier|dispatch|track|tracking)\b/.test(text)) keywords.push('shipping')

  return [...new Set(keywords)]
}
