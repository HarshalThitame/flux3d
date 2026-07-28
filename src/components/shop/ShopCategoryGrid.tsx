'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Layers3, Sparkles } from 'lucide-react'
import type { ShopPublicCategory } from '@/lib/shop/public-types'

interface ShopCategoryGridProps {
  categories: ShopPublicCategory[]
}

export default function ShopCategoryGrid({ categories }: ShopCategoryGridProps) {
  return (
    <section id="shop-categories" className="px-4 py-20 sm:px-6 md:px-10 lg:px-12 lg:py-28">
      <div className="mx-auto w-full max-w-[1280px]">
        <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--shop-gold)]">
              <Layers3 className="h-4 w-4" />
              Shop by category
            </div>
            <h2 className="font-[var(--shop-font-heading)] mt-3 max-w-2xl text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-tight text-[var(--shop-text-primary)]">
              Browse by purpose, finish, and setup.
            </h2>
          </div>
          <Link
            href="/3d-shop/search"
            className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-xl border border-[var(--shop-border-light)] bg-white px-5 text-sm font-semibold text-[var(--shop-text-primary)] transition hover:border-[var(--shop-gold)] hover:text-[var(--shop-gold)]"
          >
            View all products
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div
          className={`grid gap-4 ${
            categories.length <= 2
              ? 'grid-cols-1 sm:grid-cols-2'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {categories.map((category, index) => {
            const isFeatured = index === 0
            const isTwoOnly = categories.length <= 2
            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className={`${
                  isFeatured && !isTwoOnly
                    ? 'sm:col-span-1 sm:row-span-2 lg:col-span-1 lg:row-span-2'
                    : ''
                }`}
              >
                <Link
                  href={`/3d-shop/category/${category.slug}`}
                  className="group relative block overflow-hidden rounded-[var(--shop-radius-lg)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] shadow-[var(--shop-shadow-sm)] transition-all duration-500 ease-out hover:-translate-y-1.5 hover:border-[var(--shop-gold)] hover:shadow-[var(--shop-shadow-gold)]"
                >
                  {/* Shimmer sweep overlay */}
                  <span aria-hidden="true" className="bento-card-shimmer" />

                  <div
                    className={`relative overflow-hidden bg-[var(--shop-bg-muted)] ${
                      isFeatured && !isTwoOnly
                        ? 'aspect-[3/4] sm:aspect-[3/4]'
                        : isTwoOnly
                        ? 'aspect-[3/4] sm:aspect-[3/4]'
                        : 'aspect-[4/3]'
                    }`}
                  >
                    {category.banner_image_url ? (
                      <Image
                        src={category.banner_image_url}
                        alt={category.name}
                        fill
                        sizes={
                          isFeatured && !isTwoOnly
                            ? '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'
                            : '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'
                        }
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--shop-gold-faint),var(--shop-bg-soft))]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--shop-text-primary)]/75 via-[var(--shop-text-primary)]/20 to-transparent" />
                  </div>

                  {/* Gold accent line — expands from center on hover */}
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-1/2 z-10 h-[2px] w-0 -translate-x-1/2 bg-gradient-to-r from-transparent via-[var(--shop-gold)] to-transparent transition-all duration-500 ease-out group-hover:w-3/4"
                  />

                  <div className="absolute inset-x-5 bottom-5 z-10">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm transition-all duration-300 group-hover:border-[var(--shop-gold)] group-hover:bg-[var(--shop-gold)]/20 group-hover:shadow-[0_0_16px_rgba(201,169,98,0.35)]">
                      {category.icon_emoji ? (
                        <span className="text-base">{category.icon_emoji}</span>
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                    </div>
                    <h3
                      className={`font-[var(--shop-font-heading)] mt-3 font-semibold text-white transition-all duration-300 group-hover:translate-y-[-2px] ${
                        isFeatured && !isTwoOnly ? 'text-xl sm:text-2xl' : 'text-xl'
                      }`}
                    >
                      {category.name}
                    </h3>
                    {category.description ? (
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/70 transition-colors duration-300 group-hover:text-white/95">
                        {category.description}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
