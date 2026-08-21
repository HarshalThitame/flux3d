'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  Layers3,
  PackageCheck,
  Sparkles,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import ProductCard from '@/components/shop/ProductCard'
import type { ShopHomeData, ShopPublicProduct } from '@/lib/shop/public-types'
import CategoryFilterDropdown from './CategoryFilterDropdown'

function SectionHeading({
  eyebrow,
  icon: Icon,
  title,
  subtitle,
  href,
  linkLabel = 'View all',
}: {
  eyebrow: string
  icon: LucideIcon
  title: string
  subtitle?: string
  href?: string
  linkLabel?: string
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--shop-gold)]">
          <Icon className="h-4 w-4" />
          {eyebrow}
        </div>
        <h3 className="font-[var(--shop-font-heading)] mt-3 text-[clamp(2rem,5vw,3rem)] font-semibold leading-tight text-[var(--shop-text-primary)]">
          {title}
        </h3>
        {subtitle && <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--shop-text-muted)]">{subtitle}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-[var(--shop-gold)] transition hover:text-[var(--shop-text-primary)]"
        >
          {linkLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  )
}

function ProductRow({ products }: { products: ShopPublicProduct[] }) {
  return (
    <div className="grid auto-cols-[74%] grid-flow-col gap-4 overflow-x-auto pb-2 scrollbar-hide [-webkit-overflow-scrolling:touch] snap-x snap-mandatory scroll-padding-left-4 sm:auto-cols-[42%] lg:auto-cols-[24%]">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} index={index} className="h-full snap-start" />
      ))}
    </div>
  )
}

export default function ShopSectionClient({ data }: { data: ShopHomeData }) {
  const [category, setCategory] = useState('all')

  const allProducts = useMemo(() => {
    const seen = new Set<string>()
    return [
      ...data.featured_products,
      ...data.new_arrivals,
      ...data.occasion_collections.flatMap((collection) => collection.products),
    ].filter((product) => {
      if (seen.has(product.id)) return false
      seen.add(product.id)
      return true
    })
  }, [data])

  const visible = useMemo(
    () => (category === 'all' ? [] : allProducts.filter((product) => product.category_slug === category)),
    [category, allProducts]
  )
  const selectedCategory = data.categories.find((item) => item.slug === category)

  function selectCategory(slug: string) {
    setCategory(slug)
  }

  return (
    <div className="premium-shop-block">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--shop-gold)]">
            <Layers3 className="h-4 w-4" />
            Categories
          </div>
          <h3 className="font-[var(--shop-font-heading)] mt-2 text-[clamp(1.1rem,2.4vw,1.5rem)] font-semibold leading-snug text-[var(--shop-text-primary)]">
            Filter the store by category
          </h3>
        </div>
        <CategoryFilterDropdown categories={data.categories} value={category} onChange={selectCategory} />
      </div>

      {category !== 'all' ? (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--shop-text-primary)]">
              {selectedCategory?.icon_emoji && <span aria-hidden="true">{selectedCategory.icon_emoji}</span>}
              {selectedCategory?.name ?? 'Category'}
              <span className="rounded-full bg-[var(--shop-gold-faint)] px-2.5 py-0.5 text-xs font-bold text-[var(--shop-gold)]">
                {visible.length}
              </span>
            </div>
            <Link
              href={`/3d-shop/category/${category}`}
              className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-[var(--shop-gold)] transition hover:text-[var(--shop-text-primary)]"
            >
              Browse all in {selectedCategory?.name ?? 'this category'}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {visible.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {visible.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          ) : (
            <div className="rounded-[var(--shop-radius-lg)] border border-dashed border-[var(--shop-border-light)] bg-[var(--shop-bg-muted)] px-6 py-10 text-center">
              <p className="text-sm font-semibold text-[var(--shop-text-primary)]">No products in this category yet.</p>
              <p className="mt-1 text-sm text-[var(--shop-text-muted)]">Browse the full shop for ready-to-ship prints.</p>
              <Link
                href="/3d-shop"
                className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--shop-text-primary)] px-6 text-sm font-bold text-white transition hover:bg-[var(--shop-gold)]"
              >
                Shop all products
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      ) : (
        <>
          {data.featured_products.length > 0 && (
            <section className="premium-shop-block">
              <SectionHeading
                eyebrow="Featured"
                icon={BadgeCheck}
                title="Premium picks"
                href="/3d-shop/search?featured=true"
              />
              <ProductRow products={data.featured_products} />
            </section>
          )}

          {data.occasion_collections.slice(0, 3).map((collection) => (
            <section key={collection.tag} className="premium-shop-block">
              <SectionHeading
                eyebrow="Collection"
                icon={Zap}
                title={collection.tag}
                href={`/3d-shop/search?q=${encodeURIComponent(collection.tag)}`}
                linkLabel="Browse collection"
              />
              <ProductRow products={collection.products} />
            </section>
          ))}

          {data.new_arrivals.length > 0 && (
            <section className="premium-shop-block">
              <SectionHeading
                eyebrow="New arrivals"
                icon={PackageCheck}
                title="Fresh from the print queue"
                subtitle="New products added as they pass QA — quality-checked and ready to ship."
                href="/3d-shop/search?sort=newest"
              />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {data.new_arrivals.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <div className="mt-10 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--shop-gold)]">
        <Sparkles className="h-3.5 w-3.5" />
        Handpicked by Flux3D
      </div>
    </div>
  )
}