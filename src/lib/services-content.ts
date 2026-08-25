export type ServiceVertical = {
  slug: string
  category: string
  title: string
  description: string
  highlights: [string, string, string]
  spec: string
}

export const serviceVerticals: ServiceVertical[] = [
  {
    slug: 'spare-parts-prototypes',
    category: 'Engineering',
    title: 'Spare Parts & Functional Prototypes',
    description:
      'Replacement components, fixtures, housings, brackets, and fit-critical prototypes in FDM and engineering-grade polymers — planned around strength, tolerance, and repeatability for low-volume production.',
    highlights: ['PETG, ABS, ASA & Nylon', 'Tolerance-led print planning', 'Low-volume production runs'],
    spec: 'Functional grade',
  },
  {
    slug: 'architecture-models',
    category: 'Architecture',
    title: 'Architecture Models & Maquettes',
    description:
      'Presentation-ready scale models produced from CAD, Revit, Rhino, SketchUp exports, or drawings — with clean multi-part assemblies and refined display finishes.',
    highlights: ['Scale model planning', 'Multi-part assemblies', 'Smooth display finish'],
    spec: 'Display grade',
  },
  {
    slug: 'student-projects',
    category: 'Education',
    title: 'Student Projects & Final Year Builds',
    description:
      'Deadline-aware 3D printing for working prototypes, robotics, enclosures, demo models, and academic presentation pieces — with file preparation help and budget guidance.',
    highlights: ['Budget-friendly guidance', 'Deadline-tracked production', 'File preparation support'],
    spec: 'Fast-track',
  },
  {
    slug: 'custom-products',
    category: 'Products',
    title: 'Custom Products & Small-Batch Runs',
    description:
      'Desk accessories, décor, organizers, branded objects, and niche product batches printed with consistent colour, finish, and repeatability across every unit.',
    highlights: ['Small-batch consistency', 'Custom colours & finishes', 'Packaging-ready output'],
    spec: 'Batch ready',
  },
  {
    slug: 'medical-dental-models',
    category: 'Medical',
    title: 'Medical & Dental Models',
    description:
      'High-detail anatomical, dental, and surgical planning models using precision resin workflows suited for clinical clarity, review, and urgent timelines.',
    highlights: ['High-detail resin workflow', 'Dental masters & guides', 'Urgent-run support'],
    spec: 'Fine detail',
  },
  {
    slug: 'props-cosplay',
    category: 'Creative',
    title: 'Props, Costumes & Display Pieces',
    description:
      'Large-format props, cosplay armour and components, content-production pieces, and paint-ready assemblies planned for wearable weight and strength.',
    highlights: ['Large assembly planning', 'Paint-ready surfaces', 'Lightweight part strategy'],
    spec: 'Paint ready',
  },
  {
    slug: 'corporate-gifting',
    category: 'Corporate',
    title: 'Corporate Gifts & Branded Objects',
    description:
      'Custom trophies, branded desk items, event giveaways, and personalised gifting runs produced with consistent finish, quality checks, and Pan-India dispatch.',
    highlights: ['Brand logo integration', 'Bulk-order consistency', 'Premium packaging'],
    spec: 'Brand ready',
  },
]

export type OrderStep = {
  step: string
  title: string
  detail: string
  description: string
}

export const orderSteps: OrderStep[] = [
  {
    step: '01',
    detail: 'Files, sketches, references',
    title: 'Upload or describe',
    description: 'Send an STL, 3MF, STEP, sketch, reference image, or a clear description of what you need.',
  },
  {
    step: '02',
    detail: 'Material, finish, timeline',
    title: 'Material & quote review',
    description: 'We review requirements, suggest material and finish, then share a transparent quote and timeline.',
  },
  {
    step: '03',
    detail: 'Slicing, production, finish',
    title: 'Print & finish',
    description: 'Your part is oriented, printed, inspected, and finished based on the selected service level.',
  },
  {
    step: '04',
    detail: 'QC, packing, dispatch',
    title: 'Packed & delivered',
    description: 'Collect locally or receive secure pan-India delivery with the finished part ready to use or present.',
  },
]

export const qualityGates = [
  'File health',
  'Material fit',
  'Slicing strategy',
  'Surface finish',
  'Dispatch QC',
] as const

export type TrustProof = {
  metric: string
  label: string
  title: string
  body: string
}

export const trustProofs: TrustProof[] = [
  {
    metric: '3–5 days',
    label: 'typical delivery',
    title: 'Fast, planned turnaround',
    body: 'Timelines are estimated from real print time, material prep, finishing, and dispatch — not vague delivery promises.',
  },
  {
    metric: '100%',
    label: 'quality checked',
    title: 'Production-minded quality',
    body: 'Parts are reviewed for orientation, strength, supports, finish, and visible issues before they leave the workshop.',
  },
  {
    metric: '10+',
    label: 'materials',
    title: 'Material-first guidance',
    body: 'Materials are recommended by load, temperature, finish, flexibility, and budget so the result matches the use case.',
  },
  {
    metric: '1 hr',
    label: 'fast response',
    title: 'Direct project support',
    body: 'Discuss the job directly with the team planning your print — especially when fit, finish, or deadlines matter.',
  },
]

export const heroStats = [
  { value: '500+', label: 'orders delivered' },
  { value: '±0.1mm', label: 'dimensional accuracy' },
  { value: '10+', label: 'engineering materials' },
  { value: '19k+', label: 'pin codes served' },
] as const

export type ServiceFaq = {
  question: string
  answer: string
}

export const servicesFaqs: ServiceFaq[] = [
  {
    question: 'How do you price a 3D printing job?',
    answer:
      'Pricing depends on material, weight, print time, finishing, complexity, and delivery requirements. Upload your file for an instant estimate, or message us if you need design review before quoting.',
  },
  {
    question: 'Can you help choose the right material?',
    answer:
      'Yes. We recommend materials based on use case, strength, heat resistance, finish, flexibility, and budget. PLA+ is great for prototypes, PETG and ABS for functional parts, and resin for fine detail.',
  },
  {
    question: 'What files can I send?',
    answer:
      'STL, 3MF, STEP, IGES, and OBJ are preferred. We can also review sketches, photos, or reference images when you need help turning an idea into a printable model.',
  },
  {
    question: 'Do you take bulk or business orders?',
    answer:
      'Yes. We support small-batch production, corporate gifting, event giveaways, educational projects, and repeatable business orders with consistent material and finish settings.',
  },
  {
    question: 'What happens if a print fails quality check?',
    answer:
      'If a print fails our internal check, we reprint before dispatch. Parts are reviewed for visible defects, support marks, fit-critical areas, and finish expectations.',
  },
]

export const servicesPageMeta = {
  title: '3D Printing Services India — FDM, Resin & Rapid Prototyping | Flux3D',
  description:
    'Professional 3D printing services across India: FDM & resin printing, rapid prototyping, spare parts, architecture models, medical & dental models, corporate gifting. Instant quotes, ±0.1mm accuracy, pan-India delivery.',
} as const

export type LandingOffering = {
  slug: string
  tag: string
  title: string
  description: string
  pills: string[]
  price: string
  cta: string
  link?: string
  span?: boolean
}

export const landingOfferings: LandingOffering[] = [
  {
    slug: 'custom-3d-printing',
    tag: 'Custom Printing',
    title: 'Custom 3D Printing',
    description:
      'Upload a model or share your requirements and we review the file, material, colour, quantity and finish before confirming the order.',
    pills: ['3D models', 'Prototypes', 'Functional parts', 'Custom finishes'],
    price: 'Quoted per order',
    cta: 'Request Quote →',
    span: true,
  },
  {
    slug: 'model-printing',
    tag: 'Model Printing',
    title: 'Architectural and Presentation Models',
    description:
      'Useful for product mockups, architecture models, classroom submissions and presentation pieces that need a physical form.',
    pills: ['Architecture', 'Display models', 'Mockups', 'Submission pieces'],
    price: 'Quoted per model',
    cta: 'Share Your File →',
  },
  {
    slug: 'ready-made-products',
    tag: 'Ready-made',
    title: 'Ready-Made Products',
    description:
      'Pre-designed, pre-printed products available for direct purchase where the catalogue lists them.',
    pills: ['Direct purchase', 'Gift items', 'Desk accessories', 'Home items'],
    price: 'As listed',
    cta: 'Browse Catalogue →',
    link: '/3d-shop',
  },
  {
    slug: 'finishing',
    tag: 'Finishing',
    title: 'Finishing and Post-Processing',
    description:
      'Support for sanding, cleaning, assembly and other finishing steps when selected and approved for the order.',
    pills: ['Sanding', 'Assembly', 'Cleaning', 'Finishing'],
    price: 'By quote',
    cta: 'Discuss Finish →',
  },
  {
    slug: 'business-and-bulk-orders',
    tag: 'Business',
    title: 'Business and Bulk Orders',
    description:
      'Suitable for organizations that need repeated parts, branded pieces or multi-quantity print runs with quotation-based pricing.',
    pills: ['Batches', 'Branding', 'Repeat orders', 'Bulk pricing'],
    price: 'Custom quote',
    cta: 'Request Bulk Quote →',
  },
  {
    slug: 'design-review',
    tag: 'Support',
    title: 'Design Review and File Checks',
    description:
      'If a design looks unsuitable for printing, we can review the file, suggest changes, place the order on hold, or decline it when needed.',
    pills: ['File review', 'Dimension check', 'Revision notes', 'Order hold'],
    price: 'Included in quote',
    cta: 'Ask for Review →',
  },
  {
    slug: 'dispatch-delivery',
    tag: 'Delivery',
    title: 'Dispatch and Delivery',
    description:
      'Orders are shipped after production and quality checks, with tracking shared when the courier provides it.',
    pills: ['Tracked shipping', 'India delivery', 'Courier handoff', 'Delivery support'],
    price: 'Shipping quoted separately',
    cta: 'Read Delivery Policy →',
  },
]
