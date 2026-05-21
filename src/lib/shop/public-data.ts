import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { ShopSku, ShopVariantOption } from '@/lib/shop/admin-types'
import type {
  ShopHomeData,
  ShopProductListResult,
  ShopProductQuery,
  ShopPublicCategory,
  ShopPublicProduct,
  ShopPublicReview,
  ShopReviewsResult,
} from '@/lib/shop/public-types'
import { normalizeShopNumber } from '@/lib/shop/selection'

type RawCategory = Omit<ShopPublicCategory, 'children'> & {
  display_order?: number | null
}

type RawReview = {
  id?: string
  product_id?: string
  user_id?: string
  order_id?: string
  rating?: number | string | null
  title?: string | null
  body?: string | null
  image_urls?: string[] | null
  is_verified_purchase?: boolean | null
  is_approved?: boolean | null
  created_at?: string | null
}

type RawProduct = {
  id: string
  name: string
  slug: string
  description?: string | null
  long_description?: string | null
  category_id?: string | null
  tags?: string[] | null
  occasion_tags?: string[] | null
  thumbnail_url?: string | null
  image_urls?: string[] | null
  base_price?: number | string | null
  is_customizable?: boolean | null
  customization_label?: string | null
  is_featured?: boolean | null
  is_active?: boolean | null
  is_archived?: boolean | null
  meta_title?: string | null
  meta_description?: string | null
  created_at?: string | null
  updated_at?: string | null
  category?: { id?: string; name?: string | null; slug?: string | null } | null
  skus?: ShopSku[] | null
  variant_options?: ShopVariantOption[] | null
  reviews?: RawReview[] | null
}

const PRODUCT_SELECT = `
  id,
  name,
  slug,
  description,
  long_description,
  category_id,
  tags,
  occasion_tags,
  thumbnail_url,
  image_urls,
  base_price,
  is_customizable,
  customization_label,
  is_featured,
  is_active,
  is_archived,
  meta_title,
  meta_description,
  created_at,
  updated_at,
  category:shelf_categories(id,name,slug),
  skus:shelf_skus(
    id,
    product_id,
    sku_code,
    variant_combination,
    price,
    compare_at_price,
    stock_quantity,
    low_stock_threshold,
    weight_grams,
    variant_image_url,
    is_available,
    pre_order_eta,
    created_at,
    updated_at
  ),
  variant_options:shelf_variant_options(
    id,
    product_id,
    option_name,
    option_type,
    values,
    display_order,
    is_required,
    created_at
  ),
  reviews:shelf_reviews(rating,is_approved)
`

function normalizeSku(sku: ShopSku): ShopSku {
  return {
    ...sku,
    price: normalizeShopNumber(sku.price),
    compare_at_price: sku.compare_at_price === null ? null : normalizeShopNumber(sku.compare_at_price),
    stock_quantity: normalizeShopNumber(sku.stock_quantity),
    low_stock_threshold: sku.low_stock_threshold === null ? null : normalizeShopNumber(sku.low_stock_threshold),
    weight_grams: sku.weight_grams === null ? null : normalizeShopNumber(sku.weight_grams),
    variant_combination: sku.variant_combination ?? {},
  }
}

export function formatShopReviewerName(name: string | null | undefined) {
  const parts = String(name || 'Verified customer')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) return 'Verified customer'
  if (parts.length === 1) return parts[0]

  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

function mapProduct(row: RawProduct): ShopPublicProduct {
  const skus = (row.skus ?? []).map(normalizeSku).sort((a, b) => a.price - b.price)
  const availableSkus = skus.filter((sku) => sku.is_available !== false)
  const stockedSkus = availableSkus.filter((sku) => sku.stock_quantity > 0)
  const minSku = availableSkus[0] ?? skus[0] ?? null
  const saleSku = availableSkus.find((sku) => sku.compare_at_price !== null && sku.compare_at_price > sku.price)
  const reviews = (row.reviews ?? []).filter((review) => review.is_approved !== false)
  const reviewCount = reviews.length
  const reviewDistribution = {
    1: reviews.filter((review) => normalizeShopNumber(review.rating) === 1).length,
    2: reviews.filter((review) => normalizeShopNumber(review.rating) === 2).length,
    3: reviews.filter((review) => normalizeShopNumber(review.rating) === 3).length,
    4: reviews.filter((review) => normalizeShopNumber(review.rating) === 4).length,
    5: reviews.filter((review) => normalizeShopNumber(review.rating) === 5).length,
  }
  const avgRating = reviewCount
    ? reviews.reduce((sum, review) => sum + normalizeShopNumber(review.rating), 0) / reviewCount
    : 0
  const isLowStock = stockedSkus.some((sku) => sku.stock_quantity <= (sku.low_stock_threshold ?? 5))
  const hasPreorder = availableSkus.some((sku) => Boolean(sku.pre_order_eta))
  const inStock = stockedSkus.length > 0
  const stockStatus =
    hasPreorder ? 'pre_order' :
      !skus.length ? 'unavailable' :
        !inStock ? 'out_of_stock' :
          isLowStock ? 'low_stock' :
            'in_stock'

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    long_description: row.long_description ?? null,
    category_id: row.category_id ?? null,
    category_name: row.category?.name ?? null,
    category_slug: row.category?.slug ?? null,
    tags: row.tags ?? [],
    occasion_tags: row.occasion_tags ?? [],
    thumbnail_url: row.thumbnail_url ?? null,
    image_urls: row.image_urls ?? [],
    base_price: normalizeShopNumber(row.base_price),
    display_price: minSku ? minSku.price : normalizeShopNumber(row.base_price),
    compare_at_price: saleSku?.compare_at_price ?? null,
    is_customizable: Boolean(row.is_customizable),
    customization_label: row.customization_label ?? null,
    is_featured: Boolean(row.is_featured),
    is_active: row.is_active !== false,
    is_archived: Boolean(row.is_archived),
    meta_title: row.meta_title ?? null,
    meta_description: row.meta_description ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    skus,
    variant_options: (row.variant_options ?? []).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)),
    sku_count: skus.length,
    avg_rating: Number(avgRating.toFixed(1)),
    review_count: reviewCount,
    review_distribution: reviewDistribution,
    in_stock: inStock,
    stock_status: stockStatus,
    has_sale: Boolean(saleSku),
    has_preorder: hasPreorder,
    is_low_stock: isLowStock,
    is_new: Boolean(row.created_at && Date.now() - new Date(row.created_at).getTime() <= 7 * 24 * 60 * 60 * 1000),
  }
}

export function buildShopCategoryTree(categories: ShopPublicCategory[]) {
  const byId = new Map<string, ShopPublicCategory>()
  const roots: ShopPublicCategory[] = []

  categories.forEach((category) => {
    byId.set(category.id, { ...category, children: [] })
  })

  byId.forEach((category) => {
    if (category.parent_category_id && byId.has(category.parent_category_id)) {
      byId.get(category.parent_category_id)?.children?.push(category)
      return
    }
    roots.push(category)
  })

  return roots
}

export function getShopCategoryDescendantIds(category: ShopPublicCategory) {
  const ids = [category.id]
  for (const child of category.children ?? []) ids.push(...getShopCategoryDescendantIds(child))
  return ids
}

export async function getShopCategories() {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('shelf_categories')
    .select('id,name,slug,description,icon_emoji,banner_image_url,parent_category_id,display_order')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)

  return ((data ?? []) as RawCategory[]).map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description ?? null,
    icon_emoji: category.icon_emoji ?? null,
    banner_image_url: category.banner_image_url ?? null,
    parent_category_id: category.parent_category_id ?? null,
  }))
}

export async function getShopCategoryBySlug(slug: string) {
  const categories = await getShopCategories()
  const tree = buildShopCategoryTree(categories)
  const flat = new Map<string, ShopPublicCategory>()
  const walk = (category: ShopPublicCategory) => {
    flat.set(category.slug, category)
    category.children?.forEach(walk)
  }
  tree.forEach(walk)
  return { category: flat.get(slug) ?? null, categories, tree }
}

async function getAllShopProducts() {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('shelf_products')
    .select(PRODUCT_SELECT)
    .eq('is_active', true)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return ((data ?? []) as unknown as RawProduct[]).map(mapProduct)
}

export async function getShopProductsByIds(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)))
  if (uniqueIds.length === 0) return []

  const products = await getAllShopProducts()
  const byId = new Map(products.map((product) => [product.id, product]))
  return uniqueIds.map((id) => byId.get(id)).filter(Boolean) as ShopPublicProduct[]
}

export async function getShopProducts(query: ShopProductQuery = {}): Promise<ShopProductListResult> {
  let products = await getAllShopProducts()

  if (query.category_slug && !query.category_id) {
    const { category } = await getShopCategoryBySlug(query.category_slug)
    if (category) {
      const ids = getShopCategoryDescendantIds(category)
      products = products.filter((product) => product.category_id && ids.includes(product.category_id))
    } else {
      products = []
    }
  }

  if (query.category_id) {
    products = products.filter((product) => product.category_id === query.category_id)
  }

  if (query.featured) {
    products = products.filter((product) => product.is_featured)
  }

  if (query.in_stock) {
    products = products.filter((product) => product.in_stock)
  }

  if (query.min_price !== null && query.min_price !== undefined) {
    products = products.filter((product) => product.display_price >= Number(query.min_price))
  }

  if (query.max_price !== null && query.max_price !== undefined) {
    products = products.filter((product) => product.display_price <= Number(query.max_price))
  }

  const search = query.search?.trim().toLowerCase()
  if (search) {
    products = products.filter((product) => {
      const haystack = [
        product.name,
        product.description ?? '',
        product.category_name ?? '',
        ...product.tags,
        ...product.occasion_tags,
      ].join(' ').toLowerCase()
      return haystack.includes(search)
    })
  }

  switch (query.sort) {
    case 'price_asc':
      products.sort((a, b) => a.display_price - b.display_price)
      break
    case 'price_desc':
      products.sort((a, b) => b.display_price - a.display_price)
      break
    case 'rating':
      products.sort((a, b) => b.avg_rating - a.avg_rating || b.review_count - a.review_count)
      break
    case 'featured':
      products.sort((a, b) => Number(b.is_featured) - Number(a.is_featured))
      break
    case 'newest':
    default:
      products.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
      break
  }

  const page = Math.max(1, Number(query.page ?? 1))
  const limit = Math.min(96, Math.max(1, Number(query.limit ?? 24)))
  const total = products.length
  const start = (page - 1) * limit
  const paginated = products.slice(start, start + limit)

  return {
    products: paginated,
    total,
    page,
    limit,
    total_pages: Math.max(1, Math.ceil(total / limit)),
  }
}

export async function getShopProductBySlug(slug: string) {
  const products = await getAllShopProducts()
  return products.find((product) => product.slug === slug) ?? null
}

export async function getShopRecommendations({
  productId,
  categoryId,
  tags,
  limit = 6,
}: {
  productId?: string | null
  categoryId?: string | null
  tags?: string[]
  limit?: number
}) {
  const normalizedLimit = Math.min(12, Math.max(1, Number(limit) || 6))
  const products = await getAllShopProducts()
  const currentProduct = productId ? products.find((product) => product.id === productId) ?? null : null
  const resolvedCategoryId = currentProduct?.category_id ?? categoryId ?? null
  const resolvedTags = Array.from(new Set([
    ...(currentProduct?.tags ?? []),
    ...(currentProduct?.occasion_tags ?? []),
    ...(tags ?? []),
  ].map((tag) => tag.trim().toLowerCase()).filter(Boolean)))
  const selected: ShopPublicProduct[] = []
  const selectedIds = new Set<string>()

  const addProducts = (items: ShopPublicProduct[]) => {
    for (const item of items) {
      if (selected.length >= normalizedLimit) return
      if (item.id === productId || selectedIds.has(item.id)) continue
      selected.push(item)
      selectedIds.add(item.id)
    }
  }

  const featuredNewestSort = (left: ShopPublicProduct, right: ShopPublicProduct) =>
    Number(right.is_featured) - Number(left.is_featured) ||
    new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime()

  if (resolvedCategoryId) {
    addProducts(
      products
        .filter((product) => product.category_id === resolvedCategoryId)
        .sort(featuredNewestSort)
    )
  }

  if (selected.length < normalizedLimit && resolvedTags.length > 0) {
    addProducts(
      products
        .filter((product) => {
          const productTags = [...product.tags, ...product.occasion_tags].map((tag) => tag.toLowerCase())
          return productTags.some((tag) => resolvedTags.includes(tag))
        })
        .sort(featuredNewestSort)
    )
  }

  if (selected.length < normalizedLimit) {
    addProducts(
      products.sort((left, right) => new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime())
    )
  }

  return selected.slice(0, normalizedLimit)
}

export async function getShopProductReviews(
  productId: string,
  page = 1,
  limit = 10
): Promise<ShopReviewsResult> {
  const supabase = await createServerSupabaseClient()
  const normalizedPage = Math.max(1, page)
  const normalizedLimit = Math.min(30, Math.max(1, limit))
  const from = (normalizedPage - 1) * normalizedLimit
  const to = from + normalizedLimit - 1

  const { data, count, error } = await supabase
    .from('shelf_reviews')
    .select('id,product_id,user_id,order_id,rating,title,body,image_urls,is_verified_purchase,created_at', { count: 'exact' })
    .eq('product_id', productId)
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as RawReview[]
  const userIds = Array.from(new Set(rows.map((review) => review.user_id).filter(Boolean))) as string[]
  const namesById = new Map<string, string>()

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id,name,full_name')
      .in('id', userIds)
    ;((profiles ?? []) as { id: string; name?: string | null; full_name?: string | null }[]).forEach((profile) => {
      namesById.set(profile.id, formatShopReviewerName(profile.full_name || profile.name || 'Verified customer'))
    })
  }

  const reviews: ShopPublicReview[] = rows.map((review) => ({
    id: review.id ?? '',
    product_id: review.product_id ?? productId,
    user_id: review.user_id ?? '',
    order_id: review.order_id ?? '',
    rating: normalizeShopNumber(review.rating),
    title: review.title ?? null,
    body: review.body ?? null,
    image_urls: review.image_urls ?? [],
    is_verified_purchase: review.is_verified_purchase !== false,
    created_at: review.created_at ?? null,
    reviewer_name: namesById.get(review.user_id ?? '') ?? 'Verified customer',
  }))

  return {
    reviews,
    total: count ?? reviews.length,
    page: normalizedPage,
    limit: normalizedLimit,
    total_pages: Math.max(1, Math.ceil((count ?? reviews.length) / normalizedLimit)),
  }
}

export async function getShopHomeData(): Promise<ShopHomeData> {
  const [categories, productResult] = await Promise.all([
    getShopCategories(),
    getShopProducts({ limit: 96, sort: 'newest' }),
  ])
  const products = productResult.products
  const occasionTags = ['Diwali', 'Gaming Setup', 'Office Desk', 'Gift']

  return {
    featured_products: products.filter((product) => product.is_featured).slice(0, 8),
    new_arrivals: products.slice(0, 8),
    categories,
    occasion_collections: occasionTags.map((tag) => ({
      tag,
      products: products
        .filter((product) =>
          product.occasion_tags.some((item) => item.toLowerCase().includes(tag.toLowerCase())) ||
          product.tags.some((item) => item.toLowerCase().includes(tag.toLowerCase()))
        )
        .slice(0, 4),
    })).filter((collection) => collection.products.length > 0),
  }
}
