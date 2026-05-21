import type { ShopSku, ShopVariantOption } from '@/lib/shop/admin-types'

export type ShopPublicCategory = {
  id: string
  name: string
  slug: string
  description: string | null
  icon_emoji: string | null
  banner_image_url: string | null
  parent_category_id: string | null
  children?: ShopPublicCategory[]
}

export type ShopReviewSummary = {
  avg_rating: number
  review_count: number
  distribution?: Record<1 | 2 | 3 | 4 | 5, number>
}

export type ShopPublicProduct = {
  id: string
  name: string
  slug: string
  description: string | null
  long_description: string | null
  category_id: string | null
  category_name: string | null
  category_slug: string | null
  tags: string[]
  occasion_tags: string[]
  thumbnail_url: string | null
  image_urls: string[]
  base_price: number
  display_price: number
  compare_at_price: number | null
  is_customizable: boolean
  customization_label: string | null
  is_featured: boolean
  is_active: boolean
  is_archived: boolean
  meta_title: string | null
  meta_description: string | null
  created_at: string | null
  updated_at: string | null
  skus: ShopSku[]
  variant_options: ShopVariantOption[]
  sku_count: number
  avg_rating: number
  review_count: number
  review_distribution: Record<1 | 2 | 3 | 4 | 5, number>
  in_stock: boolean
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'pre_order' | 'unavailable'
  has_sale: boolean
  has_preorder: boolean
  is_low_stock: boolean
  is_new: boolean
}

export type ShopProductListResult = {
  products: ShopPublicProduct[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export type ShopPublicReview = {
  id: string
  product_id: string
  user_id: string
  order_id: string
  rating: number
  title: string | null
  body: string | null
  image_urls: string[]
  is_verified_purchase: boolean
  created_at: string | null
  reviewer_name: string
}

export type ShopReviewsResult = {
  reviews: ShopPublicReview[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export type ShopHomeData = {
  featured_products: ShopPublicProduct[]
  new_arrivals: ShopPublicProduct[]
  categories: ShopPublicCategory[]
  occasion_collections: {
    tag: string
    products: ShopPublicProduct[]
  }[]
}

export type ShopProductQuery = {
  category_id?: string | null
  category_slug?: string | null
  featured?: boolean
  search?: string | null
  min_price?: number | null
  max_price?: number | null
  in_stock?: boolean
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'featured' | 'rating'
  page?: number
  limit?: number
}
