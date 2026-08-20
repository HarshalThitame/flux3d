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
  Zap,
  type LucideIcon,
} from 'lucide-react'
import ProductCard from '@/components/shop/ProductCard'
import ShopCategoryGrid from '@/components/shop/ShopCategoryGrid'
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
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--shop-gold)]">
          <Icon className="h-4 w-4" />
          {eyebrow}
        </div>
        <h2 className="font-[var(--shop-font-heading)] mt-3 text-[clamp(2rem,5vw,3rem)] font-semibold leading-tight text-[var(--shop-text-primary)]">
          {title}
        </h2>
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

export default function LandingShopSection({ data }: { data: ShopHomeData }) {
  return (
    <section id="shop" className="premium-shop-section premium-band premium-band-panel scroll-mt-20" aria-label="3D Shop">
      {/* Trust bar */}
      <div className="premium-shop-trustbar">
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

      <div className="premium-shop-inner">
        <SectionHeading
          eyebrow="Flux3D Boutique"
          icon={Sparkles}
          title="Shop ready-made 3D printed products"
          subtitle="Handpicked Flux3D objects with clean finishes and ready-to-ship presentation for desks, creators, gifting, and everyday setups."
        />

        {/* Categories */}
        <ShopCategoryGrid categories={data.categories} />

        {/* Featured */}
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

        {/* Occasion collections */}
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

        {/* New arrivals */}
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

        {/* CTA band */}
        <div className="premium-shop-cta">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4c1d95] to-[#7c3aed] text-white shadow-[0_16px_40px_rgba(109,40,217,0.35)]">
            <Layers3 className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xl font-black leading-tight text-[#070b1d]">Explore the full 3D Shop</h3>
            <p className="mt-1 text-sm leading-6 text-[#4B5563]">
              Every product in the boutique — browse by category, filter by price, and view live 3D models before you buy.
            </p>
          </div>
          <Link
            href="/3d-shop"
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#5b21b6] to-[#7c3aed] px-6 text-sm font-bold text-white shadow-[0_12px_30px_rgba(109,40,217,0.35)] transition hover:from-[#4c1d95] hover:to-[#6d28d9]"
          >
            Visit Shop
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}