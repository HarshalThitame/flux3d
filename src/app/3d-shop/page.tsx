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
  Zap,
} from 'lucide-react'
import ProductCard from '@/components/shop/ProductCard'
import RecentlyViewedDynamic from '@/components/shop/RecentlyViewedDynamic'
import ShopCategoryGrid from '@/components/shop/ShopCategoryGrid'
import ShopShell from '@/components/shop/ShopShell'
import { buildShopCategoryTree, getShopHomeData } from '@/lib/shop/public-data'
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
  const categoryTree = buildShopCategoryTree(data.categories)
  const heroProduct = data.featured_products[0] ?? data.new_arrivals[0] ?? null
  const heroImage = heroProduct?.thumbnail_url || heroProduct?.image_urls?.[0] || categoryTree[0]?.banner_image_url || '/pot.webp'
  const productCount = data.featured_products.length + data.new_arrivals.length
  const heroPrice = heroProduct ? formatShopPrice(heroProduct.display_price) : 'Browse store'

  const heroStats = [
    { label: 'Categories', value: `${categoryTree.length}`, icon: Layers3 },
    { label: 'Featured', value: `${data.featured_products.length}`, icon: Star },
    { label: 'New arrivals', value: `${data.new_arrivals.length}`, icon: PackageCheck },
    { label: 'Ready to ship', value: 'Fast', icon: Truck },
  ]

  return (
    <ShopShell transparentNav>
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pb-20 pt-28 sm:px-6 md:px-10 lg:px-12 lg:pb-28 lg:pt-32">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -right-20 -top-20 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(201,169,98,0.10)_0%,transparent_70%)] blur-3xl" />
            <div className="absolute -bottom-40 -left-20 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgba(67,56,202,0.06)_0%,transparent_70%)] blur-3xl" />
          </div>

          <div className="relative z-10 mx-auto grid w-full max-w-[1280px] gap-12 lg:grid-cols-[1fr_420px] lg:items-start">
            <div className="min-w-0">
              <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-[var(--shop-text-muted)]">
                <Link href="/" className="transition hover:text-[var(--shop-text-primary)]">Home</Link>
                <span>/</span>
                <span className="text-[var(--shop-text-primary)]">3D Shop</span>
              </nav>

              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--shop-border-gold)] bg-[var(--shop-gold-faint)] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--shop-gold)]">
                <Sparkles className="h-3.5 w-3.5" />
                Flux3D Boutique
              </div>

              <h1 className="font-[var(--shop-font-heading)] mt-6 max-w-[calc(100vw-2rem)] text-[clamp(2.6rem,8vw,5.5rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-[var(--shop-text-primary)] sm:max-w-3xl">
                Premium 3D printed pieces, <span className="text-[var(--shop-gold)]">ready to own.</span>
              </h1>

              <p className="mt-6 max-w-[calc(100vw-2rem)] text-lg leading-8 text-[var(--shop-text-secondary)] sm:max-w-xl">
                Shop curated Flux3D objects with clean finishes, useful forms, and ready-to-ship presentation for desks, creators, gifting, and everyday setups.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href="#shop-categories"
                  className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--shop-text-primary)] px-7 text-sm font-semibold text-white shadow-[var(--shop-shadow-sm)] transition hover:bg-[var(--shop-text-secondary)] hover:shadow-[var(--shop-shadow-md)]"
                >
                  Shop now
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
                <Link
                  href="/3d-shop/search"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--shop-border-medium)] bg-white px-7 text-sm font-semibold text-[var(--shop-text-primary)] transition hover:border-[var(--shop-gold)] hover:text-[var(--shop-gold)]"
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

            <aside className="relative min-w-0">
              <div className="rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] p-5 shadow-[var(--shop-shadow-lg)]">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--shop-text-muted)]">Featured pick</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--shop-gold-faint)] px-2 py-0.5 text-[10px] font-bold text-[var(--shop-gold)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--shop-gold)]" />
                    In stock
                  </span>
                </div>
                <Link
                  href={heroProduct ? `/3d-shop/product/${heroProduct.slug}` : '#shop-categories'}
                  className="group grid gap-4"
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--shop-radius-lg)] bg-[var(--shop-bg-muted)]">
                    <Image
                      src={heroImage}
                      alt={heroProduct?.name || 'Flux3D 3D Shop product showcase'}
                      fill
                      priority
                      sizes="(min-width: 1024px) 420px, 100vw"
                      className="object-cover transition duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--shop-gold)]">
                      {heroProduct?.category_name || 'Curated shop'}
                    </div>
                    <h2 className="font-[var(--shop-font-heading)] mt-2 line-clamp-2 text-xl font-semibold leading-tight text-[var(--shop-text-primary)]">
                      {heroProduct?.name || 'Browse Flux3D picks'}
                    </h2>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--shop-text-muted)]">
                      {heroProduct?.description || 'A premium shelf of ready-to-ship 3D printed products and useful desk objects.'}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--shop-gold)]">
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

        {/* Categories */}
        <ShopCategoryGrid categories={categoryTree} />

        {/* Featured */}
        {data.featured_products.length > 0 && (
          <section className="px-4 py-16 sm:px-6 md:px-10 lg:px-12 lg:py-24">
            <div className="mx-auto w-full max-w-[1280px]">
              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--shop-gold)]">
                    <BadgeCheck className="h-4 w-4" />
                    Featured
                  </div>
                  <h2 className="font-[var(--shop-font-heading)] mt-3 text-[clamp(2rem,5vw,3rem)] font-semibold text-[var(--shop-text-primary)]">
                    Premium picks
                  </h2>
                </div>
                <Link href="/3d-shop/search?featured=true" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--shop-gold)] transition hover:text-[var(--shop-text-primary)]">
                  View all
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="grid auto-cols-[74%] grid-flow-col gap-4 overflow-x-auto pb-2 scrollbar-hide [-webkit-overflow-scrolling:touch] snap-x snap-mandatory scroll-padding-left-4 sm:auto-cols-[42%] lg:auto-cols-[24%]">
                {data.featured_products.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} className="h-full snap-start" />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Occasion collections */}
        {data.occasion_collections.slice(0, 3).map((collection) => (
          <section key={collection.tag} className="px-4 py-12 sm:px-6 md:px-10 lg:px-12 lg:py-16">
            <div className="mx-auto w-full max-w-[1280px]">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--shop-gold)]">
                    <Zap className="h-4 w-4" />
                    Collection
                  </div>
                  <h2 className="font-[var(--shop-font-heading)] mt-3 text-2xl font-semibold text-[var(--shop-text-primary)] sm:text-3xl">
                    {collection.tag}
                  </h2>
                </div>
              </div>
              <div className="grid auto-cols-[74%] grid-flow-col gap-4 overflow-x-auto pb-2 scrollbar-hide [-webkit-overflow-scrolling:touch] snap-x snap-mandatory scroll-padding-left-4 sm:auto-cols-[42%] lg:auto-cols-[24%]">
                {collection.products.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} className="h-full snap-start" />
                ))}
              </div>
            </div>
          </section>
        ))}

        {/* Recently viewed */}
        <div className="px-4 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto w-full max-w-[1280px]">
            <RecentlyViewedDynamic />
          </div>
        </div>

        {/* New arrivals */}
        <section className="px-4 py-20 sm:px-6 md:px-10 lg:px-12 lg:py-28">
          <div className="mx-auto w-full max-w-[1280px]">
            <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--shop-gold)]">
                  <BadgeCheck className="h-4 w-4" />
                  New arrivals
                </div>
                <h2 className="font-[var(--shop-font-heading)] mt-3 text-[clamp(2rem,5vw,3rem)] font-semibold text-[var(--shop-text-primary)]">
                  Fresh from the print queue
                </h2>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--shop-text-muted)]">
                <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] px-3 py-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-[var(--shop-gold)]" />
                  QA
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] px-3 py-2">
                  <Truck className="h-3.5 w-3.5 text-[var(--shop-gold)]" />
                  Ship
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] px-3 py-2">
                  <ShoppingBag className="h-3.5 w-3.5 text-[var(--shop-gold)]" />
                  Cart
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {data.new_arrivals.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          </div>
        </section>

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
              className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--shop-gold)] px-8 text-sm font-semibold text-[var(--shop-text-primary)] transition hover:bg-[var(--shop-gold-light)]"
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
