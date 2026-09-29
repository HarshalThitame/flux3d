import { describe, expect, it } from "vitest";
import {
  buildShopHomeShelves,
  HOME_SHELF_PRODUCT_LIMIT,
} from "@/lib/shop/home-shelves";
import type {
  ShopPublicCategory,
  ShopPublicProduct,
} from "@/lib/shop/public-types";

function category(
  id: string,
  parentCategoryId: string | null = null,
): ShopPublicCategory {
  return {
    id,
    name: id.replaceAll("-", " "),
    slug: id,
    description: `${id} description`,
    banner_image_url: null,
    parent_category_id: parentCategoryId,
  };
}

function product(
  id: string,
  overrides: Partial<ShopPublicProduct> = {},
): ShopPublicProduct {
  return {
    id,
    name: id,
    category_id: null,
    categories: [],
    product_categories: [],
    in_stock: true,
    has_preorder: false,
    stock_status: "in_stock",
    is_featured: false,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as ShopPublicProduct;
}

describe("buildShopHomeShelves", () => {
  it("maps a child's primary product to its root shelf without duplicates", () => {
    const categories = [
      category("desk"),
      category("organizers", "desk"),
      category("gifts"),
    ];
    const item = product("tray", {
      category_id: "gifts",
      categories: [
        {
          id: "organizers",
          name: "Organizers",
          slug: "organizers",
          is_primary: true,
        },
        { id: "gifts", name: "Gifts", slug: "gifts", is_primary: false },
      ],
      product_categories: [
        { category_id: "organizers", is_primary: true },
        { category_id: "gifts", is_primary: false },
      ],
    });

    const shelves = buildShopHomeShelves(categories, [item]);

    expect(shelves).toHaveLength(1);
    expect(shelves[0]?.id).toBe("desk");
    expect(shelves[0]?.children.map((child) => child.id)).toEqual([
      "organizers",
    ]);
    expect(shelves[0]?.products.map((entry) => entry.id)).toEqual(["tray"]);
  });

  it("uses legacy and first-category fallbacks before More products", () => {
    const categories = [category("desk"), category("gifts")];
    const shelves = buildShopHomeShelves(categories, [
      product("legacy", { category_id: "desk" }),
      product("first-related", {
        categories: [
          { id: "gifts", name: "Gifts", slug: "gifts", is_primary: false },
        ],
      }),
      product("orphan", { category_id: "missing" }),
      product("stale-primary", {
        category_id: "desk",
        categories: [
          {
            id: "deleted-category",
            name: "Deleted",
            slug: "deleted",
            is_primary: true,
          },
        ],
      }),
    ]);

    expect(shelves.map((shelf) => shelf.id)).toEqual([
      "desk",
      "gifts",
      "more-products",
    ]);
    expect(shelves[0]?.products.map((entry) => entry.id)).toEqual([
      "legacy",
      "stale-primary",
    ]);
    expect(shelves[1]?.products[0]?.id).toBe("first-related");
    expect(shelves[2]?.products[0]?.id).toBe("orphan");
    expect(shelves[2]?.href).toBe("/3d-shop/search");
  });

  it("keeps category order and ranks availability, featured, then newest", () => {
    const shelves = buildShopHomeShelves(
      [category("first"), category("second")],
      [
        product("sold-featured", {
          category_id: "first",
          in_stock: false,
          stock_status: "out_of_stock",
          is_featured: true,
          created_at: "2026-09-29T00:00:00.000Z",
        }),
        product("available-old", {
          category_id: "first",
          created_at: "2026-01-01T00:00:00.000Z",
        }),
        product("available-featured", {
          category_id: "first",
          is_featured: true,
          created_at: "2025-01-01T00:00:00.000Z",
        }),
        product("second-product", { category_id: "second" }),
      ],
    );

    expect(shelves.map((shelf) => shelf.id)).toEqual(["first", "second"]);
    expect(shelves[0]?.products.map((entry) => entry.id)).toEqual([
      "available-featured",
      "available-old",
      "sold-featured",
    ]);
  });

  it("caps previews while retaining the full count", () => {
    const products = Array.from(
      { length: HOME_SHELF_PRODUCT_LIMIT + 3 },
      (_, index) => product(`product-${index}`, { category_id: "desk" }),
    );

    const [shelf] = buildShopHomeShelves([category("desk")], products);

    expect(shelf?.totalCount).toBe(HOME_SHELF_PRODUCT_LIMIT + 3);
    expect(shelf?.products).toHaveLength(HOME_SHELF_PRODUCT_LIMIT);
  });

  it("safely falls cyclic category assignments back to More products", () => {
    const shelves = buildShopHomeShelves(
      [category("a", "b"), category("b", "a")],
      [product("cycle-product", { category_id: "a" })],
    );

    expect(shelves).toHaveLength(1);
    expect(shelves[0]?.id).toBe("more-products");
    expect(shelves[0]?.products[0]?.id).toBe("cycle-product");
  });
});
