import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addRevision,
  clearRevisions,
  deepStableStringify,
  describeChanges,
  isSameState,
  loadRevisions,
  type ShopRevision,
} from "@/lib/shop/revisions";
import { emptyProduct } from "@/app/admin/3d-shop/_components/product-editor/types";

function makeRevision(overrides: Partial<ShopRevision> = {}): ShopRevision {
  return {
    timestamp: Date.now(),
    product: { ...emptyProduct, name: "LED Lamp", slug: "led-lamp" },
    variants: [],
    skus: [],
    ...overrides,
  };
}

let store = new Map<string, string>();

beforeEach(() => {
  store = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };
  vi.stubGlobal("window", { localStorage });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("revision storage", () => {
  it("stores and loads revisions for a product", () => {
    const revision = makeRevision({ timestamp: 1000 });
    addRevision("product-1", revision);
    const loaded = loadRevisions("product-1");
    expect(loaded).toHaveLength(1);
    expect(loaded[0].timestamp).toBe(1000);
  });

  it("does not store an identical duplicate revision", () => {
    const revision = makeRevision({ timestamp: 1000 });
    addRevision("product-1", revision);
    addRevision("product-1", { ...revision, timestamp: 1001 });
    expect(loadRevisions("product-1")).toHaveLength(1);
  });

  it("caps the number of stored revisions", () => {
    for (let i = 0; i < 25; i += 1) {
      addRevision(
        "product-1",
        makeRevision({
          timestamp: i,
          product: { ...emptyProduct, name: `Name ${i}` },
        }),
      );
    }
    expect(loadRevisions("product-1").length).toBeLessThanOrEqual(20);
  });

  it("scopes revisions by product id", () => {
    addRevision("product-1", makeRevision({ timestamp: 1 }));
    addRevision("product-2", makeRevision({ timestamp: 2 }));
    expect(loadRevisions("product-1")).toHaveLength(1);
    expect(loadRevisions("product-2")).toHaveLength(1);
  });

  it("clears revisions for a product", () => {
    addRevision("product-1", makeRevision({ timestamp: 1 }));
    clearRevisions("product-1");
    expect(loadRevisions("product-1")).toHaveLength(0);
  });
});

describe("isSameState", () => {
  it("detects equal states", () => {
    expect(isSameState(makeRevision(), makeRevision())).toBe(true);
  });

  it("detects different product fields", () => {
    const a = makeRevision();
    const b = makeRevision({ product: { ...emptyProduct, name: "Different" } });
    expect(isSameState(a, b)).toBe(false);
  });

  it("treats nested key order as equal", () => {
    const imageAltA = { "a.jpg": "desc", "b.jpg": "desc2" };
    const imageAltB = { "b.jpg": "desc2", "a.jpg": "desc" };
    const a = makeRevision({
      product: { ...emptyProduct, name: "Lamp", image_alt: imageAltA },
    });
    const b = makeRevision({
      product: { ...emptyProduct, name: "Lamp", image_alt: imageAltB },
    });
    expect(isSameState(a, b)).toBe(true);
  });
});

describe("deepStableStringify", () => {
  it("is order-independent for nested objects and arrays", () => {
    const valueA = { tags: ["a", "b"], image_alt: { x: "1", y: "2" } };
    const valueB = { image_alt: { y: "2", x: "1" }, tags: ["a", "b"] };
    expect(deepStableStringify(valueA)).toBe(deepStableStringify(valueB));
    expect(deepStableStringify(["a", "b"])).toBe(
      deepStableStringify(["a", "b"]),
    );
  });

  it("differs for different values", () => {
    expect(deepStableStringify({ a: 1 })).not.toBe(
      deepStableStringify({ a: 2 }),
    );
  });
});

describe("describeChanges", () => {
  it("lists changed product fields", () => {
    const older = makeRevision();
    const newer = makeRevision({
      product: { ...older.product, base_price: 999 },
    });
    expect(describeChanges(older, newer)).toContain("Price");
  });

  it("reports added SKUs", () => {
    const older = makeRevision();
    const newer = makeRevision({
      skus: [{ id: "s1" } as ShopRevision["skus"][number]],
    });
    expect(describeChanges(older, newer)).toContain("1 SKU added");
  });

  it("reports edited variant options when counts are unchanged", () => {
    const older = makeRevision({
      variants: [
        {
          id: "v1",
          product_id: "p1",
          option_name: "Size",
          option_type: "button",
          values: ["S", "M"],
          display_order: 0,
          is_required: true,
          affects_images: true,
          image_priority: 1,
          created_at: null,
        },
      ],
    });
    const newer = makeRevision({
      variants: [{ ...older.variants[0], option_name: "Color" }],
    });
    expect(describeChanges(older, newer)).toContain("Variant options edited");
  });

  it("reports edited SKU values when counts are unchanged", () => {
    const older = makeRevision({
      skus: [{ id: "s1", price: 100 } as ShopRevision["skus"][number]],
    });
    const newer = makeRevision({
      skus: [{ id: "s1", price: 150 } as ShopRevision["skus"][number]],
    });
    expect(describeChanges(older, newer)).toContain("SKU values edited");
  });

  it("falls back to a generic label for minor changes", () => {
    const older = makeRevision();
    expect(describeChanges(older, older)).toBe("Minor changes");
  });
});
