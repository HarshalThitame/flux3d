import Image from "next/image";
import Link from "next/link";
import { Archive, Copy, Eye, Pencil } from "lucide-react";
import type { ShopProduct } from "@/lib/shop/admin-types";
import { productStatus, stockBarClasses } from "./product-list-utils";

type Props = {
  product: ShopProduct;
  selected: boolean;
  onSelect: (id: string) => void;
  onPreview: (product: ShopProduct) => void;
  onDuplicate: (product: ShopProduct) => void;
  onArchive: (product: ShopProduct) => void;
};

export function ProductCard({
  product,
  selected,
  onSelect,
  onPreview,
  onDuplicate,
  onArchive,
}: Props) {
  const status = productStatus(product);
  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${selected ? "border-[#6d28d9] ring-2 ring-[#6d28d9]/15" : "border-gray-200"}`}
    >
      <label className="absolute left-3 top-3 z-10 rounded bg-white/90 p-1 shadow-sm">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(product.id)}
          aria-label={`Select ${product.name}`}
          className="h-4 w-4 accent-[#6d28d9]"
        />
      </label>
      {product.is_featured && (
        <span className="absolute right-3 top-3 z-10 rounded-full bg-violet-600 px-2 py-1 text-[10px] font-bold text-white shadow">
          ★ Featured
        </span>
      )}
      <button
        type="button"
        onClick={() => onPreview(product)}
        className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6d28d9]"
      >
        <div className="relative aspect-video overflow-hidden bg-gray-100">
          {product.thumbnail_url ? (
            <Image
              src={product.thumbnail_url}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              className="object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full place-items-center text-sm font-medium text-[#6F7192]">
              No image
            </div>
          )}
        </div>
        <div className="space-y-3 p-4">
          <div>
            <h2 className="truncate text-sm font-semibold text-[#0F1B3D]">
              {product.name}
            </h2>
            <p className="mt-1 truncate text-xs text-[#6F7192]">
              {product.category_name || "Uncategorized"}{" "}
              <span className="mx-1">·</span>{" "}
              <span className="capitalize">{status}</span>
            </p>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-[#0F1B3D]">
              ₹{Number(product.base_price ?? 0).toFixed(2)}
            </span>
            <span className="text-xs text-[#6F7192]">
              {product.sku_count ?? 0} SKU{product.sku_count === 1 ? "" : "s"}
            </span>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-[10px] font-medium text-[#6F7192]">
              <span>{product.stock_status ?? "No SKUs"}</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100">
              <div
                className={`h-1.5 rounded-full ${stockBarClasses(product.stock_status)}`}
              />
            </div>
          </div>
        </div>
      </button>
      <div className="flex border-t border-gray-100 bg-gray-50/70 p-2 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
        <Link
          href={`/admin/3d-shop/products/${product.id}/edit`}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-[#0F1B3D] hover:bg-white"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Link>
        <button
          type="button"
          onClick={() => onDuplicate(product)}
          aria-label={`Duplicate ${product.name}`}
          className="rounded-lg p-1.5 text-[#6F7192] hover:bg-white hover:text-[#6d28d9]"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onArchive(product)}
          aria-label={`Archive ${product.name}`}
          className="rounded-lg p-1.5 text-[#6F7192] hover:bg-white hover:text-rose-600"
        >
          <Archive className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onPreview(product)}
          aria-label={`Preview ${product.name}`}
          className="rounded-lg p-1.5 text-[#6F7192] hover:bg-white hover:text-[#6d28d9]"
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}
