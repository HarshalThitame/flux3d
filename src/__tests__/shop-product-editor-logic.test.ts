import { describe, expect, it } from "vitest";
import {
  getPublishBlockers,
  productFormSchema,
  validateField,
  validateProduct,
  variantValueMetadataSchema,
} from "@/lib/shop/product-schema";
import {
  buildProductPayload,
  cartesianProduct,
  emptyProduct,
} from "@/app/admin/3d-shop/_components/product-editor/types";
import { getSelectedSwatchColor } from "@/lib/shop/selection";
import type {
  ShopVariantOption,
  VariantValueMetadata,
} from "@/lib/shop/admin-types";

const validProduct = {
  ...emptyProduct,
  name: "LED Desk Lamp",
  slug: "led-desk-lamp",
  category_id: "cat-1",
  description: "A premium LED desk lamp.",
  base_price: 1299,
  thumbnail_url: "https://example.com/lamp.png",
  image_urls: ["https://example.com/gallery.png"],
  image_alt: {
    "https://example.com/lamp.png": "LED desk lamp on a wooden desk",
    "https://example.com/gallery.png": "Lamp shown from the side",
  },
};

describe("productFormSchema", () => {
  it("accepts a valid product", () => {
    expect(productFormSchema.safeParse(validProduct).success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = productFormSchema.safeParse({ ...validProduct, name: "  " });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("name");
    }
  });

  it("rejects a negative base price", () => {
    const result = productFormSchema.safeParse({
      ...validProduct,
      base_price: -5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a long meta description", () => {
    const result = productFormSchema.safeParse({
      ...validProduct,
      meta_description: "x".repeat(161),
    });
    expect(result.success).toBe(false);
  });

  it("accepts an ISO published_at with a timezone offset", () => {
    const result = productFormSchema.safeParse({
      ...validProduct,
      published_at: "2026-12-25T10:00:00.000+00:00",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an ISO published_at in UTC", () => {
    const result = productFormSchema.safeParse({
      ...validProduct,
      published_at: "2026-12-25T10:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-datetime published_at", () => {
    const result = productFormSchema.safeParse({
      ...validProduct,
      published_at: "not-a-date",
    });
    expect(result.success).toBe(false);
  });
});

describe("validateField", () => {
  it("returns a message for invalid fields and undefined for valid ones", () => {
    expect(validateField("name", "")).toBeDefined();
    expect(validateField("name", "LED Lamp")).toBeUndefined();
    expect(validateField("base_price", -1)).toBeDefined();
    expect(validateField("base_price", 100)).toBeUndefined();
  });
});

describe("validateProduct", () => {
  it("returns empty errors for a valid product", () => {
    expect(validateProduct(validProduct)).toEqual({});
  });

  it("collects errors for multiple invalid fields", () => {
    const errors = validateProduct({
      ...validProduct,
      name: "",
      base_price: -1,
    });
    expect(errors.name).toBeDefined();
    expect(errors.base_price).toBeDefined();
  });
});

describe("getPublishBlockers", () => {
  it("returns blockers for an empty product", () => {
    const blockers = getPublishBlockers(emptyProduct);
    expect(blockers).toContain("Add a product name");
    expect(blockers).toContain("Add a product slug");
    expect(blockers).toContain("Assign a category");
    expect(blockers).toContain("Add at least a short or detailed description");
    expect(blockers).toContain("Set a base price greater than zero");
    expect(blockers).toContain("Add at least one product image");
  });

  it("flags gallery images that are missing alt text", () => {
    const blockers = getPublishBlockers({ ...validProduct, image_alt: {} });
    expect(blockers.some((blocker) => blocker.includes("alt text"))).toBe(true);
  });

  it("returns no blockers for a publishable product", () => {
    expect(getPublishBlockers(validProduct)).toEqual([]);
  });
});

describe("buildProductPayload", () => {
  it("sets is_active true for publish and false for draft", () => {
    expect(buildProductPayload(validProduct, "publish").is_active).toBe(true);
    expect(buildProductPayload(validProduct, "draft").is_active).toBe(false);
  });

  it("keeps existing is_active when no status is given", () => {
    expect(
      buildProductPayload({ ...validProduct, is_active: true }, undefined)
        .is_active,
    ).toBe(true);
  });

  it("passes image_alt through in the payload", () => {
    const image_alt = {
      "https://example.com/lamp.png": "LED desk lamp on a wooden desk",
    };
    expect(
      buildProductPayload({ ...validProduct, image_alt }, undefined).image_alt,
    ).toEqual(image_alt);
  });

  it("passes published_at through in the payload", () => {
    const published_at = "2026-12-25T10:00:00.000Z";
    expect(
      buildProductPayload({ ...validProduct, published_at }, undefined)
        .published_at,
    ).toBe(published_at);
  });
});

describe("cartesianProduct", () => {
  it("returns a single empty combination when no options are provided", () => {
    expect(cartesianProduct([])).toEqual([{}]);
  });

  it("combines option values", () => {
    const result = cartesianProduct([
      { name: "Size", values: ["S", "M"] },
      { name: "Color", values: ["Red", "Blue"] },
    ]);
    expect(result).toHaveLength(4);
    expect(result).toContainEqual({ Size: "S", Color: "Red" });
    expect(result).toContainEqual({ Size: "M", Color: "Blue" });
  });
});

describe("variantValueMetadataSchema", () => {
  it("accepts a swatch with only a hex color and no image", () => {
    const result = variantValueMetadataSchema.safeParse({
      hex_color: "#1a1a2e",
      swatch_image_url: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty metadata record", () => {
    expect(variantValueMetadataSchema.safeParse({}).success).toBe(true);
  });
});

describe("getSelectedSwatchColor", () => {
  const swatchOption = (
    metadata: Record<string, VariantValueMetadata>,
  ): ShopVariantOption => ({
    id: "v1",
    product_id: "p1",
    option_name: "Color",
    option_type: "swatch_color",
    values: ["Midnight Blue"],
    value_metadata: metadata,
    display_order: 0,
    is_required: true,
    created_at: null,
  });

  it("returns the stored hex_color when present", () => {
    const selected = getSelectedSwatchColor(
      [swatchOption({ "Midnight Blue": { hex_color: "#1a1a2e" } })],
      { Color: "Midnight Blue" },
    );
    expect(selected).toBe("#1a1a2e");
  });

  it("falls back to the value string when no hex_color is set", () => {
    const selected = getSelectedSwatchColor([swatchOption({})], {
      Color: "Midnight Blue",
    });
    expect(selected).toBe("Midnight Blue");
  });

  it("returns null when no swatch_color option is selected", () => {
    expect(getSelectedSwatchColor([], {})).toBeNull();
  });

  it("returns null when the swatch_color value is not selected", () => {
    expect(
      getSelectedSwatchColor([swatchOption({})], { Color: "" }),
    ).toBeNull();
  });
});
