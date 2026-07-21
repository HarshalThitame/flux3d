import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  ChevronRight,
  Clock3,
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
import Navbar from '@/components/Navbar'
import ProductCard from '@/components/shop/ProductCard'
import RecentlyViewedDynamic from '@/components/shop/RecentlyViewedDynamic'
import DeferredHeroVideo from '@/components/DeferredHeroVideo'
import { buildShopCategoryTree, getShopHomeData } from '@/lib/shop/public-data'
import { formatShopPrice } from '@/lib/shop/selection'
import { absoluteUrl } from '@/lib/site'
import ShopPremiumFX from './ShopPremiumFX'

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

const tickerItems = [
  'Desk objects',
  'Creator gifts',
  'Premium finishes',
  'Ready to ship',
  'Custom colors',
  'Quality checked',
]

export default async function ShopHomePage() {
  const data = await getShopHomeData()
  const categoryTree = buildShopCategoryTree(data.categories)
  const heroProduct = data.featured_products[0] ?? data.new_arrivals[0] ?? null
  const heroImage = heroProduct?.thumbnail_url || heroProduct?.image_urls?.[0] || categoryTree[0]?.banner_image_url || '/pot.webp'
  const productCount = data.featured_products.length + data.new_arrivals.length
  const heroPrice = heroProduct ? formatShopPrice(heroProduct.display_price) : 'Browse store'

  const heroStats = [
    { label: 'Categories', value: `${categoryTree.length}`, icon: Layers3 },
    { label: 'Featured edits', value: `${data.featured_products.length}`, icon: Star },
    { label: 'New arrivals', value: `${data.new_arrivals.length}`, icon: PackageCheck },
    { label: 'Dispatch flow', value: 'Ready', icon: Truck },
  ]

  const consoleRows = [
    { label: 'Store signal', value: productCount ? `${productCount} picks` : 'curated', width: '76%' },
    { label: 'Lead item', value: heroProduct?.category_name || 'Flux3D', width: '58%' },
    { label: 'Checkout', value: 'Secure online pay', width: '64%' },
    { label: 'Finish QA', value: 'visual', width: '48%' },
  ]

  return (
    <div className="shop-premium-shell min-h-screen overflow-hidden">
      <ShopPremiumFX />
      <Navbar transparent />

      <main className="shop-premium-content min-h-screen w-full max-w-[100vw] overflow-hidden text-[#0F1B3D]">
        <section className="shop-hero-premium relative isolate w-full max-w-[100vw] overflow-hidden px-4 pb-14 pt-6 text-[#0F1B3D] sm:px-6 md:px-10 lg:px-12">
          <Image
            src="/printer2-poster.webp"
            alt=""
            fill
            preload
            sizes="100vw"
            className="shop-hero-video absolute inset-0 h-full w-full object-cover"
          />
          <DeferredHeroVideo
            src="/printer2-optimized.mp4"
            className="shop-hero-video absolute inset-0 h-full w-full object-cover"
            ariaLabel="Flux3D 3D printer motion behind shop hero"
          />
          <div className="shop-hero-depth" aria-hidden="true" />
          <div className="shop-hero-grid" aria-hidden="true" />
          <div className="shop-hero-beam" aria-hidden="true" />
          <div className="shop-hero-frame" aria-hidden="true" />

          <div className="relative z-10 mx-auto flex min-h-[86svh] w-full max-w-[1220px] min-w-0 flex-col justify-start pb-8 pt-8 md:pt-10 lg:pt-12">
            <div className="shop-fade-up mb-5 flex items-center gap-2 text-sm font-medium text-[#6b7280]">
              <Link href="/" className="transition hover:text-[#0F1B3D]">Home</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-[#0F1B3D]">3D Shop</span>
            </div>

            <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-start">
              <div className="min-w-0">
                <div className="shop-fade-up shop-hero-kicker inline-flex w-fit items-center gap-2 rounded-lg border border-[rgba(109,40,217,0.15)] bg-[#ede9fe] px-4 py-2 text-xs font-black uppercase text-[#6d28d9] shadow-sm">
                  <Sparkles className="h-4 w-4 text-[#6d28d9]" />
                  Flux3D Store
                </div>

                <h1 className="shop-fade-up shop-hero-title mt-5 max-w-[calc(100vw-2rem)] break-words text-[clamp(2.4rem,9vw,5rem)] font-black leading-[1.04] text-[#0F1B3D] sm:text-6xl sm:leading-[0.96] lg:max-w-5xl lg:text-8xl lg:leading-[0.9]">
                  Premium 3D printed pieces, ready to own.
                </h1>

                <p className="shop-fade-up mt-6 max-w-[calc(100vw-2rem)] text-base leading-7 text-[#374151] sm:text-lg lg:max-w-2xl lg:leading-8">
                  Shop curated Flux3D objects with clean finishes, useful forms, and ready-to-ship presentation for desks, creators, gifting, and everyday setups.
                </p>

                <div className="shop-fade-up mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <a
                    href="#shop-categories"
                    className="shop-primary-action group inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-6 text-sm font-black text-[#05060a] shadow-[0_18px_54px_rgba(255,255,255,0.16)] transition hover:bg-[#ecfeff]"
                  >
                    Shop now
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </a>
                  <Link
                    href="/3d-shop/search"
                    className="shop-secondary-action inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#6d28d9]/30 bg-white px-6 text-sm font-black text-[#6d28d9] backdrop-blur transition hover:border-[#6d28d9]/50 hover:bg-purple-50"
                  >
                    Search products
                    <Search className="h-4 w-4" />
                  </Link>
                </div>

                <div className="shop-fade-up shop-hero-stats mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {heroStats.map((stat) => {
                    const Icon = stat.icon
                    return (
                      <div key={stat.label} className="min-w-0 rounded-lg border border-[rgba(109,40,217,0.08)] bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-black text-[#0F1B3D]">
                          <Icon className="h-4 w-4 text-[#6d28d9]" />
                          {stat.value}
                        </div>
                        <div className="mt-2 text-xs font-bold uppercase text-[#6b7280]">{stat.label}</div>
                      </div>
                    )
                  })}
                </div>

                <div className="shop-fade-up shop-intel-ticker mt-6" aria-hidden="true">
                  <div>
                    {[...tickerItems, ...tickerItems].map((entry, index) => (
                      <span key={`${entry}-${index}`}>
                        <Sparkles className="h-3.5 w-3.5" />
                        {entry}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <aside className="shop-commerce-panel shop-fade-up grid min-w-0 gap-3">
                <div className="shop-console-topline">
                  <span>Store console</span>
                  <strong>live</strong>
                </div>

                <Link
                  href={heroProduct ? `/3d-shop/product/${heroProduct.slug}` : '#shop-categories'}
                  className="shop-console-feature group grid min-w-0 gap-3"
                >
                  <div className="shop-console-feature-media relative overflow-hidden rounded-lg border border-[rgba(109,40,217,0.08)]">
                    <Image
                      src={heroImage}
                      alt={heroProduct?.name || 'Flux3D 3D Shop product showcase'}
                      fill
                      priority
                      sizes="(min-width: 1024px) 240px, 100vw"
                      className="object-cover transition duration-700 group-hover:scale-105"
                    />
                    <div className="shop-product-scan" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black uppercase tracking-[0.16em] text-[#6d28d9]">
                      {heroProduct?.category_name || 'Curated shop'}
                    </div>
                    <h2 className="mt-2 line-clamp-2 text-xl font-black leading-tight text-[#0F1B3D]">
                      {heroProduct?.name || 'Browse Flux3D picks'}
                    </h2>
                    <p className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-[#374151]">
                      {heroProduct?.description || 'A premium shelf of ready-to-ship 3D printed products and useful desk objects.'}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[#6d28d9]">
                      {heroPrice}
                      <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  </div>
                </Link>

                <div className="shop-console-stack">
                  {consoleRows.map((entry) => (
                    <div key={entry.label}>
                      <span>{entry.label}</span>
                      <strong>{entry.value}</strong>
                      <i style={{ width: entry.width }} />
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section id="shop-categories" className="shop-premium-section relative overflow-hidden px-4 py-20 sm:px-6 md:px-10 lg:px-12">
          <div className="shop-section-grid" aria-hidden="true" />
          <div className="relative z-10 mx-auto w-full max-w-[1220px]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-[#6d28d9]">
                  <Layers3 className="h-4 w-4" />
                  Shop by category
                </div>
                <h2 className="mt-3 max-w-2xl text-[clamp(2rem,6vw,3rem)] font-black leading-tight text-[#0F1B3D] sm:text-5xl">
                  Browse by purpose, finish, and setup.
                </h2>
              </div>
              <Link href="/3d-shop/search" className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-lg border border-[#6d28d9]/30 px-5 text-sm font-black text-[#6d28d9] transition hover:border-[#6d28d9]/50 hover:bg-purple-50">
                View all products
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="shop-category-grid mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {categoryTree.map((category) => (
                <Link
                  key={category.id}
                  href={`/3d-shop/category/${category.slug}`}
                  className="shop-category-card group relative min-h-[224px] overflow-hidden rounded-lg border border-white/10 bg-white/[0.06]"
                >
                  {category.banner_image_url ? (
                    <Image
                      src={category.banner_image_url}
                      alt={category.name}
                      fill
                      sizes="(min-width: 1024px) 25vw, 80vw"
                      className="object-cover opacity-72 transition duration-700 group-hover:scale-105 group-hover:opacity-90"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(103,232,249,0.18),rgba(167,139,250,0.12),rgba(251,191,36,0.12))]" />
                  )}
                  <div className="shop-category-overlay" aria-hidden="true" />
                  <div className="absolute inset-x-4 bottom-4 z-10">
                    <div className="shop-category-mark">
                      {category.icon_emoji ? <span>{category.icon_emoji}</span> : <Sparkles className="h-4 w-4" />}
                    </div>
                    <h3 className="mt-3 text-xl font-black text-white">{category.name}</h3>
                    {category.description ? (
                      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-white">{category.description}</p>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {data.featured_products.length > 0 && (
          <section className="shop-premium-section shop-products-section relative overflow-hidden px-4 py-12 sm:px-6 md:px-10 lg:px-12">
            <div className="relative z-10 mx-auto w-full max-w-[1220px]">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-[#6d28d9]">
                    <BadgeCheck className="h-4 w-4" />
                    Featured
                  </div>
                  <h2 className="mt-3 text-[clamp(2rem,6vw,3rem)] font-black text-[#0F1B3D] sm:text-4xl">Premium picks</h2>
                </div>
                <Link href="/3d-shop/search?featured=true" className="inline-flex items-center gap-2 text-sm font-black text-[#6d28d9]">
                  View all
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="shop-product-rail grid auto-cols-[74%] grid-flow-col gap-4 overflow-x-auto pb-2 sm:auto-cols-[42%] lg:auto-cols-[24%]">
                {data.featured_products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          </section>
        )}

        {data.occasion_collections.slice(0, 3).map((collection) => (
          <section key={collection.tag} className="shop-premium-section shop-products-section relative overflow-hidden px-4 py-12 sm:px-6 md:px-10 lg:px-12">
            <div className="relative z-10 mx-auto w-full max-w-[1220px]">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-[#6d28d9]">
                    <Zap className="h-4 w-4" />
                    Collection
                  </div>
                  <h2 className="mt-3 text-3xl font-black text-[#0F1B3D] sm:text-4xl">{collection.tag}</h2>
                </div>
              </div>
              <div className="shop-product-rail grid auto-cols-[74%] grid-flow-col gap-4 overflow-x-auto pb-2 sm:auto-cols-[42%] lg:auto-cols-[24%]">
                {collection.products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          </section>
        ))}

        <div className="shop-recently-viewed-premium">
          <RecentlyViewedDynamic />
        </div>

        <section className="shop-premium-section shop-products-section relative overflow-hidden px-4 py-16 sm:px-6 md:px-10 lg:px-12">
          <div className="relative z-10 mx-auto w-full max-w-[1220px]">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-[#6d28d9]">
                  <Clock3 className="h-4 w-4" />
                  New arrivals
                </div>
                <h2 className="mt-3 text-[clamp(2rem,6vw,3rem)] font-black text-[#0F1B3D] sm:text-4xl">Fresh from the print queue</h2>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs font-black uppercase text-[#6b7280]">
                <span className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#6d28d9]" />
                  QA
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2">
                  <Truck className="h-3.5 w-3.5 text-[#6d28d9]" />
                  Ship
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2">
                  <ShoppingBag className="h-3.5 w-3.5 text-[#6d28d9]" />
                  Cart
                </span>
              </div>
            </div>
            <div className="shop-product-rail shop-product-grid grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
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
