import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ShopShell from '@/components/shop/ShopShell'
import ShopProductDetailClient from '@/components/shop/ShopProductDetailClient'
import { getCurrentUserProfile } from '@/lib/auth/server'
import { getShopProductBySlug, getShopProductReviews } from '@/lib/shop/public-data'
import type { ShopPublicProduct } from '@/lib/shop/public-types'
import { absoluteUrl } from '@/lib/site'
import { CSP_NONCE } from '@/lib/csp'

export const dynamic = 'force-dynamic'

function toJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

function getShopAvailability(product: ShopPublicProduct) {
  if (product.stock_status === 'pre_order') return 'https://schema.org/PreOrder'
  if (product.stock_status === 'out_of_stock' || product.stock_status === 'unavailable') {
    return 'https://schema.org/OutOfStock'
  }
  if (product.stock_status === 'low_stock') return 'https://schema.org/LimitedAvailability'
  return 'https://schema.org/InStock'
}

function makeProductSchema(product: ShopPublicProduct) {
  const url = absoluteUrl(`/3d-shop/product/${product.slug}`)
  const images = [product.thumbnail_url, ...(product.image_urls ?? [])].filter(Boolean) as string[]
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: product.name,
    description: product.meta_description || product.description || undefined,
    url,
    image: images,
    sku: product.skus[0]?.sku_code ?? undefined,
    brand: { '@type': 'Brand', name: 'Flux3D' },
    category: product.category_name ?? undefined,
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'INR',
      price: product.display_price,
      availability: getShopAvailability(product),
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: 'Flux3D' },
    },
  }

  if (product.review_count > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.avg_rating,
      reviewCount: product.review_count,
      bestRating: 5,
      worstRating: 1,
    }
  }

  return schema
}

function makeBreadcrumbSchema(product: ShopPublicProduct) {
  const items = [
    { position: 1, name: 'Home', item: absoluteUrl('/') },
    { position: 2, name: '3D Shop', item: absoluteUrl('/3d-shop') },
  ]

  if (product.category_slug && product.category_name) {
    items.push({
      position: 3,
      name: product.category_name,
      item: absoluteUrl(`/3d-shop/category/${product.category_slug}`),
    })
  }

  items.push({
    position: items.length + 1,
    name: product.name,
    item: absoluteUrl(`/3d-shop/product/${product.slug}`),
  })

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item) => ({
      '@type': 'ListItem',
      position: item.position,
      name: item.name,
      item: item.item,
    })),
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const product = await getShopProductBySlug(slug)
  if (!product) return { title: 'Product — 3D Shop' }
  return {
    title: product.meta_title || `${product.name} — 3D Shop`,
    description: product.meta_description || product.description || `Shop ${product.name} on 3D Shop by Flux3D.`,
    alternates: { canonical: `/3d-shop/product/${product.slug}` },
    openGraph: {
      title: product.meta_title || `${product.name} — 3D Shop`,
      description: product.meta_description || product.description || `Shop ${product.name} on 3D Shop by Flux3D.`,
      url: absoluteUrl(`/3d-shop/product/${product.slug}`),
      images: product.thumbnail_url ? [{ url: product.thumbnail_url }] : undefined,
    },
  }
}

export default async function ShopProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await getShopProductBySlug(slug)

  if (!product) {
    return (
      <ShopShell transparentNav>
        <main className="grid min-h-screen place-items-center px-4 text-center">
          <div>
            <h1 className="font-[var(--shop-font-heading)] text-4xl font-semibold text-[var(--shop-text-primary)]">Product not found</h1>
            <Link href="/3d-shop" className="mt-6 inline-flex min-h-[48px] items-center rounded-xl bg-[var(--shop-text-primary)] px-6 text-sm font-semibold text-white transition hover:bg-[var(--shop-text-secondary)]">
              Back to 3D Shop
            </Link>
          </div>
        </main>
      </ShopShell>
    )
  }

  const reviews = await getShopProductReviews(product.id, 1, 10)
  const auth = await getCurrentUserProfile()
  if (!product.is_active || product.is_archived) notFound()

  return (
    <ShopShell transparentNav>
      <script
        nonce={CSP_NONCE}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(makeProductSchema(product)) }}
      />
      <script
        nonce={CSP_NONCE}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(makeBreadcrumbSchema(product)) }}
      />
      <ShopProductDetailClient product={product} initialReviews={reviews.reviews} currentUser={auth?.profile ?? null} />
    </ShopShell>
  )
}
