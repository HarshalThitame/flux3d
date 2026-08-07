import type { ShopVariantOption } from '@/lib/shop/admin-types'

export type TemplateVariant = {
  option_name: string
  option_type: ShopVariantOption['option_type']
  values: string[]
  is_required: boolean
}

export type ProductTemplate = {
  id: string
  name: string
  emoji: string
  description: string
  short_description: string
  long_description: string
  tags: string[]
  occasion_tags: string[]
  is_customizable: boolean
  customization_label: string
  variants: TemplateVariant[]
}

export const productTemplates: ProductTemplate[] = [
  {
    id: '3d-figurine',
    name: '3D Figurine',
    emoji: '🐉',
    description: 'Collectible or decorative figurine with size, material, and finish choices.',
    short_description: 'A detailed, handcrafted 3D-printed figurine finished to premium quality.',
    long_description:
      '<h2>Why you\'ll love {{name}}</h2><p>Handcrafted with a premium 3D-printed finish, {{name}} brings personality to any shelf, desk, or display case.</p><h3>Features</h3><ul><li>Precision 3D-printed detailing with a smooth, durable surface</li><li>Choice of PLA or high-detail Resin materials</li><li>Matte or glossy finish options to match your space</li></ul><h3>Materials & build</h3><p>Made from high-quality, sustainably sourced 3D printing filament and resin for long-lasting durability.</p>',
    tags: ['figurine', '3d print', 'collectible', 'home decor', 'desk accessory', 'statue'],
    occasion_tags: ['Gaming Setup', 'Home Decor', 'Birthday'],
    is_customizable: false,
    customization_label: '',
    variants: [
      { option_name: 'Size', option_type: 'button', values: ['Small (10cm)', 'Medium (15cm)', 'Large (25cm)'], is_required: true },
      { option_name: 'Material', option_type: 'dropdown', values: ['PLA', 'Resin', 'PETG'], is_required: true },
      { option_name: 'Finish', option_type: 'dropdown', values: ['Matte', 'Glossy', 'Metallic'], is_required: false },
    ],
  },
  {
    id: 'led-desk-lamp',
    name: 'LED Desk Lamp',
    emoji: '💡',
    description: 'Ambient or task lamp with LED color, base material, and power options.',
    short_description: 'A sleek 3D-printed LED lamp that elevates your desk, shelf, or gaming setup.',
    long_description:
      '<h2>Light up your space with {{name}}</h2><p>{{name}} blends modern design with functional ambient lighting for work, play, and relaxation.</p><h3>Features</h3><ul><li>Warm, cool, or RGB LED lighting options</li><li>3D-printed diffuser for soft, even glow</li><li>Multiple base material choices</li></ul><h3>Power</h3><p>USB-C, battery, or plug-in variants keep your setup clean and cable-friendly.</p>',
    tags: ['led lamp', 'desk lighting', '3d printed', 'gaming setup', 'rgb', 'ambient light'],
    occasion_tags: ['Gaming Setup', 'Office Desk', 'Birthday'],
    is_customizable: false,
    customization_label: '',
    variants: [
      { option_name: 'LED Color', option_type: 'swatch_color', values: ['Warm White', 'Cool White', 'RGB'], is_required: true },
      { option_name: 'Base Material', option_type: 'button', values: ['Wood', 'Metal', 'Black PLA'], is_required: true },
      { option_name: 'Power Type', option_type: 'dropdown', values: ['USB-C', 'Battery', 'Plug-in'], is_required: true },
    ],
  },
  {
    id: 'custom-engraving-gift',
    name: 'Custom Engraving Gift',
    emoji: '🎁',
    description: 'Personalized gift with name engraving, material, and size choices.',
    short_description: 'A thoughtful, personalized gift with custom engraving to make it truly one-of-a-kind.',
    long_description:
      '<h2>A gift as unique as they are — {{name}}</h2><p>{{name}} lets you add a personal message, name, or date that we engrave into the piece.</p><h3>Personalization</h3><p>Add a name, initials, or a short message during checkout and we will engrave it with precision.</p><h3>Features</h3><ul><li>Premium engraved finish on selected materials</li><li>Beautiful keepsake-grade packaging</li><li>Multiple sizes to choose from</li></ul>',
    tags: ['personalized', 'gift', 'engraving', 'custom', 'keepsake'],
    occasion_tags: ['Anniversary', 'Wedding Gift', 'Birthday'],
    is_customizable: true,
    customization_label: 'Enter name to engrave',
    variants: [
      { option_name: 'Material', option_type: 'dropdown', values: ['Walnut Wood', 'Bamboo', 'Black Acrylic'], is_required: true },
      { option_name: 'Size', option_type: 'button', values: ['Small', 'Medium', 'Large'], is_required: true },
    ],
  },
  {
    id: 'tech-stand',
    name: 'Phone & Tech Stand',
    emoji: '📱',
    description: 'Minimal desk organizer for phones, tablets, or headphones.',
    short_description: 'A minimal, sturdy 3D-printed stand that keeps your tech organized and within reach.',
    long_description:
      '<h2>Declutter your desk with {{name}}</h2><p>{{name}} is a functional, minimal stand designed for daily use.</p><h3>Features</h3><ul><li>Stable anti-slip base</li><li>Compatible with phones, tablets, and headphones</li><li>Available in multiple colorways and finishes</li></ul><h3>Materials</h3><p>Printed in durable, lightweight materials with a clean matte or glossy finish.</p>',
    tags: ['phone stand', 'desk organizer', 'tech accessory', 'minimal', '3d printed'],
    occasion_tags: ['Office Desk', 'Gaming Setup'],
    is_customizable: false,
    customization_label: '',
    variants: [
      { option_name: 'Color', option_type: 'swatch_color', values: ['Black', 'White', 'Wood', 'Grey'], is_required: true },
      { option_name: 'Finish', option_type: 'button', values: ['Matte', 'Glossy'], is_required: false },
    ],
  },
  {
    id: 'home-decor-vase',
    name: 'Home Decor Vase',
    emoji: '🏺',
    description: 'Decorative vase or planter with size and style options.',
    short_description: 'A modern 3D-printed vase that adds a sculptural touch to any room.',
    long_description:
      '<h2>Elevate your space with {{name}}</h2><p>{{name}} is a sculptural centerpiece that works beautifully on its own or with dried florals.</p><h3>Features</h3><ul><li>Water-tight interior for fresh stems</li><li>Stylish geometric and classic silhouettes</li><li>Lightweight yet sturdy construction</li></ul><h3>Care</h3><p>Wipe clean with a soft, damp cloth.</p>',
    tags: ['vase', 'home decor', 'planter', '3d printed', 'centerpiece'],
    occasion_tags: ['Home Decor', 'Anniversary'],
    is_customizable: false,
    customization_label: '',
    variants: [
      { option_name: 'Size', option_type: 'button', values: ['Small', 'Medium', 'Large'], is_required: true },
      { option_name: 'Style', option_type: 'dropdown', values: ['Classic', 'Modern', 'Geometric'], is_required: true },
    ],
  },
]

export function templateLongDescription(template: ProductTemplate, productName: string) {
  return template.long_description.replaceAll('{{name}}', productName || template.name)
}
