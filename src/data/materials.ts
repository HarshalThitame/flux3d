export type MaterialSpec = {
  id: string
  name: string
  tag: string
  icon: string
  description: string
  color?: string
  gradient?: string
  properties: {
    strength: string
    flexibility: string
    tempResistance: string
    difficulty: string
  }
  useCases: string[]
  pros: string[]
  cons: string[]
  settings?: {
    nozzle: string
    bed: string
    speed: string
  }
}

export const materials: MaterialSpec[] = [
  {
    id: 'pla-plus',
    name: 'PLA+',
    tag: 'Easy Print',
    icon: '🧩',
    description:
      'A refined PLA blend with better toughness and a clean surface finish for fast prototypes and polished presentation pieces.',
    color: '#e8e8e8',
    properties: {
      strength: 'Medium',
      flexibility: 'Low',
      tempResistance: 'Low',
      difficulty: 'Easy',
    },
    useCases: ['Concept models', 'Display pieces', 'Fit-check prototypes'],
    pros: ['Crisp detail', 'Low warping', 'Budget-friendly'],
    cons: ['Softens with heat', 'Less durable outdoors'],
    settings: {
      nozzle: '205-220°C',
      bed: '50-60°C',
      speed: '50-120 mm/s',
    },
  },
  {
    id: 'abs',
    name: 'ABS',
    tag: 'High Temp',
    icon: '⚙️',
    description:
      'A durable engineering plastic for parts that need impact resistance, stronger service temperatures, and real functional use.',
    color: '#222222',
    properties: {
      strength: 'High',
      flexibility: 'Medium',
      tempResistance: 'High',
      difficulty: 'Advanced',
    },
    useCases: ['Automotive brackets', 'Enclosures', 'Workshop fixtures'],
    pros: ['Tough and durable', 'Good machinability', 'Heat capable'],
    cons: ['Warp-prone', 'Needs enclosure', 'Stronger fumes'],
    settings: {
      nozzle: '235-255°C',
      bed: '90-110°C',
      speed: '40-80 mm/s',
    },
  },
  {
    id: 'petg',
    name: 'PETG',
    tag: 'Balanced Strength',
    icon: '🔷',
    description:
      'A reliable all-rounder that balances strength, layer adhesion, and moderate flexibility for practical end-use parts.',
    color: 'rgba(100,200,255,0.75)',
    properties: {
      strength: 'High',
      flexibility: 'Medium',
      tempResistance: 'Medium',
      difficulty: 'Easy-Medium',
    },
    useCases: ['Functional parts', 'Jigs and holders', 'Utility components'],
    pros: ['Strong layer bonding', 'Moisture resistant', 'Good chemical resistance'],
    cons: ['Can string', 'Surface can mark easily'],
    settings: {
      nozzle: '230-250°C',
      bed: '70-85°C',
      speed: '40-90 mm/s',
    },
  },
  {
    id: 'asa',
    name: 'ASA',
    tag: 'Outdoor UV',
    icon: '☀️',
    description:
      'An outdoor-ready material with ABS-like performance plus stronger UV and weather resistance for exposed parts that stay outside.',
    color: '#c0392b',
    properties: {
      strength: 'High',
      flexibility: 'Medium',
      tempResistance: 'High',
      difficulty: 'Advanced',
    },
    useCases: ['Outdoor housings', 'Vehicle exterior parts', 'Weatherproof covers'],
    pros: ['UV stable', 'Heat resistant', 'Durable finish'],
    cons: ['Warping risk', 'Needs controlled environment'],
    settings: {
      nozzle: '240-260°C',
      bed: '90-110°C',
      speed: '40-70 mm/s',
    },
  },
  {
    id: 'tpu',
    name: 'TPU',
    tag: 'Rubber Flex',
    icon: '🌀',
    description:
      'A flexible elastomer used for parts that need grip, impact absorption, or reliable bend without cracking.',
    color: '#27ae60',
    properties: {
      strength: 'Medium',
      flexibility: 'High',
      tempResistance: 'Medium',
      difficulty: 'Medium',
    },
    useCases: ['Gaskets', 'Protective bumpers', 'Wearables and grips'],
    pros: ['Shock absorbing', 'Excellent flexibility', 'Good abrasion resistance'],
    cons: ['Slow printing', 'Can be tricky to feed'],
    settings: {
      nozzle: '220-240°C',
      bed: '40-60°C',
      speed: '20-45 mm/s',
    },
  },
  {
    id: 'resin-4k',
    name: 'Resin 4K',
    tag: 'Ultra Detail',
    icon: '💎',
    description:
      'A high-resolution photopolymer for extremely fine detail, smooth surfaces, and precision-heavy visual parts.',
    color: '#8e44ad',
    properties: {
      strength: 'Medium',
      flexibility: 'Low',
      tempResistance: 'Low-Medium',
      difficulty: 'Medium',
    },
    useCases: ['Miniatures', 'Jewelry masters', 'Dental and fine-detail models'],
    pros: ['Very sharp detail', 'Smooth finish', 'Excellent small features'],
    cons: ['More brittle', 'Post-processing required'],
    settings: {
      nozzle: 'N/A',
      bed: 'N/A',
      speed: '35-60 µm layers',
    },
  },
  {
    id: 'silk-gold',
    name: 'Silk Gold',
    tag: 'Decorative',
    icon: '✨',
    description:
      'A glossy PLA-style filament designed for premium visual appeal, branding pieces, and decorative presentations.',
    color: '#d4a017',
    properties: {
      strength: 'Low-Medium',
      flexibility: 'Low',
      tempResistance: 'Low',
      difficulty: 'Easy',
    },
    useCases: ['Brand models', 'Display items', 'Decorative parts'],
    pros: ['Premium shine', 'Great for visual pieces', 'Easy to print'],
    cons: ['Lower structural performance', 'Shows layer stress on sharp bends'],
    settings: {
      nozzle: '205-220°C',
      bed: '50-60°C',
      speed: '40-80 mm/s',
    },
  },
  {
    id: 'multi-color',
    name: 'Multi-Color',
    tag: 'AMS Ready',
    icon: '🎨',
    description:
      'A multi-material workflow using the Bambu AMS for color-separated parts, logos, labeling, and presentation models that need visual impact.',
    gradient: 'linear-gradient(135deg, #3498db, #8b5cf6, #2ecc71, #f39c12)',
    properties: {
      strength: 'Depends on base material',
      flexibility: 'Depends on base material',
      tempResistance: 'Depends on base material',
      difficulty: 'Advanced',
    },
    useCases: ['Logos', 'Color-coded prototypes', 'Marketing and display models'],
    pros: ['Built-in color separation', 'High visual impact', 'No manual painting needed'],
    cons: ['Longer print time', 'More waste from color swaps'],
    settings: {
      nozzle: 'Material dependent',
      bed: 'Material dependent',
      speed: 'Material dependent',
    },
  },
]
