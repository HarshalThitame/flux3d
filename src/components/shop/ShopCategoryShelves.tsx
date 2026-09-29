import Link from "next/link";
import { ArrowRight, Layers3 } from "lucide-react";
import HomeCategoryNav from "@/components/shop/HomeCategoryNav";
import ProductCard from "@/components/shop/ProductCard";
import type { ShopCategoryShelf } from "@/lib/shop/home-shelves";

export default function ShopCategoryShelves({
  shelves,
}: {
  shelves: ShopCategoryShelf[];
}) {
  return (
    <section
      id="shop-products"
      aria-labelledby="shop-products-heading"
      className="px-4 py-16 sm:px-6 md:px-10 lg:px-12 lg:py-24"
    >
      <div className="mx-auto w-full max-w-[1280px]">
        <div className="mb-8 max-w-2xl">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--shop-gold)]">
            <Layers3 className="h-4 w-4" aria-hidden="true" />
            Shop by category
          </div>
          <h2
            id="shop-products-heading"
            className="font-[var(--shop-font-heading)] mt-3 text-[clamp(1.8rem,4vw,2.8rem)] font-semibold text-[var(--shop-text-primary)]"
          >
            Find the right piece for your space
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--shop-text-muted)] sm:text-base">
            Explore focused collections, then open any category for its full
            catalog and advanced filters.
          </p>
        </div>

        {shelves.length > 0 ? (
          <>
            <HomeCategoryNav shelves={shelves} />
            <div className="space-y-16 pt-12 lg:space-y-24 lg:pt-16">
              {shelves.map((shelf) => (
                <section
                  key={shelf.id}
                  id={shelf.anchorId}
                  aria-labelledby={`${shelf.anchorId}-heading`}
                  className="scroll-mt-40"
                >
                  <div className="mb-6 flex flex-col gap-5 border-b border-[var(--shop-border-light)] pb-5 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3
                          id={`${shelf.anchorId}-heading`}
                          className="font-[var(--shop-font-heading)] text-2xl font-semibold text-[var(--shop-text-primary)] sm:text-3xl"
                        >
                          {shelf.name}
                        </h3>
                        <span className="rounded-full bg-[var(--shop-gold-faint)] px-2.5 py-1 text-xs font-bold text-[var(--shop-gold)]">
                          {shelf.totalCount} product
                          {shelf.totalCount === 1 ? "" : "s"}
                        </span>
                      </div>
                      {shelf.description ? (
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--shop-text-muted)]">
                          {shelf.description}
                        </p>
                      ) : null}
                      {shelf.children.length > 0 ? (
                        <nav
                          className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
                          aria-label={`${shelf.name} subcategories`}
                        >
                          {shelf.children.map((child) => (
                            <Link
                              key={child.id}
                              href={`/3d-shop/category/${child.slug}`}
                              className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-[var(--shop-border-light)] bg-white px-3.5 text-xs font-semibold text-[var(--shop-text-secondary)] transition hover:border-[var(--shop-border-gold)] hover:text-[var(--shop-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shop-gold)] focus-visible:ring-offset-2"
                            >
                              {child.name}
                            </Link>
                          ))}
                        </nav>
                      ) : null}
                    </div>

                    <Link
                      href={shelf.href}
                      className="group inline-flex min-h-11 w-fit shrink-0 items-center justify-center gap-2 rounded-full border border-[var(--shop-border-medium)] bg-white px-5 text-sm font-semibold text-[var(--shop-text-primary)] transition hover:border-[var(--shop-gold)] hover:text-[var(--shop-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shop-gold)] focus-visible:ring-offset-2"
                    >
                      View all
                      <span className="sr-only"> {shelf.name} products</span>
                      <ArrowRight
                        className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
                        aria-hidden="true"
                      />
                    </Link>
                  </div>

                  <div className="-mx-4 grid snap-x snap-mandatory grid-flow-col auto-cols-[minmax(17rem,82vw)] gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 md:grid-cols-3 lg:grid-cols-4">
                    {shelf.products.map((product, index) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        index={index}
                        displayMode="home-shelf"
                        className="snap-start"
                      />
                    ))}
                  </div>

                  {shelf.totalCount > shelf.products.length ? (
                    <p className="mt-3 text-xs font-medium text-[var(--shop-text-muted)]">
                      Showing {shelf.products.length} of {shelf.totalCount}
                    </p>
                  ) : null}
                </section>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-light)] bg-white px-6 py-16 text-center shadow-[var(--shop-shadow-sm)]">
            <h3 className="font-[var(--shop-font-heading)] text-xl font-semibold text-[var(--shop-text-primary)]">
              New products are on the way
            </h3>
            <p className="mt-2 text-sm text-[var(--shop-text-muted)]">
              Check back soon for the next Flux3D collection.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
