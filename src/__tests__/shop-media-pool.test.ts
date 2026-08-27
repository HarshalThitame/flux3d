import { describe, expect, it } from "vitest";
import {
  buildMediaPool,
  mediaAssignmentsLabel,
  skuLabel,
  type MediaPoolInput,
} from "@/lib/shop/media-pool";

function makeInput(overrides: Partial<MediaPoolInput> = {}): MediaPoolInput {
  return {
    product: {
      thumbnail_url: "cover.jpg",
      image_urls: ["gallery-a.jpg", "gallery-b.jpg"],
      image_alt: { "gallery-a.jpg": "Gallery A alt" },
    },
    variantOptionImages: [],
    skuImages: {},
    skus: [],
    ...overrides,
  };
}

describe("buildMediaPool", () => {
  it("collapses the same URL across gallery, variants, and SKUs into one tile", () => {
    const pool = buildMediaPool(
      makeInput({
        variantOptionImages: [
          {
            id: "vo-1",
            product_id: "p1",
            option_name: "Color",
            option_value: "Gold",
            image_url: "gallery-a.jpg",
            alt_text: null,
            display_order: 0,
            is_primary: true,
            created_at: null,
          },
        ],
        skus: [
          {
            id: "sku-1",
            product_id: "p1",
            sku_code: "S1",
            variant_combination: { Color: "Gold", Size: "Large" },
            price: 100,
            compare_at_price: null,
            stock_quantity: 5,
            low_stock_threshold: null,
            weight_grams: null,
            variant_image_url: "gallery-a.jpg",
            model_url: null,
            is_available: true,
            pre_order_eta: null,
            created_at: null,
            updated_at: null,
          },
        ],
        skuImages: {
          "sku-1": [
            {
              id: "si-1",
              sku_id: "sku-1",
              image_url: "gallery-a.jpg",
              alt_text: null,
              display_order: 0,
              is_primary: true,
              created_at: null,
            },
          ],
        },
      }),
    );

    expect(pool).toHaveLength(3);
    const galleryA = pool.find((item) => item.url === "gallery-a.jpg");
    expect(galleryA).toBeDefined();
    expect(galleryA!.assignments).toHaveLength(3);
    expect(
      galleryA!.assignments.filter((a) => a.type === "variant_option"),
    ).toHaveLength(1);
    expect(galleryA!.assignments.filter((a) => a.type === "sku")).toHaveLength(
      2,
    );
    expect(galleryA!.inProductGallery).toBe(true);
    expect(galleryA!.isCover).toBe(false);
  });

  it("flags the cover image and preserves product gallery order", () => {
    const pool = buildMediaPool(makeInput());
    expect(pool.map((item) => item.url)).toEqual([
      "cover.jpg",
      "gallery-a.jpg",
      "gallery-b.jpg",
    ]);
    expect(pool[0]!.isCover).toBe(true);
    expect(pool[0]!.inProductGallery).toBe(true);
  });

  it("appends variant-only images after the product gallery", () => {
    const pool = buildMediaPool(
      makeInput({
        variantOptionImages: [
          {
            id: "vo-1",
            product_id: "p1",
            option_name: "Color",
            option_value: "Rose",
            image_url: "rose-only.jpg",
            alt_text: null,
            display_order: 0,
            is_primary: true,
            created_at: null,
          },
        ],
      }),
    );
    expect(pool[pool.length - 1]!.url).toBe("rose-only.jpg");
    expect(pool[pool.length - 1]!.variantOnly).toBe(true);
  });

  it("uses per-image alt text when present", () => {
    const pool = buildMediaPool(makeInput());
    const galleryA = pool.find((item) => item.url === "gallery-a.jpg");
    expect(galleryA!.alt).toBe("Gallery A alt");
  });
});

describe("mediaAssignmentsLabel", () => {
  it("renders a human-readable assignment summary", () => {
    const pool = buildMediaPool(
      makeInput({
        variantOptionImages: [
          {
            id: "vo-1",
            product_id: "p1",
            option_name: "Color",
            option_value: "Gold",
            image_url: "cover.jpg",
            alt_text: null,
            display_order: 0,
            is_primary: true,
            created_at: null,
          },
        ],
      }),
    );
    const cover = pool.find((item) => item.url === "cover.jpg")!;
    expect(mediaAssignmentsLabel(cover)).toBe("Color: Gold");
  });
});

describe("skuLabel", () => {
  it("falls back to Standard for an empty combination", () => {
    expect(skuLabel(null)).toBe("Standard");
    expect(skuLabel({})).toBe("Standard");
  });

  it("joins combination entries", () => {
    expect(skuLabel({ Color: "Gold", Size: "Large" })).toBe(
      "Color: Gold · Size: Large",
    );
  });
});
