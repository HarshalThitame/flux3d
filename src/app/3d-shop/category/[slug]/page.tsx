import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ShopShell from '@/components/shop/ShopShell'
import ShopCategoryBrowser from '@/components/shop/ShopCategoryBrowser'
import { getShopCategoryBySlug, getShopProducts } from '@/lib/shop/public-data'
import type { ShopPublicCategory } from '@/lib/shop/public-types'
import { absoluteUrl } from '@/lib/site'

export const dynamic = 'force-dynamic'

function toJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

function makeBreadcrumbSchema(category: ShopPublicCategory) {
  const items = [
    { position: 1, name: 'Home', item: absoluteUrl('/') },
    { position: 2, name: '3D Shop', item: absoluteUrl('/3d-shop') },
    {
      position: 3,
      name: category.name,
      item: absoluteUrl(`/3d-shop/category/${category.slug}`),
    },
  ]

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
  const { category } = await getShopCategoryBySlug(slug)
  if (!category) return { title: 'Category — 3D Shop' }
  return {
    title: `${category.name} — 3D Shop`,
    description: category.description ?? `Shop ${category.name} products on 3D Shop by Flux3D.`,
    alternates: { canonical: `/3d-shop/category/${category.slug}` },
    openGraph: {
      title: `${category.name} — 3D Shop`,
      description: category.description ?? `Shop ${category.name} products on 3D Shop by Flux3D.`,
      url: absoluteUrl(`/3d-shop/category/${category.slug}`),
      images: category.banner_image_url ? [{ url: category.banner_image_url }] : undefined,
    },
  }
}

export default async function ShopCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { category } = await getShopCategoryBySlug(slug)
  if (!category) notFound()

  const result = await getShopProducts({ category_slug: slug, limit: 96, sort: 'featured' })

  return (
    <ShopShell transparentNav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(makeBreadcrumbSchema(category)) }}
      />
      <ShopCategoryBrowser category={category} products={result.products} />
    </ShopShell>
  )
}
