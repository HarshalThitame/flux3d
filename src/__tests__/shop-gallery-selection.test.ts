import { describe, expect, it } from "vitest";
import {
  getDefaultShopSelection,
  getShopGalleryImages,
} from "@/lib/shop/selection";
import type { ShopPublicProduct } from "@/lib/shop/public-types";

function makeProduct(
  overrides: Partial<ShopPublicProduct> = {},
): ShopPublicProduct {
  return {
    id: "p1",
    name: "Test Lamp",
    slug: "test-lamp",
    description: null,
    long_description: null,
    long_description_blocks: null,
    category_id: null,
    category_name: null,
    category_slug: null,
    tags: [],
    occasion_tags: [],
    thumbnail_url: "cover.jpg",
    landscape_image_url: null,
    image_urls: ["gallery-a.jpg", "gallery-b.jpg"],
    image_alt: {},
    model_url: null,
    usdz_url: null,
    hotspots: [],
    hero_video_url: null,
    base_price: 1000,
    display_price: 1000,
    compare_at_price: null,
    sku_pattern: null,
    is_customizable: false,
    customization_label: null,
    is_featured: false,
    is_active: true,
    is_archived: false,
    meta_title: null,
    meta_description: null,
    created_at: null,
    updated_at: null,
    skus: [],
    variant_options: [],
    variant_option_dimensions: [],
    variant_option_images: [],
    sku_images: {},
    sku_count: 0,
    avg_rating: 0,
    review_count: 0,
    review_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    in_stock: true,
    stock_status: "in_stock",
    has_sale: false,
    has_preorder: false,
    is_low_stock: false,
    is_new: false,
    ...overrides,
  };
}

describe("getShopGalleryImages — merged galleries", () => {
  it("keeps product images reachable after selecting a variant with its own images", () => {
    const product = makeProduct({
      skus: [
        {
          product_id: "p1",
          id: "s-red",
          sku_code: "R",
          variant_combination: { Color: "Red" },
          price: 1200,
          compare_at_price: null,
          stock_quantity: 5,
          low_stock_threshold: 5,
          weight_grams: null,
          variant_image_url: null,
          model_url: null,
          is_available: true,
          pre_order_eta: null,
          created_at: null,
          updated_at: null,
        },
      ],
      variant_options: [
        {
          id: "o1",
          product_id: "p1",
          option_name: "Color",
          option_type: "button",
          values: ["Red"],
          display_order: 0,
          is_required: true,
          created_at: null,
        },
      ],
      variant_option_images: [
        {
          id: "vi1",
          product_id: "p1",
          option_name: "Color",
          option_value: "Red",
          image_url: "red-1.jpg",
          alt_text: null,
          display_order: 0,
          is_primary: true,
          created_at: null,
        },
        {
          id: "vi2",
          product_id: "p1",
          option_name: "Color",
          option_value: "Red",
          image_url: "red-2.jpg",
          alt_text: null,
          display_order: 1,
          is_primary: false,
          created_at: null,
        },
      ],
    });

    const gallery = getShopGalleryImages(product, { Color: "Red" });
    // Variant shots first...
    expect(gallery.images.slice(0, 2)).toEqual(["red-1.jpg", "red-2.jpg"]);
    // ...then the general product shots remain swipeable.
    expect(gallery.images).toContain("cover.jpg");
    expect(gallery.images).toContain("gallery-a.jpg");
    expect(gallery.images).toContain("gallery-b.jpg");
    expect(gallery.caption).toBe("Color: Red");
  });

  it("does not duplicate an image that appears in both variant and product lists", () => {
    const product = makeProduct({
      variant_option_images: [
        {
          id: "vi1",
          product_id: "p1",
          option_name: "Color",
          option_value: "Red",
          image_url: "cover.jpg",
          alt_text: null,
          display_order: 0,
          is_primary: true,
          created_at: null,
        },
      ],
      variant_options: [
        {
          id: "o1",
          product_id: "p1",
          option_name: "Color",
          option_type: "button",
          values: ["Red"],
          display_order: 0,
          is_required: true,
          created_at: null,
        },
      ],
    });
    const gallery = getShopGalleryImages(product, { Color: "Red" });
    expect(gallery.images.filter((url) => url === "cover.jpg")).toHaveLength(1);
  });

  it("falls back to the full product gallery when nothing variant-specific matches", () => {
    const product = makeProduct();
    const gallery = getShopGalleryImages(product, {});
    expect(gallery.images).toEqual([
      "cover.jpg",
      "gallery-a.jpg",
      "gallery-b.jpg",
    ]);
    expect(gallery.source).toBe("product");
  });
});

describe("getShopGalleryImages — multi-option merging (Option A)", () => {
  const twoOptions = [
    {
      id: "o1",
      product_id: "p1",
      option_name: "Color",
      option_type: "button" as const,
      values: ["Red", "Blue"],
      display_order: 0,
      is_required: true,
      created_at: null,
    },
    {
      id: "o2",
      product_id: "p1",
      option_name: "Size",
      option_type: "button" as const,
      values: ["Large", "Small"],
      display_order: 1,
      is_required: true,
      created_at: null,
    },
  ];
  const twoSkus = [
    {
      product_id: "p1",
      id: "s-red-large",
      sku_code: "RL",
      variant_combination: { Color: "Red", Size: "Large" },
      price: 1000,
      compare_at_price: null,
      stock_quantity: 5,
      low_stock_threshold: 5,
      weight_grams: null,
      variant_image_url: null,
      model_url: null,
      is_available: true,
      pre_order_eta: null,
      created_at: null,
      updated_at: null,
    },
    {
      product_id: "p1",
      id: "s-red-small",
      sku_code: "RS",
      variant_combination: { Color: "Red", Size: "Small" },
      price: 900,
      compare_at_price: null,
      stock_quantity: 5,
      low_stock_threshold: 5,
      weight_grams: null,
      variant_image_url: null,
      model_url: null,
      is_available: true,
      pre_order_eta: null,
      created_at: null,
      updated_at: null,
    },
  ];

  it("merges images from every selected option that has a gallery", () => {
    const product = makeProduct({
      skus: twoSkus,
      variant_options: twoOptions,
      variant_option_images: [
        {
          id: "v1",
          product_id: "p1",
          option_name: "Color",
          option_value: "Red",
          image_url: "red-1.jpg",
          alt_text: null,
          display_order: 0,
          is_primary: true,
          created_at: null,
        },
        {
          id: "v2",
          product_id: "p1",
          option_name: "Size",
          option_value: "Large",
          image_url: "large-1.jpg",
          alt_text: null,
          display_order: 0,
          is_primary: true,
          created_at: null,
        },
      ],
    });
    const gallery = getShopGalleryImages(product, {
      Color: "Red",
      Size: "Large",
    });
    expect(gallery.images.slice(0, 2)).toEqual(["red-1.jpg", "large-1.jpg"]);
    expect(gallery.source).toBe("option");
    expect(gallery.caption).toBe("Color: Red · Size: Large");
  });

  it("deduplicates a URL shared across multiple option assignments", () => {
    const product = makeProduct({
      skus: twoSkus,
      variant_options: twoOptions,
      variant_option_images: [
        {
          id: "v1",
          product_id: "p1",
          option_name: "Color",
          option_value: "Red",
          image_url: "shared.jpg",
          alt_text: null,
          display_order: 0,
          is_primary: true,
          created_at: null,
        },
        {
          id: "v2",
          product_id: "p1",
          option_name: "Size",
          option_value: "Large",
          image_url: "shared.jpg",
          alt_text: null,
          display_order: 0,
          is_primary: true,
          created_at: null,
        },
      ],
    });
    const gallery = getShopGalleryImages(product, {
      Color: "Red",
      Size: "Large",
    });
    expect(gallery.images.filter((url) => url === "shared.jpg")).toHaveLength(
      1,
    );
  });

  it("skips option images with empty or whitespace-only URLs", () => {
    const product = makeProduct({
      skus: twoSkus,
      variant_options: twoOptions,
      variant_option_images: [
        {
          id: "v1",
          product_id: "p1",
          option_name: "Color",
          option_value: "Red",
          image_url: "",
          alt_text: null,
          display_order: 0,
          is_primary: false,
          created_at: null,
        },
        {
          id: "v2",
          product_id: "p1",
          option_name: "Color",
          option_value: "Red",
          image_url: "   ",
          alt_text: null,
          display_order: 1,
          is_primary: false,
          created_at: null,
        },
        {
          id: "v3",
          product_id: "p1",
          option_name: "Color",
          option_value: "Red",
          image_url: "red.jpg",
          alt_text: null,
          display_order: 2,
          is_primary: true,
          created_at: null,
        },
      ],
    });
    const gallery = getShopGalleryImages(product, { Color: "Red" });
    expect(gallery.images).toContain("red.jpg");
    expect(gallery.images).not.toContain("");
    expect(gallery.images).not.toContain("   ");
  });

  it("falls back to SKU images when no option gallery matches", () => {
    const product = makeProduct({
      skus: twoSkus,
      variant_options: twoOptions,
      sku_images: {
        "s-red-small": [
          {
            id: "si1",
            sku_id: "s-red-small",
            image_url: "sku-red.jpg",
            alt_text: null,
            display_order: 0,
            is_primary: true,
            created_at: null,
          },
        ],
      },
    });
    const gallery = getShopGalleryImages(product, {
      Color: "Red",
      Size: "Small",
    });
    expect(gallery.source).toBe("sku");
    expect(gallery.images[0]).toBe("sku-red.jpg");
  });

  it("skips SKU images with empty URLs when building the gallery", () => {
    const product = makeProduct({
      skus: twoSkus,
      variant_options: twoOptions,
      sku_images: {
        "s-red-small": [
          {
            id: "si1",
            sku_id: "s-red-small",
            image_url: "",
            alt_text: null,
            display_order: 0,
            is_primary: false,
            created_at: null,
          },
          {
            id: "si2",
            sku_id: "s-red-small",
            image_url: "sku-valid.jpg",
            alt_text: null,
            display_order: 1,
            is_primary: true,
            created_at: null,
          },
        ],
      },
    });
    const gallery = getShopGalleryImages(product, {
      Color: "Red",
      Size: "Small",
    });
    expect(gallery.images).toContain("sku-valid.jpg");
    expect(gallery.images).not.toContain("");
  });

  it("filters whitespace-only product images from the fallback", () => {
    const product = makeProduct({
      thumbnail_url: "",
      image_urls: ["   ", "real.jpg"],
    });
    const gallery = getShopGalleryImages(product, {});
    expect(gallery.images).toEqual(["real.jpg"]);
    expect(gallery.source).toBe("product");
  });
});

describe("getDefaultShopSelection", () => {
  const options = [
    {
      id: "o1",
      product_id: "p1",
      option_name: "Color",
      option_type: "swatch_color" as const,
      values: ["Black", "Gold"],
      display_order: 0,
      is_required: true,
      created_at: null,
    },
    {
      id: "o2",
      product_id: "p1",
      option_name: "Engraving",
      option_type: "text_input" as const,
      values: null,
      display_order: 1,
      is_required: false,
      created_at: null,
    },
  ];
  const skus = [
    {
      product_id: "p1",
      id: "s-gold",
      sku_code: "G",
      variant_combination: { Color: "Gold" },
      price: 2000,
      compare_at_price: null,
      stock_quantity: 3,
      low_stock_threshold: 5,
      weight_grams: null,
      variant_image_url: null,
      model_url: null,
      is_available: true,
      pre_order_eta: null,
      created_at: null,
      updated_at: null,
    },
    {
      product_id: "p1",
      id: "s-black",
      sku_code: "B",
      variant_combination: { Color: "Black" },
      price: 1500,
      compare_at_price: null,
      stock_quantity: 8,
      low_stock_threshold: 5,
      weight_grams: null,
      variant_image_url: null,
      model_url: null,
      is_available: true,
      pre_order_eta: null,
      created_at: null,
      updated_at: null,
    },
    {
      product_id: "p1",
      id: "s-oos",
      sku_code: "O",
      variant_combination: { Color: "Black" },
      price: 999,
      compare_at_price: null,
      stock_quantity: 0,
      low_stock_threshold: 5,
      weight_grams: null,
      variant_image_url: null,
      model_url: null,
      is_available: true,
      pre_order_eta: null,
      created_at: null,
      updated_at: null,
    },
  ];

  it("pre-selects the cheapest in-stock combination and skips non-SKU options", () => {
    const selection = getDefaultShopSelection(
      makeProduct({ skus, variant_options: options }),
    );
    expect(selection).toEqual({ Color: "Black" });
  });

  it("prefers pre-order over out-of-stock when nothing is stocked", () => {
    const oosOnly = skus.map((sku) => ({ ...sku, stock_quantity: 0 }));
    const withPreorder = oosOnly.map((sku) =>
      sku.id === "s-gold" ? { ...sku, pre_order_eta: "2026-12-01" } : sku,
    );
    const selection = getDefaultShopSelection(
      makeProduct({ skus: withPreorder, variant_options: options }),
    );
    expect(selection).toEqual({ Color: "Gold" });
  });

  it("returns an empty selection for products without SKUs or discrete options", () => {
    expect(getDefaultShopSelection(makeProduct())).toEqual({});
    expect(
      getDefaultShopSelection(
        makeProduct({
          variant_options: [
            { ...options[1], option_type: "text_input" as const },
          ],
          skus,
        }),
      ),
    ).toEqual({});
  });
});
