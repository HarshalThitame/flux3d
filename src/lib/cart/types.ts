import { type QuoteConfig } from '@/lib/quote/types';

export type CartItem = {
  id: string;
  quoteId?: string;
  name: string;
  fileName?: string;
  fileUrl?: string;
  image?: string;
  price: number;
  quantity?: number;
  material: string;
  color: string;
  colorHex?: string;
  infill?: number;
  layerHeight?: number;
  supports?: boolean;
  estimatedTime?: number;
  weight?: number;
  dimensions?: {
    x: number;
    y: number;
    z: number;
  };
  config?: QuoteConfig;
  addedAt?: string;
}

export type CartOrderItem = {
  quoteId?: string;
  fileUrl?: string;
  fileName?: string;
  material: string;
  color: string;
  infill: number;
  layerHeight: number;
  supports: boolean;
  price: number;
  estimatedTime: number;
  weight: number;
  dimensions: {
    x: number;
    y: number;
    z: number;
  };
}

export type CartSummary = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  deliveryCharge: number;
  total: number;
}

export const CART_STORAGE_KEY = 'flux3d-cart';
