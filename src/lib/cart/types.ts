import type { QuoteConfig } from '@/lib/quote/types'

export type CartItem = {
  quoteId: string
  fileUrl: string
  fileName: string
  material: string
  color: string
  colorHex: string
  infill: number
  layerHeight: number
  supports: boolean
  price: number
  estimatedTime: number
  dimensions: {
    x: number
    y: number
    z: number
  }
  weight: number
  config: QuoteConfig
  addedAt: string
}

export type CartSummary = {
  items: CartItem[]
  itemCount: number
  subtotal: number
  deliveryCharge: number
  total: number
}

export const CART_STORAGE_KEY = 'flux3d-cart'
