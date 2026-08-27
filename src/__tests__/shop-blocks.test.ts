import { describe, expect, it } from "vitest";
import {
  descriptionBlocksSchema,
  descriptionBlockSchema,
  extractTextFromBlocks,
  extractTextFromBlock,
} from "@/lib/shop/blocks";
import { convertRichHtmlToBlocks } from "@/lib/shop/html-to-blocks";
import { parseBlocksJson, parseAllJson, stripFences } from "@/lib/shop/ai";

describe("descriptionBlocksSchema", () => {
  it("accepts a valid mixed block list", () => {
    const blocks = [
      {
        type: "heading",
        title: "Engineered for the Extraordinary",
        subtitle: "A statement piece.",
      },
      { type: "paragraph", html: "<p>Hand-finished detail.</p>" },
      {
        type: "feature_grid",
        title: "Why you will love it",
        items: [
          { icon: "Gem", title: "Precision", text: "Sculpted detail." },
          { icon: "ShieldCheck", title: "Durable", text: "Built to last." },
        ],
      },
      { type: "specs_table", rows: [{ label: "Material", value: "PETG" }] },
      { type: "quote", text: "Not just a product.", attribution: "Flux3D" },
      { type: "divider" },
    ];
    const result = descriptionBlocksSchema.safeParse(blocks);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(6);
      expect(result.data[0]).toEqual({
        type: "heading",
        title: "Engineered for the Extraordinary",
        subtitle: "A statement piece.",
      });
    }
  });

  it("accepts all 10 block types", () => {
    const blocks = [
      { type: "heading", title: "T", subtitle: "" },
      { type: "paragraph", html: "<p>x</p>" },
      {
        type: "feature_grid",
        items: [{ icon: "Gem", title: "T", text: "X" }],
      },
      { type: "specs_table", rows: [{ label: "L", value: "V" }] },
      {
        type: "image_text_split",
        image_url: "https://a.com/b.jpg",
        alt: "",
        html: "<p>x</p>",
        align: "left",
      },
      { type: "quote", text: "Q", attribution: "" },
      { type: "divider", style: "gold" },
      {
        type: "bullet_grid",
        items: [{ icon: "CheckCircle2", text: "B" }],
      },
      { type: "html_embed", html: "<div>x</div>", caption: "" },
      { type: "spacer", height: "md" },
    ];
    const result = descriptionBlocksSchema.safeParse(blocks);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toHaveLength(10);
  });

  it("applies defaults for divider style and split align", () => {
    const result = descriptionBlockSchema.safeParse({ type: "divider" });
    expect(result.success).toBe(true);
    if (result.success)
      expect(result.data).toEqual({ type: "divider", style: "gold" });

    const split = descriptionBlockSchema.safeParse({
      type: "image_text_split",
      image_url: "https://cdn.example.com/img.jpg",
      html: "<p>text</p>",
    });
    expect(split.success).toBe(true);
    if (split.success && split.data.type === "image_text_split") {
      expect(split.data.align).toBe("left");
    }
  });

  it("applies defaults for spacer height and bullet_grid icon", () => {
    const spacer = descriptionBlockSchema.safeParse({ type: "spacer" });
    expect(spacer.success).toBe(true);
    if (spacer.success && spacer.data.type === "spacer") {
      expect(spacer.data.height).toBe("md");
    }

    const bg = descriptionBlockSchema.safeParse({
      type: "bullet_grid",
      items: [{ text: "A" }],
    });
    expect(bg.success).toBe(true);
    if (bg.success && bg.data.type === "bullet_grid") {
      expect(bg.data.items[0].icon).toBeUndefined();
    }
  });

  it("rejects a heading without a title", () => {
    const result = descriptionBlocksSchema.safeParse([
      { type: "heading", title: "" },
    ]);
    expect(result.success).toBe(false);
  });

  it("rejects a specs table with zero rows", () => {
    const result = descriptionBlocksSchema.safeParse([
      { type: "specs_table", rows: [] },
    ]);
    expect(result.success).toBe(false);
  });

  it("rejects extra unknown fields", () => {
    const result = descriptionBlockSchema.safeParse({
      type: "heading",
      title: "Valid",
      unknown_field: "nope",
    });
    expect(result.success).toBe(false);
  });

  it("enforces 50-block cap", () => {
    const blocks = Array.from({ length: 51 }, () => ({
      type: "divider",
      style: "gold",
    }));
    const result = descriptionBlocksSchema.safeParse(blocks);
    expect(result.success).toBe(false);
  });
});

describe("convertRichHtmlToBlocks", () => {
  it("converts headings, lists, and paragraphs", () => {
    const html =
      "<h2>Overview</h2><p>Great product.</p><ul><li>Feature one</li><li>Feature two</li></ul>";
    const blocks = convertRichHtmlToBlocks(html);
    expect(blocks[0]).toMatchObject({ type: "heading", title: "Overview" });
    expect(blocks[1]).toMatchObject({ type: "paragraph" });
    expect(blocks[2]).toMatchObject({
      type: "feature_grid",
      items: expect.any(Array),
    });
    const grid = blocks[2];
    if (grid.type === "feature_grid") expect(grid.items).toHaveLength(2);
  });

  it("converts ordered lists into bullet_grid blocks", () => {
    const html =
      "<ol><li>First step</li><li>Second step</li><li>Third step</li></ol>";
    const blocks = convertRichHtmlToBlocks(html);
    const bg = blocks.find((b) => b.type === "bullet_grid");
    expect(bg).toBeDefined();
    if (bg && bg.type === "bullet_grid") {
      expect(bg.items).toHaveLength(3);
      expect(bg.items[0].text).toBe("First step");
    }
  });

  it("converts a table into a specs_table block", () => {
    const html =
      "<table><tr><th>Material</th><th>Weight</th></tr><tr><td>PETG</td><td>1kg</td></tr></table>";
    const blocks = convertRichHtmlToBlocks(html);
    const specs = blocks.find((block) => block.type === "specs_table");
    expect(specs).toBeDefined();
    if (specs && specs.type === "specs_table") {
      expect(specs.rows[0]).toEqual({ label: "Material", value: "PETG" });
    }
  });

  it("handles consecutive header rows without misclassifying data rows", () => {
    const html =
      "<table><tr><th>A</th><th>B</th></tr><tr><th>C</th><th>D</th></tr><tr><td>1</td><td>2</td></tr></table>";
    const blocks = convertRichHtmlToBlocks(html);
    const specs = blocks.find((b) => b.type === "specs_table");
    expect(specs).toBeDefined();
    if (specs && specs.type === "specs_table") {
      expect(specs.rows).toHaveLength(2);
      expect(specs.rows[0]).toEqual({ label: "A", value: "1" });
      expect(specs.rows[1]).toEqual({ label: "B", value: "2" });
    }
  });

  it("drops a leading heading that repeats the product name", () => {
    const html =
      "<h2>Flux3D BloomGlow Lotus - 3D Printed RGB Smart Table Lamp</h2><h2>Overview</h2><p>Body.</p>";
    const blocks = convertRichHtmlToBlocks(
      html,
      "Flux3D BloomGlow Lotus - 3D Printed RGB Smart Table Lamp",
    );
    expect(blocks[0]).toMatchObject({ type: "heading", title: "Overview" });
    expect(
      blocks.every(
        (block) =>
          block.type !== "heading" || block.title !== "Flux3D BloomGlow Lotus",
      ),
    ).toBe(true);
  });

  it("returns an empty array for empty input", () => {
    expect(convertRichHtmlToBlocks("")).toEqual([]);
  });
});

describe("parseBlocksJson", () => {
  it("parses a JSON block array and keeps only valid blocks", () => {
    const raw = JSON.stringify([
      { type: "heading", title: "Hello" },
      { type: "heading", title: "" },
      { type: "paragraph", html: "<p>x</p>" },
      { type: "nope" },
    ]);
    const blocks = parseBlocksJson(raw);
    expect(blocks).toHaveLength(2);
    expect(blocks.map((block) => block.type)).toEqual(["heading", "paragraph"]);
  });

  it("applies Zod defaults through parseBlocksJson", () => {
    const raw = JSON.stringify([{ type: "divider" }]);
    const blocks = parseBlocksJson(raw);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({ type: "divider", style: "gold" });
  });

  it("handles an object wrapper and strips fences", () => {
    const raw =
      '```json\n{"blocks":[{"type":"quote","text":"hello","attribution":"A"}]}\n```';
    const blocks = parseBlocksJson(stripFences(raw));
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ type: "quote", text: "hello" });
  });

  it("returns [] for malformed JSON", () => {
    expect(parseBlocksJson("not json")).toEqual([]);
  });

  it("parseAllJson validates luxury_blocks", () => {
    const raw = JSON.stringify({
      short_description: "Short.",
      long_description: "<p>Long.</p>",
      luxury_blocks: [
        { type: "heading", title: "Valid" },
        { type: "heading", title: "" },
      ],
      meta_title: "T",
      meta_description: "D",
      tags: ["a"],
      occasion_tags: ["b"],
    });
    const result = parseAllJson(raw);
    expect(result.luxury_blocks).toHaveLength(1);
    expect(result.luxury_blocks[0]).toMatchObject({
      type: "heading",
      title: "Valid",
    });
  });
});

describe("extractTextFromBlock", () => {
  it("extracts text from all 10 block kinds", () => {
    const blocks = [
      { type: "heading" as const, title: "Craftsmanship", subtitle: "Details" },
      {
        type: "paragraph" as const,
        html: "<p>Made from <strong>PETG</strong>.</p>",
      },
      {
        type: "specs_table" as const,
        rows: [{ label: "Weight", value: "1kg" }],
      },
      {
        type: "feature_grid" as const,
        items: [{ icon: "Gem", title: "Precision", text: "Detail." }],
      },
      {
        type: "image_text_split" as const,
        image_url: "",
        alt: "",
        html: "<p>Split text.</p>",
        align: "left" as const,
      },
      {
        type: "quote" as const,
        text: "Statement.",
        attribution: "Flux3D",
      },
      { type: "divider" as const, style: "gold" as const },
      {
        type: "bullet_grid" as const,
        items: [{ icon: "CheckCircle2", text: "Bullet one." }],
      },
      {
        type: "html_embed" as const,
        html: "<div>Embed</div>",
        caption: "",
      },
      { type: "spacer" as const, height: "md" as const },
    ];

    const texts = blocks.map(extractTextFromBlock);
    expect(texts[0]).toContain("Craftsmanship");
    expect(texts[1]).toContain("PETG");
    expect(texts[2]).toContain("Weight: 1kg");
    expect(texts[3]).toContain("Precision: Detail.");
    expect(texts[4]).toContain("Split text.");
    expect(texts[5]).toContain("Statement.");
    expect(texts[6]).toBe("");
    expect(texts[7]).toContain("Bullet one.");
    expect(texts[8]).toContain("Embed");
    expect(texts[9]).toBe("");
  });
});

describe("extractTextFromBlocks", () => {
  it("joins readable text from mixed blocks", () => {
    const text = extractTextFromBlocks([
      { type: "heading", title: "Craftsmanship", subtitle: "The details" },
      { type: "paragraph", html: "<p>Made from <strong>PETG</strong>.</p>" },
      { type: "specs_table", rows: [{ label: "Weight", value: "1kg" }] },
      { type: "divider", style: "gold" },
    ]);
    expect(text).toContain("Craftsmanship");
    expect(text).toContain("PETG");
    expect(text).toContain("Weight: 1kg");
  });
});
