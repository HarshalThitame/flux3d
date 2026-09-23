import type { ShopProduct } from "@/lib/shop/admin-types";

export type ProductStatus =
  "all" | "active" | "draft" | "archived" | "scheduled";
export type StockFilter = "" | "in_stock" | "low_stock" | "out_of_stock";
export type SortKey = "name" | "price" | "created_at" | "stock";
export type SortDirection = "asc" | "desc";

export type ProductFilters = {
  status: ProductStatus;
  categoryId: string;
  search: string;
  stock: StockFilter;
  featuredOnly: boolean;
  customizableOnly: boolean;
  priceMin: number | "";
  priceMax: number | "";
};

const STOCK_RANK: Record<NonNullable<ShopProduct["stock_status"]>, number> = {
  "Out of Stock": 0,
  "Some Low Stock": 1,
  "No SKUs": 2,
  "All In Stock": 3,
};

export function isScheduled(product: ShopProduct, now = new Date()) {
  return Boolean(
    !product.is_archived &&
    product.published_at &&
    new Date(product.published_at).getTime() > now.getTime(),
  );
}

export function productStatus(
  product: ShopProduct,
  now = new Date(),
): Exclude<ProductStatus, "all"> {
  if (product.is_archived) return "archived";
  if (isScheduled(product, now)) return "scheduled";
  return product.is_active ? "active" : "draft";
}

export function tabCounts(products: ShopProduct[], now = new Date()) {
  return {
    all: products.length,
    active: products.filter(
      (product) => productStatus(product, now) === "active",
    ).length,
    draft: products.filter((product) => productStatus(product, now) === "draft")
      .length,
    archived: products.filter(
      (product) => productStatus(product, now) === "archived",
    ).length,
    scheduled: products.filter(
      (product) => productStatus(product, now) === "scheduled",
    ).length,
  };
}

export function filterProducts(
  products: ShopProduct[],
  filters: ProductFilters,
  now = new Date(),
) {
  const search = filters.search.trim().toLocaleLowerCase();
  return products.filter((product) => {
    if (
      filters.status !== "all" &&
      productStatus(product, now) !== filters.status
    )
      return false;
    if (filters.categoryId && product.category_id !== filters.categoryId)
      return false;
    if (
      search &&
      !`${product.name} ${product.category_name ?? ""}`
        .toLocaleLowerCase()
        .includes(search)
    )
      return false;
    if (filters.stock === "in_stock" && product.stock_status !== "All In Stock")
      return false;
    if (
      filters.stock === "low_stock" &&
      product.stock_status !== "Some Low Stock"
    )
      return false;
    if (
      filters.stock === "out_of_stock" &&
      product.stock_status !== "Out of Stock"
    )
      return false;
    if (filters.featuredOnly && !product.is_featured) return false;
    if (filters.customizableOnly && !product.is_customizable) return false;
    if (filters.priceMin !== "" && product.base_price < filters.priceMin)
      return false;
    if (filters.priceMax !== "" && product.base_price > filters.priceMax)
      return false;
    return true;
  });
}

export function sortProducts(
  products: ShopProduct[],
  key: SortKey,
  direction: SortDirection,
) {
  const multiplier = direction === "asc" ? 1 : -1;
  return [...products].sort((a, b) => {
    if (key === "name") return multiplier * a.name.localeCompare(b.name);
    if (key === "price") return multiplier * (a.base_price - b.base_price);
    if (key === "stock")
      return (
        multiplier *
        ((STOCK_RANK[a.stock_status ?? "No SKUs"] ?? 0) -
          (STOCK_RANK[b.stock_status ?? "No SKUs"] ?? 0))
      );
    return (
      multiplier *
      (new Date(a.created_at ?? 0).getTime() -
        new Date(b.created_at ?? 0).getTime())
    );
  });
}

export function pageProducts(
  products: ShopProduct[],
  page: number,
  pageSize: number,
) {
  return products.slice((page - 1) * pageSize, page * pageSize);
}

export function stockBarClasses(status: ShopProduct["stock_status"]) {
  if (status === "All In Stock") return "w-4/5 bg-emerald-500";
  if (status === "Some Low Stock") return "w-2/5 bg-amber-500";
  if (status === "Out of Stock") return "w-0 bg-rose-500";
  return "w-1/4 bg-gray-300";
}
