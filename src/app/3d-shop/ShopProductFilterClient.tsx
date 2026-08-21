'use client'

import { useState } from 'react'
import { Box } from 'lucide-react'
import ProductCard from '@/components/shop/ProductCard'
import ProductFilterBar from '@/components/shop/ProductFilterBar'
import type { ShopPublicCategory, ShopPublicProduct } from '@/lib/shop/public-types'

export default function ShopProductFilterClient({
  products,
  categories,
}: {
  products: ShopPublicProduct[]
  categories: ShopPublicCategory[]
}) {
  const [filtered, setFiltered] = useState<ShopPublicProduct[]>(products)

  return (
    <div>
      <div className="mb-8 rounded-[var(--shop-radius-lg)] border border-[var(--shop-border-light)] bg-white p-4 shadow-[var(--shop-shadow-sm)] sm:p-5">
        <ProductFilterBar
          products={products}
          categories={categories}
          onFilteredChange={setFiltered}
        />
      </div>

      <div className="mb-3 text-sm font-medium text-[var(--shop-text-muted)]">
        {filtered.length} product{filtered.length !== 1 ? 's' : ''}
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center">
          <Box className="mx-auto mb-4 h-12 w-12 text-[var(--shop-text-subtle)]" />
          <h3 className="font-[var(--shop-font-heading)] text-xl font-semibold text-[var(--shop-text-primary)]">
            No products found
          </h3>
          <p className="mt-2 text-sm text-[var(--shop-text-muted)]">
            Try adjusting your filters to see more results.
          </p>
        </div>
      )}
    </div>
  )
}
