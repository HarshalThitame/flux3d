import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import ShopProductDetailClient from '@/components/shop/ShopProductDetailClient'
import { getCurrentUserProfile } from '@/lib/auth/server'
import { getShopProductBySlug, getShopProductReviews } from '@/lib/shop/public-data'
import { absoluteUrl } from '@/lib/site'

export const dynamic = 'force-dynamic'

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
      <div className="min-h-screen bg-[var(--bg-base)]">
        <Navbar transparent />
        <main className="grid min-h-screen place-items-center px-4 text-center">
          <div>
            <h1 className="text-4xl font-extrabold text-[var(--text-primary)]">Product not found</h1>
            <Link href="/3d-shop" className="btn-primary mt-6 inline-flex min-h-[48px] items-center px-6">
              Back to 3D Shop
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const reviews = await getShopProductReviews(product.id, 1, 10)
  const auth = await getCurrentUserProfile()
  if (!product.is_active || product.is_archived) notFound()

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <Navbar transparent />
      <ShopProductDetailClient product={product} initialReviews={reviews.reviews} currentUser={auth?.profile ?? null} />
    </div>
  )
}
