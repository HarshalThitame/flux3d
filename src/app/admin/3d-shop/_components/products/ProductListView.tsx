import Image from "next/image";
import Link from "next/link";
import {
  Archive,
  ChevronDown,
  Copy,
  Eye,
  MoreHorizontal,
  Pencil,
  ArrowUpDown,
} from "lucide-react";
import type { ShopProduct } from "@/lib/shop/admin-types";
import type { SortDirection, SortKey } from "./product-list-utils";
import { productStatus, stockBarClasses } from "./product-list-utils";

type Props = {
  products: ShopProduct[];
  selectedIds: Set<string>;
  allPageSelected: boolean;
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  onPreview: (product: ShopProduct) => void;
  onDuplicate: (product: ShopProduct) => void;
  onArchive: (product: ShopProduct) => void;
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
};
const statusTone: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  draft: "bg-gray-100 text-gray-600",
  archived: "bg-amber-50 text-amber-700",
  scheduled: "bg-violet-50 text-violet-700",
};
function SortHeader({
  label,
  value,
  sortKey,
  sortDirection,
  onSort,
}: {
  label: string;
  value: SortKey;
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSort(value)}
      className="inline-flex items-center gap-1 hover:text-[#0F1B3D]"
    >
      {label}
      <ArrowUpDown
        className={`h-3 w-3 ${sortKey === value ? "text-[#6d28d9]" : ""}`}
      />
      <span className="sr-only">{sortKey === value ? sortDirection : ""}</span>
    </button>
  );
}
export function ProductListView({
  products,
  selectedIds,
  allPageSelected,
  onSelect,
  onSelectAll,
  onPreview,
  onDuplicate,
  onArchive,
  sortKey,
  sortDirection,
  onSort,
}: Props) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-[950px] w-full divide-y divide-gray-100">
        <thead className="sticky top-0 z-10 bg-gray-50">
          <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-[#6F7192]">
            <th className="w-12 px-4 py-3">
              <input
                type="checkbox"
                checked={allPageSelected && products.length > 0}
                onChange={onSelectAll}
                aria-label="Select all visible products"
                className="h-4 w-4 accent-[#6d28d9]"
              />
            </th>
            <th className="px-4 py-3">
              <SortHeader
                label="Product"
                value="name"
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={onSort}
              />
            </th>
            <th className="px-4 py-3">
              <SortHeader
                label="Price"
                value="price"
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={onSort}
              />
            </th>
            <th className="px-4 py-3">
              <SortHeader
                label="Stock"
                value="stock"
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={onSort}
              />
            </th>
            <th className="px-4 py-3">State</th>
            <th className="px-4 py-3">SKUs</th>
            <th className="px-4 py-3">
              <SortHeader
                label="Created"
                value="created_at"
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={onSort}
              />
            </th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {products.map((product) => {
            const status = productStatus(product);
            return (
              <tr key={product.id} className="group hover:bg-gray-50">
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(product.id)}
                    onChange={() => onSelect(product.id)}
                    aria-label={`Select ${product.name}`}
                    className="h-4 w-4 accent-[#6d28d9]"
                  />
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative h-11 w-11 overflow-hidden rounded-lg bg-gray-100">
                      {product.thumbnail_url ? (
                        <Image
                          src={product.thumbnail_url}
                          alt=""
                          fill
                          sizes="44px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="grid h-full place-items-center text-[10px] text-[#6F7192]">
                          N/A
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/admin/3d-shop/products/${product.id}/edit`}
                        className="block max-w-48 truncate text-sm font-semibold text-[#0F1B3D] hover:text-[#6d28d9]"
                      >
                        {product.name}
                      </Link>
                      <span className="text-xs text-[#6F7192]">
                        {product.category_name || "Uncategorized"}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm font-semibold text-[#0F1B3D]">
                  ₹{Number(product.base_price ?? 0).toFixed(2)}
                </td>
                <td className="px-4 py-4">
                  <div className="min-w-28">
                    <span className="text-xs text-[#6F7192]">
                      {product.stock_status ?? "No SKUs"}
                    </span>
                    <div className="mt-1 h-1.5 rounded-full bg-gray-100">
                      <div
                        className={`h-1.5 rounded-full ${stockBarClasses(product.stock_status)}`}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold capitalize ${statusTone[status]}`}
                  >
                    {status}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-[#6F7192]">
                  {product.sku_count ?? 0}
                </td>
                <td className="px-4 py-4 text-sm text-[#6F7192]">
                  {product.created_at
                    ? new Date(product.created_at).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onPreview(product)}
                      aria-label={`Preview ${product.name}`}
                      className="rounded-lg p-2 text-[#6F7192] hover:bg-gray-200 hover:text-[#0F1B3D]"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <details className="relative">
                      <summary
                        aria-label={`More actions for ${product.name}`}
                        className="list-none cursor-pointer rounded-lg p-2 text-[#6F7192] hover:bg-gray-200"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </summary>
                      <div className="absolute right-0 z-20 mt-1 w-36 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
                        <Link
                          href={`/admin/3d-shop/products/${product.id}/edit`}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => onDuplicate(product)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Duplicate
                        </button>
                        <button
                          type="button"
                          onClick={() => onArchive(product)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                        >
                          <Archive className="h-3.5 w-3.5" />
                          Archive
                        </button>
                      </div>
                    </details>
                    <ChevronDown className="sr-only" />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
