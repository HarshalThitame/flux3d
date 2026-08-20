'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { ArrowRight, ArrowDown, Box, ShieldCheck, ShoppingBag, Star, Truck } from 'lucide-react'
import { scrollToTarget } from '@/lib/scroll-to'
import type { ShopHomeData, ShopPublicProduct } from '@/lib/shop/public-types'
import FeaturedSpotlight from './FeaturedSpotlight'

function HeroFadeIn({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const [prefersReducedMotion] = useState(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  return (
    <div
      className={prefersReducedMotion ? className ?? '' : `animate-fade-in ${className ?? ''}`}
      style={prefersReducedMotion || delay === 0 ? undefined : { animationDelay: `${delay}s`, animationFillMode: 'both' }}
    >
      {children}
    </div>
  )
}

const marqueeItems = [
  'QA checked',
  'Ready to ship',
  '3D preview',
  'Secure cart',
  'Custom prints',
  'Made in India',
  'Clear pricing',
  'Tracked delivery',
]

const trustRow = [
  { icon: ShieldCheck, label: 'QA checked' },
  { icon: Truck, label: 'Ready to ship' },
  { icon: Box, label: '3D preview' },
  { icon: ShoppingBag, label: 'Secure cart' },
]

export default function HeroSection({ shopData }: { shopData: ShopHomeData }) {
  const featuredProducts: ShopPublicProduct[] =
    shopData.featured_products.length > 0 ? shopData.featured_products.slice(0, 3) : shopData.new_arrivals.slice(0, 3)
  const categories = shopData.categories.slice(0, 6)

  const ratedProducts = [...shopData.featured_products, ...shopData.new_arrivals]
  const totalReviews = ratedProducts.reduce((sum, product) => sum + product.review_count, 0)
  const averageRating =
    totalReviews > 0
      ? ratedProducts.reduce((sum, product) => sum + product.avg_rating * product.review_count, 0) / totalReviews
      : 4.9

  return (
    <section className="premium-hero relative overflow-hidden px-4 pb-10 pt-16 sm:px-6 sm:pt-20 md:pt-24 lg:px-10">
      <div className="premium-hero-media" aria-hidden="true">
        <Image
          src="/printer-poster.webp"
          alt=""
          fill
          quality={50}
          sizes="100vw"
          loading="eager"
          fetchPriority="high"
          className="premium-hero-poster"
          priority
        />
      </div>

      <div className="premium-hero-mobile-bg md:hidden" aria-hidden="true">
        <Image
          src="/printer-poster.webp"
          alt=""
          fill
          quality={65}
          sizes="100vw"
          loading="eager"
          fetchPriority="high"
          className="object-cover object-[center_15%]"
        />
      </div>

      <div className="premium-hero-surface" aria-hidden="true" />
      <div className="premium-hero-grid" aria-hidden="true" />
      <div className="premium-hero-beams" aria-hidden="true" />
      <div className="premium-corner-frame" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-7xl flex-col justify-center gap-10 py-4 md:gap-12 md:py-6">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_460px] xl:grid-cols-[minmax(0,1fr)_500px]">
          <div className="min-w-0 text-center lg:text-left">
            <HeroFadeIn delay={0.2}>
              <div className="premium-hero-badge inline-flex">
                <span className="premium-live-dot" />
                Flux3D Boutique · Ready-to-ship 3D prints
              </div>
            </HeroFadeIn>

            <h1 className="premium-hero-title mt-6 text-[clamp(2.4rem,8vw,4.5rem)] font-black leading-[0.9] text-[#070b1d] sm:text-6xl md:text-7xl">
              <span className="premium-title-line block">
                <span className="premium-title-brand">Flux3D</span>
              </span>
              <span className="premium-title-line premium-title-shop block">
                Premium 3D prints, <span className="premium-title-shop-accent">ready to own.</span>
              </span>
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-[#2e1065] sm:text-lg lg:mx-0 lg:leading-8">
              Hand-finished, quality-checked 3D printed products for desks, creators, and thoughtful gifting — with clear
              pricing, live 3D previews, and delivery across India.
            </p>

            <HeroFadeIn delay={0.4} className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/3d-shop/category/${category.slug}`}
                  prefetch={false}
                  className="premium-chip premium-chip-link inline-flex items-center gap-1.5"
                >
                  {category.icon_emoji && <span aria-hidden="true">{category.icon_emoji}</span>}
                  {category.name}
                </Link>
              ))}
            </HeroFadeIn>

            <HeroFadeIn delay={0.5} className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 lg:justify-start">
              <span className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-[#d4af37] text-[#d4af37]" />
                <span className="text-sm font-bold text-[#070b1d]">{averageRating.toFixed(1)}</span>
              </span>
              <span className="h-4 w-px bg-[#d1c4e0]" />
              <span className="text-sm font-semibold text-[#4B5563]">{totalReviews.toLocaleString('en-IN')}+ reviews</span>
              <span className="h-4 w-px bg-[#d1c4e0]" />
              <span className="text-sm font-semibold text-[#4B5563]">Trusted by creators across India</span>
            </HeroFadeIn>

            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
              <Link
                href="/3d-shop"
                prefetch={false}
                className="premium-primary-cta group relative flex min-h-[56px] items-center justify-center gap-2 overflow-hidden rounded-full px-7 py-4 text-center text-sm font-bold text-white focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2"
              >
                <span className="relative z-10">Shop the Collection</span>
                <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <button
                type="button"
                onClick={() => scrollToTarget('shop')}
                className="premium-secondary-cta focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:ring-offset-2 flex min-h-[56px] min-w-[170px] items-center justify-center gap-2 whitespace-nowrap rounded-full px-7 py-4 text-sm font-bold text-[#070b1d]"
              >
                Browse Shop
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>

            <HeroFadeIn delay={0.7} className="hero-trust-row mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 lg:justify-start">
              {trustRow.map((item) => (
                <span key={item.label} className="flex items-center gap-1.5 text-xs font-semibold text-[#5b21b6]">
                  <item.icon className="h-3.5 w-3.5 text-[#6d28d9]" />
                  {item.label}
                </span>
              ))}
            </HeroFadeIn>
          </div>

          <HeroFadeIn delay={0.35} className="relative mx-auto w-full max-w-[520px] lg:max-w-none">
            <FeaturedSpotlight products={featuredProducts} />
          </HeroFadeIn>
        </div>

        <div className="premium-marquee overflow-hidden" aria-hidden="true">
          <div className="premium-marquee-track">
            {[...marqueeItems, ...marqueeItems].map((label, index) => (
              <span key={`${label}-${index}`} className="premium-marquee-item inline-flex items-center gap-2">
                <span className="premium-marquee-mark" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}