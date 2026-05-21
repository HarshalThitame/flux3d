import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import Navbar from '@/components/Navbar'
import ProductCard from '@/components/shop/ProductCard'
import RecentlyViewedDynamic from '@/components/shop/RecentlyViewedDynamic'
import { buildShopCategoryTree, getShopHomeData } from '@/lib/shop/public-data'
import { absoluteUrl } from '@/lib/site'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '3D Shop — Flux3D',
  description: 'Handpicked, ready-to-ship 3D printed products from Flux3D.',
  alternates: { canonical: '/3d-shop' },
  openGraph: {
    title: '3D Shop — Flux3D',
    description: 'Handpicked, ready-to-ship 3D printed products from Flux3D.',
    url: absoluteUrl('/3d-shop'),
    type: 'website',
  },
}

const occasionEmoji: Record<string, string> = {
  Diwali: '🪔',
  'Gaming Setup': '🎮',
  'Office Desk': '🖥️',
  Gift: '🎁',
}

export default async function ShopHomePage() {
  const data = await getShopHomeData()
  const categoryTree = buildShopCategoryTree(data.categories)
  const heroProduct = data.featured_products[0] ?? data.new_arrivals[0]
  const heroImage = heroProduct?.thumbnail_url || heroProduct?.image_urls?.[0] || categoryTree[0]?.banner_image_url || ''

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <Navbar transparent />
      <main>
        <section className="relative min-h-[82vh] overflow-hidden px-4 pb-16 pt-5 md:px-8 lg:px-16">
          {heroImage ? (
            <Image
              src={heroImage}
              alt="3D Shop"
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-r from-[#f9f7f4]/95 via-[#f9f7f4]/82 to-[#f9f7f4]/20" />
          <div className="relative z-10 mx-auto flex max-w-7xl flex-col justify-end">
            <div className="max-w-2xl pt-[16vh]">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-brand)] bg-white/80 px-4 py-2 text-sm font-semibold text-[var(--brand-primary)] shadow-[var(--shadow-sm)] backdrop-blur">
                <Sparkles className="h-4 w-4" />
                Ready to ship
              </div>
              <h1 className="mt-6 text-5xl font-extrabold tracking-normal text-[var(--text-primary)] sm:text-6xl lg:text-7xl">
                3D Shop
              </h1>
              <p className="mt-5 max-w-xl text-xl leading-8 text-[var(--text-secondary)]">
                Handpicked. Ready to ship.
              </p>
              <a href="#shop-categories" className="btn-primary mt-8 inline-flex min-h-[52px] items-center gap-2 px-6">
                Shop Now
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        <section id="shop-categories" className="px-4 py-16 md:px-8 lg:px-16">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex items-end justify-between gap-4">
              <h2 className="text-3xl font-extrabold text-[var(--text-primary)]">Shop by Category</h2>
            </div>
            <div className="grid auto-cols-[78%] grid-flow-col gap-4 overflow-x-auto pb-2 md:grid-flow-row md:grid-cols-3 md:overflow-visible lg:grid-cols-4">
              {categoryTree.map((category) => (
                <Link
                  key={category.id}
                  href={`/3d-shop/category/${category.slug}`}
                  className="group relative min-h-[190px] overflow-hidden rounded-2xl border border-[var(--border-light)] bg-white shadow-[var(--shadow-sm)] transition hover:-translate-y-1 hover:border-[var(--border-brand)] hover:shadow-[var(--shadow-md)]"
                >
                  {category.banner_image_url ? (
                    <Image src={category.banner_image_url} alt={category.name} fill sizes="(min-width: 1024px) 25vw, 80vw" className="object-cover transition duration-500 group-hover:scale-105" />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="text-3xl">{category.icon_emoji || '🧩'}</div>
                    <h3 className="mt-2 text-xl font-bold text-white">{category.name}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {data.featured_products.length > 0 && (
          <section className="px-4 py-10 md:px-8 lg:px-16">
            <div className="mx-auto max-w-7xl">
              <div className="mb-6 flex items-center justify-between gap-4">
                <h2 className="text-3xl font-extrabold text-[var(--text-primary)]">Featured</h2>
                <Link href="/3d-shop/search?featured=true" className="text-sm font-semibold text-[var(--brand-primary)]">
                  View all →
                </Link>
              </div>
              <div className="grid auto-cols-[72%] grid-flow-col gap-4 overflow-x-auto pb-2 sm:auto-cols-[42%] lg:auto-cols-[24%]">
                {data.featured_products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          </section>
        )}

        {data.occasion_collections.slice(0, 3).map((collection) => (
          <section key={collection.tag} className="px-4 py-10 md:px-8 lg:px-16">
            <div className="mx-auto max-w-7xl">
              <h2 className="mb-6 text-3xl font-extrabold text-[var(--text-primary)]">
                {occasionEmoji[collection.tag] || '✨'} {collection.tag}
              </h2>
              <div className="grid auto-cols-[72%] grid-flow-col gap-4 overflow-x-auto pb-2 sm:auto-cols-[42%] lg:auto-cols-[24%]">
                {collection.products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          </section>
        ))}

        <RecentlyViewedDynamic />

        <section className="px-4 py-16 md:px-8 lg:px-16">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-8 text-3xl font-extrabold text-[var(--text-primary)]">New Arrivals</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {data.new_arrivals.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
