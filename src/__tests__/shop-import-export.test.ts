import { describe, expect, it } from "vitest";
import {
  csvRowToRecord,
  csvToRecords,
  mapCsvRecord,
  parseCsv,
  productsToCsv,
  uniqueSlug,
} from "@/lib/shop/import-export";

describe("parseCsv", () => {
  it("parses simple rows", () => {
    expect(parseCsv("name,price\nA,10\nB,20")).toEqual([
      ["name", "price"],
      ["A", "10"],
      ["B", "20"],
    ]);
  });

  it("handles quoted fields with commas and quotes", () => {
    const rows = parseCsv('name,note\nA,"hello, world"\nB,"say ""hi"""');
    expect(rows[1][1]).toBe("hello, world");
    expect(rows[2][1]).toBe('say "hi"');
  });

  it("drops empty rows", () => {
    expect(parseCsv("a,b\n1,2\n\n")).toHaveLength(2);
  });
});

describe("csvRowToRecord / mapCsvRecord", () => {
  const headers = [
    "name",
    "slug",
    "base_price",
    "tags",
    "image_urls",
    "is_active",
  ];

  it("maps a row to a record keyed by headers", () => {
    const record = csvRowToRecord(
      ["Lamp", "lamp", "1299", "led|desk", "a.jpg|b.jpg", "true"],
      headers,
    );
    expect(record.name).toBe("Lamp");
    expect(record.tags).toBe("led|desk");
  });

  it("maps a record into an importable product", () => {
    const record = csvRowToRecord(
      ["Lamp", "lamp", "1299", "led|desk", "a.jpg|b.jpg", "true"],
      headers,
    );
    const product = mapCsvRecord(record);
    expect(product.name).toBe("Lamp");
    expect(product.base_price).toBe(1299);
    expect(product.tags).toEqual(["led", "desk"]);
    expect(product.image_urls).toEqual(["a.jpg", "b.jpg"]);
    expect(product.is_active).toBe(true);
  });

  it("throws when the name is missing", () => {
    expect(() => mapCsvRecord({})).toThrow("Missing name");
  });
});

describe("csvToRecords", () => {
  it("parses a header + data rows into records and reports errors", () => {
    const rows = parseCsv("name,base_price\nLamp,10\n,20");
    const { records, errors } = csvToRecords(rows);
    expect(records).toHaveLength(1);
    expect(records[0].name).toBe("Lamp");
    expect(errors).toHaveLength(1);
    expect(errors[0].row).toBe(3);
    expect(errors[0].error).toBe("Missing name");
  });
});

describe("uniqueSlug", () => {
  it("returns the base slug when available", () => {
    expect(uniqueSlug("LED Lamp", new Set(["other"]))).toBe("led-lamp");
  });

  it("appends a suffix when the slug is taken", () => {
    const taken = new Set(["led-lamp", "led-lamp-2"]);
    expect(uniqueSlug("LED Lamp", taken)).toBe("led-lamp-3");
  });

  it("falls back for empty or symbol-only input", () => {
    const slug = uniqueSlug("!!!", new Set());
    expect(slug.length).toBeGreaterThan(0);
  });
});

describe("productsToCsv", () => {
  it("produces a round-trippable CSV", () => {
    const csv = productsToCsv([
      {
        name: "LED Lamp",
        slug: "led-lamp",
        description: "A lamp",
        long_description: null,
        category_name: "Lighting",
        tags: ["led", "desk"],
        occasion_tags: ["Office Desk"],
        thumbnail_url: null,
        image_urls: [],
        image_alt: {},
        model_url: "https://cdn.example.com/lamp.glb",
        base_price: 1299,
        is_customizable: false,
        customization_label: null,
        is_featured: false,
        is_active: true,
        meta_title: null,
        meta_description: null,
        published_at: null,
        variants: [
          {
            option_name: "Color",
            option_type: "swatch_color",
            values: ["Red"],
            is_required: true,
            affects_images: true,
            image_priority: 1,
          },
        ],
        skus: [],
      },
    ]);

    const rows = parseCsv(csv);
    expect(rows[0]).toContain("name");
    expect(rows[1][0]).toBe("LED Lamp");
    const variantsJson = rows[1][rows[0].indexOf("variants")];
    expect(JSON.parse(variantsJson)[0].option_name).toBe("Color");
    expect(rows[1][rows[0].indexOf("model_url")]).toBe(
      "https://cdn.example.com/lamp.glb",
    );
  });
});
