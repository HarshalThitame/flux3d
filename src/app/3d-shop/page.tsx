import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Box,
  Layers3,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
} from 'lucide-react'
import RecentlyViewedDynamic from '@/components/shop/RecentlyViewedDynamic'
import ShopShell from '@/components/shop/ShopShell'
import ShopProductFilterClient from './ShopProductFilterClient'
import { buildShopCategoryTree, getShopHomeData, getShopProducts } from '@/lib/shop/public-data'
import { formatShopPrice } from '@/lib/shop/selection'
import { absoluteUrl } from '@/lib/site'

export const revalidate = 300

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

export default async function ShopHomePage() {
  const data = await getShopHomeData()
  const allProductsResult = await getShopProducts({ limit: 96, sort: 'newest' })
  const allProducts = allProductsResult.products
  const categoryTree = buildShopCategoryTree(data.categories)
  const heroProduct = data.featured_products[0] ?? data.new_arrivals[0] ?? null
  const heroImage = heroProduct?.thumbnail_url || heroProduct?.image_urls?.[0] || categoryTree[0]?.banner_image_url || '/pot.webp'
  const productCount = allProducts.length
  const heroPrice = heroProduct ? formatShopPrice(heroProduct.display_price) : 'Browse store'

  const heroStats = [
    { label: 'Categories', value: `${categoryTree.length}`, icon: Layers3 },
    { label: 'Products', value: `${productCount}`, icon: PackageCheck },
    { label: 'Featured', value: `${data.featured_products.length}`, icon: Star },
    { label: 'Ready to ship', value: 'Fast', icon: Truck },
  ]

  return (
    <ShopShell transparentNav>
      <main className="flex-1">
        {/* Hero — Editorial style like The Collective */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -right-20 -top-20 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(201,169,98,0.10)_0%,transparent_70%)] blur-3xl" />
            <div className="absolute -bottom-40 -left-20 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgba(28,25,23,0.04)_0%,transparent_70%)] blur-3xl" />
          </div>

          <div className="relative z-10 mx-auto grid w-full max-w-[1280px] gap-8 px-4 pb-16 pt-28 sm:px-6 md:px-10 md:pb-20 md:pt-32 lg:grid-cols-[1fr_440px] lg:gap-12 lg:px-12 lg:pb-28 lg:pt-36">
            {/* Left: Editorial copy */}
            <div className="flex flex-col justify-center min-w-0">
              <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-[var(--shop-text-muted)]">
                <Link href="/" className="transition hover:text-[var(--shop-text-primary)]">Home</Link>
                <span className="text-[var(--shop-text-subtle)]">/</span>
                <span className="text-[var(--shop-text-primary)]">3D Shop</span>
              </nav>

              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--shop-border-gold)] bg-[var(--shop-gold-faint)] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--shop-gold)]">
                <Sparkles className="h-3.5 w-3.5" />
                Flux3D Store
              </div>

              <h1 className="font-[var(--shop-font-heading)] mt-6 max-w-[calc(100vw-2rem)] text-[clamp(2.4rem,7vw,4.8rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-[var(--shop-text-primary)] sm:max-w-3xl">
                Premium 3D printed pieces, <span className="text-[var(--shop-gold)]">ready to own.</span>
              </h1>

              <p className="mt-5 max-w-[calc(100vw-2rem)] text-base leading-7 text-[var(--shop-text-secondary)] sm:max-w-lg sm:text-lg sm:leading-8">
                Shop curated Flux3D objects with clean finishes, useful forms, and ready-to-ship presentation for desks, creators, gifting, and everyday setups.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href="#shop-products"
                  className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--shop-text-primary)] px-7 text-sm font-semibold text-white shadow-[var(--shop-shadow-sm)] transition hover:bg-[var(--shop-text-secondary)] hover:shadow-[var(--shop-shadow-md)]"
                >
                  Shop now
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
                <Link
                  href="/3d-shop/search"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--shop-border-medium)] bg-white px-7 text-sm font-semibold text-[var(--shop-text-primary)] transition hover:border-[var(--shop-gold)] hover:text-[var(--shop-gold)]"
                >
                  Search products
                  <Search className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {heroStats.map((stat) => {
                  const Icon = stat.icon
                  return (
                    <div
                      key={stat.label}
                      className="rounded-[var(--shop-radius-md)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] p-4 shadow-[var(--shop-shadow-sm)]"
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--shop-text-primary)]">
                        <Icon className="h-4 w-4 text-[var(--shop-gold)]" />
                        {stat.value}
                      </div>
                      <div className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-[var(--shop-text-muted)]">
                        {stat.label}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right: Featured product editorial card */}
            <aside className="relative min-w-0">
              <div className="rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] p-4 shadow-[var(--shop-shadow-lg)] sm:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--shop-text-muted)]">Featured pick</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--shop-gold-faint)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--shop-gold)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--shop-gold)]" />
                    In stock
                  </span>
                </div>
                <Link
                  href={heroProduct ? `/3d-shop/product/${heroProduct.slug}` : '#shop-products'}
                  className="group grid gap-3"
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--shop-radius-lg)] bg-[var(--shop-bg-muted)]">
                    <Image
                      src={heroImage}
                      alt={heroProduct?.name || 'Flux3D 3D Shop product showcase'}
                      fill
                      priority
                      sizes="(min-width: 1024px) 440px, 100vw"
                      className="object-cover transition duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--shop-gold)]">
                      {heroProduct?.category_name || 'Curated shop'}
                    </div>
                    <h2 className="font-[var(--shop-font-heading)] mt-1.5 line-clamp-2 text-lg font-semibold leading-tight text-[var(--shop-text-primary)] sm:text-xl">
                      {heroProduct?.name || 'Browse Flux3D picks'}
                    </h2>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-[var(--shop-text-muted)]">
                      {heroProduct?.description || 'A premium shelf of ready-to-ship 3D printed products and useful desk objects.'}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--shop-gold)]">
                      {heroPrice}
                      <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  </div>
                </Link>
              </div>
            </aside>
          </div>
        </section>

        {/* Trust bar */}
        <section className="border-y border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)]">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-center gap-6 px-4 py-4 sm:px-6 md:px-10 lg:px-12">
            {[
              { icon: ShieldCheck, label: 'QA checked' },
              { icon: Truck, label: 'Ready to ship' },
              { icon: Box, label: '3D preview' },
              { icon: ShoppingBag, label: 'Secure cart' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm font-medium text-[var(--shop-text-muted)]">
                <item.icon className="h-4 w-4 text-[var(--shop-gold)]" />
                {item.label}
              </div>
            ))}
          </div>
        </section>

        {/* Products section with filters */}
        <section id="shop-products" className="px-4 py-16 sm:px-6 md:px-10 lg:px-12 lg:py-24">
          <div className="mx-auto w-full max-w-[1280px]">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--shop-gold)]">
                  <BadgeCheck className="h-4 w-4" />
                  All products
                </div>
                <h2 className="font-[var(--shop-font-heading)] mt-3 text-[clamp(1.8rem,4vw,2.8rem)] font-semibold text-[var(--shop-text-primary)]">
                  Browse the collection
                </h2>
                <p className="mt-2 max-w-lg text-sm leading-6 text-[var(--shop-text-muted)]">
                  Filter by category, price, or sort to find your perfect piece.
                </p>
              </div>
            </div>

            {/* Client-side filter wrapper */}
            <ShopProductFilterClient
              products={allProducts}
              categories={data.categories}
            />
          </div>
        </section>

        {/* Recently viewed */}
        <div className="px-4 pb-16 sm:px-6 md:px-10 lg:px-12 lg:pb-24">
          <div className="mx-auto w-full max-w-[1280px]">
            <RecentlyViewedDynamic />
          </div>
        </div>

        {/* Newsletter / CTA band */}
        <section className="shop-cta-band mx-4 mb-16 overflow-hidden rounded-[var(--shop-radius-xl)] bg-[var(--shop-text-primary)] px-6 py-12 text-center sm:mx-6 sm:px-10 md:mx-10 md:py-16 lg:mx-12 lg:px-12">
          <div className="mx-auto max-w-2xl">
            <h2 className="font-[var(--shop-font-heading)] text-3xl font-semibold text-white sm:text-4xl">
              Ready to elevate your space?
            </h2>
            <p className="mt-4 text-[var(--shop-sand)]">
              Explore the full collection of premium 3D printed pieces crafted for creators, desks, and thoughtful gifting.
            </p>
            <Link
              href="/3d-shop/search"
              className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--shop-gold)] px-8 text-sm font-semibold text-[var(--shop-text-primary)] transition hover:bg-[var(--shop-gold-light)]"
            >
              Browse all products
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    </ShopShell>
  )
}
