import type { ShopProduct } from "@/lib/shop/admin-types";
import { ProductCard } from "./ProductCard";

type Props = {
  products: ShopProduct[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onPreview: (product: ShopProduct) => void;
  onDuplicate: (product: ShopProduct) => void;
  onArchive: (product: ShopProduct) => void;
};
export function ProductGridView({
  products,
  selectedIds,
  onSelect,
  onPreview,
  onDuplicate,
  onArchive,
}: Props) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          selected={selectedIds.has(product.id)}
          onSelect={onSelect}
          onPreview={onPreview}
          onDuplicate={onDuplicate}
          onArchive={onArchive}
        />
      ))}
    </div>
  );
}
