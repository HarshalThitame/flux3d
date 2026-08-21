'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  Box,
  Layers3,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
  type LucideIcon,
} from 'lucide-react'
import ProductCard from '@/components/shop/ProductCard'
import ProductFilterBar from '@/components/shop/ProductFilterBar'
import type { ShopHomeData, ShopPublicProduct } from '@/lib/shop/public-types'

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
    <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="lux-eyebrow mb-3">
          <Icon className="h-4 w-4" />
          {eyebrow}
        </div>
        <h2 className="lux-heading-2">{title}</h2>
        {subtitle && (
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--lux-text-muted)]">{subtitle}</p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-[var(--lux-gold)] transition hover:text-[var(--lux-text-primary)]"
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
    <div className="lux-product-row">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} index={index} className="h-full" />
      ))}
    </div>
  )
}

export default function LandingShopSection({ data }: { data: ShopHomeData }) {
  const [filteredProducts, setFilteredProducts] = useState<ShopPublicProduct[]>([
    ...data.featured_products,
    ...data.new_arrivals,
  ])

  // Deduplicate all products for the unified grid
  const allProducts = (() => {
    const seen = new Set<string>()
    const result: ShopPublicProduct[] = []
    for (const p of [...data.featured_products, ...data.new_arrivals]) {
      if (!seen.has(p.id)) {
        seen.add(p.id)
        result.push(p)
      }
    }
    // Add occasion collection products too
    for (const col of data.occasion_collections) {
      for (const p of col.products) {
        if (!seen.has(p.id)) {
          seen.add(p.id)
          result.push(p)
        }
      }
    }
    return result
  })()

  const featuredFiltered = filteredProducts.filter((p) => p.is_featured).slice(0, 8)
  const newFiltered = filteredProducts.filter((p) => !p.is_featured).slice(0, 8)

  return (
    <section id="shop" className="lux-section lux-band-ivory" aria-label="3D Shop">
      {/* Trust bar */}
      <div className="lux-trustbar">
        {[
          { icon: ShieldCheck, label: 'QA checked' },
          { icon: Truck, label: 'Ready to ship' },
          { icon: Box, label: '3D preview' },
          { icon: ShoppingBag, label: 'Secure cart' },
        ].map((item) => (
          <div key={item.label} className="lux-trustbar-item">
            <item.icon className="h-4 w-4 text-[var(--lux-gold)]" />
            {item.label}
          </div>
        ))}
      </div>

      <div className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-20">
        <SectionHeading
          eyebrow="Flux3D Boutique"
          icon={Sparkles}
          title="Shop ready-made 3D printed products"
          subtitle="Handpicked Flux3D objects with clean finishes and ready-to-ship presentation for desks, creators, gifting, and everyday setups."
        />

        {/* Premium Filter Bar */}
        <div className="mb-10 rounded-[var(--lux-radius-lg)] border border-[var(--lux-border-light)] bg-white p-4 shadow-[var(--lux-shadow-sm)] sm:p-5">
          <ProductFilterBar
            products={allProducts}
            categories={data.categories}
            onFilteredChange={setFilteredProducts}
          />
        </div>

        {/* Featured (from filtered) */}
        {featuredFiltered.length > 0 && (
          <section className="py-6 sm:py-8">
            <SectionHeading
              eyebrow="Featured"
              icon={BadgeCheck}
              title="Premium picks"
              href="/3d-shop/search?featured=true"
            />
            <ProductRow products={featuredFiltered} />
          </section>
        )}

        {/* New arrivals (from filtered) */}
        {newFiltered.length > 0 && (
          <section className="py-6 sm:py-8">
            <SectionHeading
              eyebrow="New arrivals"
              icon={PackageCheck}
              title="Fresh from the print queue"
              subtitle="New products added as they pass QA — quality-checked and ready to ship."
              href="/3d-shop/search?sort=newest"
            />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {newFiltered.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {filteredProducts.length === 0 && (
          <div className="py-16 text-center">
            <Box className="mx-auto mb-4 h-12 w-12 text-[var(--lux-taupe)]" />
            <h3 className="lux-heading-3 mb-2">No products match your filters</h3>
            <p className="text-sm text-[var(--lux-text-muted)]">Try adjusting your category or price selection.</p>
          </div>
        )}

        {/* CTA band */}
        <div className="mt-10 flex flex-col items-start gap-5 rounded-[var(--lux-radius-xl)] border border-[var(--lux-border-light)] bg-[var(--lux-bg-elevated)] p-6 shadow-[var(--lux-shadow-sm)] sm:flex-row sm:items-center sm:p-8">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--lux-text-primary)] text-white shadow-[var(--lux-shadow-md)]">
            <Layers3 className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-[var(--lux-font-display)] text-xl font-semibold leading-tight text-[var(--lux-text-primary)]">
              Explore the full 3D Shop
            </h3>
            <p className="mt-1 text-sm leading-6 text-[var(--lux-text-muted)]">
              Every product in the boutique — browse by category, filter by price, and view live 3D models before you buy.
            </p>
          </div>
          <Link
            href="/3d-shop"
            className="lux-btn-primary shrink-0"
          >
            Visit Shop
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
