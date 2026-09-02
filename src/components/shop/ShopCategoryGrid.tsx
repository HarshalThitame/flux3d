"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Layers3, Sparkles } from "lucide-react";
import type { ShopPublicCategory } from "@/lib/shop/public-types";

interface ShopCategoryGridProps {
  categories: ShopPublicCategory[];
}

export default function ShopCategoryGrid({
  categories,
}: ShopCategoryGridProps) {
  return (
    <section
      id="shop-categories"
      className="px-4 py-12 sm:px-6 md:px-10 lg:px-12 lg:py-16"
    >
      <div className="mx-auto w-full max-w-[1280px]">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--shop-gold)]">
              <Layers3 className="h-4 w-4" />
              Shop by category
            </div>
            <h2 className="font-[var(--shop-font-heading)] mt-2 max-w-2xl text-[clamp(1.25rem,2.5vw,1.75rem)] font-semibold leading-snug text-[var(--shop-text-primary)]">
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
          className={`grid gap-3 ${
            categories.length <= 2
              ? "grid-cols-1 sm:grid-cols-2"
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {categories.map((category, index) => {
            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.55,
                  delay: index * 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <Link
                  href={`/3d-shop/category/${category.slug}`}
                  className="group relative block overflow-hidden rounded-[var(--shop-radius-lg)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] shadow-[var(--shop-shadow-sm)] transition-all duration-500 ease-out hover:-translate-y-1 hover:border-[var(--shop-gold)] hover:shadow-[var(--shop-shadow-gold)]"
                >
                  {/* Shimmer sweep overlay */}
                  <span aria-hidden="true" className="bento-card-shimmer" />

                  <div className="relative overflow-hidden bg-[var(--shop-bg-muted)] aspect-[16/10]">
                    {category.banner_image_url ? (
                      <Image
                        src={category.banner_image_url}
                        alt={category.name}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
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

                  <div className="absolute inset-x-4 bottom-4 z-10">
                    <h3 className="font-[var(--shop-font-heading)] mt-2 text-base font-semibold text-white transition-all duration-300 group-hover:translate-y-[-2px]">
                      {category.name}
                    </h3>
                    {category.description ? (
                      <p className="mt-1 line-clamp-1 text-xs leading-5 text-white transition-colors duration-300">
                        {category.description}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
