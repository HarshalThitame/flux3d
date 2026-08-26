export type QuoteDriver = {
  title: string
  description: string
}

export const quoteDrivers: QuoteDriver[] = [
  {
    title: 'Material',
    description:
      'PLA, ABS, PETG, resin, and specialty filaments are priced by consumption and availability.',
  },
  {
    title: 'Geometry',
    description:
      'Wall thickness, supports, infill, and part orientation shape machine time and material use.',
  },
  {
    title: 'Finish',
    description:
      'Sanding, priming, painting, smoothing, and assembly are quoted as controlled add-ons.',
  },
  {
    title: 'Timeline',
    description:
      'Standard, priority, and batch runs are planned around quality checks and delivery dates.',
  },
]

export const workflowSteps = [
  'Upload your STL, STEP, OBJ, or reference files.',
  'Choose material, finish, quantity, and delivery priority.',
  'Receive a clear quote with print, finish, and shipping details.',
  'Approve the order and track production through dispatch.',
] as const

export const assuranceItems = [
  'No hidden finishing charges',
  'Material and print-time review',
  'Pan-India shipping support',
] as const

export type PricingFaq = {
  question: string
  answer: string
}

export const pricingFaqs: PricingFaq[] = [
  {
    question: 'How is the cost of a 3D print calculated?',
    answer:
      'Every quote starts from material consumption (weight × rate per gram) plus machine time driven by geometry — wall thickness, infill, supports, and orientation. Finishing, assembly, and delivery are added as transparent line items before you approve anything.',
  },
  {
    question: 'Why is there no fixed price list for finished parts?',
    answer:
      'Two parts with identical weight can demand very different machine time and finishing. Instead of misleading flat rates, we publish live material rates per gram and confirm the exact quote after reviewing your file — the rate is locked before printing begins.',
  },
  {
    question: 'Do bulk or batch orders get better pricing?',
    answer:
      'Yes. Batch production shares setup and machine preparation across units, which lowers the effective per-part cost. Corporate gifting and repeat business orders are quoted with volume-based pricing on request.',
  },
  {
    question: 'Are there any hidden charges?',
    answer:
      'No. Material review, print-time planning, and standard quality checks are included in every quote. Finishing, assembly, and shipping are quoted separately so you always see the full breakdown before approving the order.',
  },
]

export const pricingPageMeta = {
  title: '3D Printing Price List India — Live Material Rates & Transparent Quotes | Flux3D',
  description:
    'Live 3D printing prices in India: transparent material rates per gram (PLA, ABS, PETG, resin), geometry-driven machine time, and itemised quotes. No hidden charges, pan-India delivery, instant online quotes.',
} as const
