const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']
const TEENS = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

function underThousand(n: number) {
  const parts: string[] = []
  const hundreds = Math.floor(n / 100)
  const rest = n % 100

  if (hundreds > 0) {
    parts.push(`${ONES[hundreds]} hundred`)
  }

  if (rest >= 10 && rest < 20) {
    parts.push(TEENS[rest - 10])
  } else if (rest >= 20) {
    const ten = Math.floor(rest / 10)
    const unit = rest % 10
    parts.push(unit > 0 ? `${TENS[ten]} ${ONES[unit]}` : TENS[ten])
  } else if (rest > 0) {
    parts.push(ONES[rest])
  }

  return parts.join(' ').trim()
}

export function numberToWords(value: number) {
  const n = Math.max(0, Math.round(value))
  if (n === 0) return 'zero rupees only'

  const crore = Math.floor(n / 10000000)
  const lakh = Math.floor((n % 10000000) / 100000)
  const thousand = Math.floor((n % 100000) / 1000)
  const remainder = n % 1000
  const parts: string[] = []

  if (crore) parts.push(`${underThousand(crore)} crore`)
  if (lakh) parts.push(`${underThousand(lakh)} lakh`)
  if (thousand) parts.push(`${underThousand(thousand)} thousand`)
  if (remainder) parts.push(underThousand(remainder))

  return `${parts.join(' ').replace(/\s+/g, ' ').trim()} rupees only`
}
