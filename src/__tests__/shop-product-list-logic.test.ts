import { describe, expect, it } from "vitest";
import type { ShopProduct } from "@/lib/shop/admin-types";
import {
  filterProducts,
  pageProducts,
  productStatus,
  sortProducts,
  tabCounts,
} from "@/app/admin/3d-shop/_components/products/product-list-utils";

const now = new Date("2026-09-24T12:00:00.000Z");
const product = (overrides: Partial<ShopProduct>): ShopProduct => ({
  id: crypto.randomUUID(),
  name: "Product",
  slug: "product",
  description: null,
  long_description: null,
  long_description_blocks: null,
  category_id: null,
  tags: [],
  occasion_tags: [],
  thumbnail_url: null,
  landscape_image_url: null,
  image_urls: [],
  image_alt: {},
  default_dimensions: null,
  model_url: null,
  usdz_url: null,
  hotspots: [],
  hero_video_url: null,
  base_price: 100,
  sku_pattern: null,
  is_customizable: false,
  customization_label: null,
  customization_is_required: false,
  customization_min_length: 0,
  customization_max_length: null,
  is_featured: false,
  is_active: true,
  is_archived: false,
  meta_title: null,
  meta_description: null,
  published_at: null,
  created_at: "2026-09-20T00:00:00.000Z",
  updated_at: null,
  sku_count: 1,
  stock_status: "All In Stock",
  ...overrides,
});

describe("admin product list helpers", () => {
  const active = product({ id: "active", name: "Alpha", base_price: 200 });
  const draft = product({
    id: "draft",
    name: "Beta",
    is_active: false,
    stock_status: "Some Low Stock",
  });
  const scheduled = product({
    id: "scheduled",
    name: "Gamma",
    published_at: "2026-10-01T00:00:00.000Z",
  });
  const archived = product({
    id: "archived",
    name: "Delta",
    is_archived: true,
    stock_status: "Out of Stock",
  });
  const products = [active, draft, scheduled, archived];

  it("makes future-published products an exclusive scheduled status", () => {
    expect(productStatus(scheduled, now)).toBe("scheduled");
    expect(productStatus(archived, now)).toBe("archived");
    expect(tabCounts(products, now)).toEqual({
      all: 4,
      active: 1,
      draft: 1,
      archived: 1,
      scheduled: 1,
    });
  });

  it("combines status and advanced filters", () => {
    expect(
      filterProducts(
        products,
        {
          status: "draft",
          categoryId: "",
          search: "",
          stock: "low_stock",
          featuredOnly: false,
          customizableOnly: false,
          priceMin: "",
          priceMax: "",
        },
        now,
      ),
    ).toEqual([draft]);
    expect(
      filterProducts(
        products,
        {
          status: "all",
          categoryId: "",
          search: "alpha",
          stock: "",
          featuredOnly: false,
          customizableOnly: false,
          priceMin: 150,
          priceMax: 250,
        },
        now,
      ),
    ).toEqual([active]);
  });

  it("sorts and paginates without mutating the catalog", () => {
    const sorted = sortProducts(products, "name", "desc");
    expect(sorted.map((item) => item.name)).toEqual([
      "Gamma",
      "Delta",
      "Beta",
      "Alpha",
    ]);
    expect(pageProducts(sorted, 2, 2).map((item) => item.name)).toEqual([
      "Beta",
      "Alpha",
    ]);
    expect(products[0]).toBe(active);
  });
});
