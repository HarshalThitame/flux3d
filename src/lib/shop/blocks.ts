import { z } from "zod";

export const headingBlockSchema = z
  .object({
    type: z.literal("heading"),
    title: z
      .string()
      .trim()
      .min(1, "Heading title is required")
      .max(200, "Keep headings under 200 characters"),
    subtitle: z
      .string()
      .trim()
      .max(500, "Keep subtitles under 500 characters")
      .optional(),
  })
  .strict();

export const paragraphBlockSchema = z
  .object({
    type: z.literal("paragraph"),
    html: z.string().max(20000, "Paragraph content is too long"),
  })
  .strict();

export const specsRowSchema = z
  .object({
    label: z
      .string()
      .trim()
      .min(1, "Spec label is required")
      .max(120, "Keep spec labels under 120 characters"),
    value: z
      .string()
      .trim()
      .min(1, "Spec value is required")
      .max(500, "Keep spec values under 500 characters"),
  })
  .strict();

export const specsTableBlockSchema = z
  .object({
    type: z.literal("specs_table"),
    title: z
      .string()
      .trim()
      .max(200, "Keep titles under 200 characters")
      .optional(),
    rows: z
      .array(specsRowSchema)
      .min(1, "Add at least one specification")
      .max(20, "Use at most 20 specifications"),
  })
  .strict();

export const featureItemSchema = z
  .object({
    icon: z
      .string()
      .trim()
      .min(1, "Icon is required")
      .max(60, "Icon name is too long"),
    title: z
      .string()
      .trim()
      .min(1, "Feature title is required")
      .max(100, "Keep feature titles under 100 characters"),
    text: z
      .string()
      .trim()
      .min(1, "Feature text is required")
      .max(500, "Keep feature text under 500 characters"),
  })
  .strict();

export const featureGridBlockSchema = z
  .object({
    type: z.literal("feature_grid"),
    title: z
      .string()
      .trim()
      .max(200, "Keep titles under 200 characters")
      .optional(),
    items: z
      .array(featureItemSchema)
      .min(1, "Add at least one feature")
      .max(6, "Use at most 6 features"),
  })
  .strict();

export const imageTextSplitBlockSchema = z
  .object({
    type: z.literal("image_text_split"),
    image_url: z
      .string()
      .trim()
      .min(1, "Image URL is required")
      .max(2000, "Image URL is too long"),
    alt: z
      .string()
      .trim()
      .max(200, "Keep alt text under 200 characters")
      .default(""),
    html: z.string().max(10000, "Text content is too long"),
    align: z.enum(["left", "right"]).default("left"),
  })
  .strict();

export const quoteBlockSchema = z
  .object({
    type: z.literal("quote"),
    text: z
      .string()
      .trim()
      .min(1, "Quote text is required")
      .max(1000, "Keep quotes under 1000 characters"),
    attribution: z
      .string()
      .trim()
      .max(200, "Keep attribution under 200 characters")
      .optional(),
  })
  .strict();

export const dividerBlockSchema = z
  .object({
    type: z.literal("divider"),
    style: z.enum(["gold", "subtle"]).default("gold"),
  })
  .strict();

export const bulletGridItemSchema = z
  .object({
    icon: z.string().trim().max(60, "Icon name is too long").optional(),
    text: z
      .string()
      .trim()
      .min(1, "Bullet text is required")
      .max(300, "Keep bullet text under 300 characters"),
  })
  .strict();

export const bulletGridBlockSchema = z
  .object({
    type: z.literal("bullet_grid"),
    title: z
      .string()
      .trim()
      .max(200, "Keep titles under 200 characters")
      .optional(),
    items: z
      .array(bulletGridItemSchema)
      .min(1, "Add at least one bullet")
      .max(12, "Use at most 12 bullets"),
  })
  .strict();

export const htmlEmbedBlockSchema = z
  .object({
    type: z.literal("html_embed"),
    html: z
      .string()
      .min(1, "HTML content is required")
      .max(50000, "HTML content is too long"),
    caption: z
      .string()
      .trim()
      .max(200, "Keep caption under 200 characters")
      .optional(),
  })
  .strict();

export const spacerBlockSchema = z
  .object({
    type: z.literal("spacer"),
    height: z.enum(["sm", "md", "lg", "xl"]).default("md"),
  })
  .strict();

export const descriptionBlockSchema = z.discriminatedUnion("type", [
  headingBlockSchema,
  paragraphBlockSchema,
  specsTableBlockSchema,
  featureGridBlockSchema,
  imageTextSplitBlockSchema,
  quoteBlockSchema,
  dividerBlockSchema,
  bulletGridBlockSchema,
  htmlEmbedBlockSchema,
  spacerBlockSchema,
]);

export const descriptionBlocksSchema = z
  .array(descriptionBlockSchema)
  .max(50, "Use at most 50 blocks");

export type DescriptionBlock = z.infer<typeof descriptionBlockSchema>;
export type DescriptionBlocks = DescriptionBlock[];
export type HeadingBlock = z.infer<typeof headingBlockSchema>;
export type ParagraphBlock = z.infer<typeof paragraphBlockSchema>;
export type SpecsTableBlock = z.infer<typeof specsTableBlockSchema>;
export type FeatureGridBlock = z.infer<typeof featureGridBlockSchema>;
export type ImageTextSplitBlock = z.infer<typeof imageTextSplitBlockSchema>;
export type QuoteBlock = z.infer<typeof quoteBlockSchema>;
export type DividerBlock = z.infer<typeof dividerBlockSchema>;
export type BulletGridBlock = z.infer<typeof bulletGridBlockSchema>;
export type HtmlEmbedBlock = z.infer<typeof htmlEmbedBlockSchema>;
export type SpacerBlock = z.infer<typeof spacerBlockSchema>;
export type BlockType = DescriptionBlock["type"];

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  heading: "Heading",
  paragraph: "Paragraph",
  specs_table: "Specs Table",
  feature_grid: "Feature Grid",
  image_text_split: "Image + Text",
  quote: "Quote",
  divider: "Divider",
  bullet_grid: "Bullet Grid",
  html_embed: "HTML Embed",
  spacer: "Spacer",
};

export const BLOCK_TYPE_ORDER: BlockType[] = [
  "heading",
  "paragraph",
  "image_text_split",
  "feature_grid",
  "bullet_grid",
  "specs_table",
  "quote",
  "html_embed",
  "divider",
  "spacer",
];

export function createEmptyBlock(type: BlockType): DescriptionBlock {
  switch (type) {
    case "heading":
      return { type, title: "", subtitle: "" };
    case "paragraph":
      return { type, html: "" };
    case "specs_table":
      return { type, title: "", rows: [{ label: "", value: "" }] };
    case "feature_grid":
      return {
        type,
        title: "",
        items: [
          { icon: "Gem", title: "", text: "" },
          { icon: "Cpu", title: "", text: "" },
          { icon: "ShieldCheck", title: "", text: "" },
        ],
      };
    case "image_text_split":
      return { type, image_url: "", alt: "", html: "", align: "left" };
    case "quote":
      return { type, text: "", attribution: "" };
    case "divider":
      return { type, style: "gold" };
    case "bullet_grid":
      return {
        type,
        title: "",
        items: [
          { icon: "CheckCircle2", text: "" },
          { icon: "CheckCircle2", text: "" },
          { icon: "CheckCircle2", text: "" },
        ],
      };
    case "html_embed":
      return { type, html: "", caption: "" };
    case "spacer":
      return { type, height: "md" };
  }
}

export function extractTextFromBlock(block: DescriptionBlock): string {
  switch (block.type) {
    case "heading":
      return [block.title, block.subtitle].filter(Boolean).join(". ");
    case "paragraph":
      return stripRichHtml(block.html);
    case "specs_table":
      return block.rows.map((row) => `${row.label}: ${row.value}`).join(". ");
    case "feature_grid":
      return block.items
        .map((item) => `${item.title}: ${item.text}`)
        .join(". ");
    case "image_text_split":
      return stripRichHtml(block.html);
    case "quote":
      return [block.text, block.attribution].filter(Boolean).join(" — ");
    case "divider":
      return "";
    case "bullet_grid":
      return block.items.map((item) => item.text).join(". ");
    case "html_embed":
      return stripRichHtml(block.html);
    case "spacer":
      return "";
  }
}

export function extractTextFromBlocks(
  blocks: DescriptionBlocks | null | undefined,
): string {
  if (!blocks || blocks.length === 0) return "";
  return blocks
    .map(extractTextFromBlock)
    .filter((text) => text.trim().length > 0)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripRichHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<!--[\s\S]*?-->/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
