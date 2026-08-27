import type { DescriptionBlock, DescriptionBlocks } from "@/lib/shop/blocks";
import { stripRichHtml } from "@/lib/shop/blocks";

const HEADING_RE = /<(h2|h3)[^>]*>([\s\S]*?)<\/\1>/gi;
const PARAGRAPH_RE = /<(p|div)[^>]*>([\s\S]*?)<\/\1>/gi;
const LIST_ITEM_RE = /<li[^>]*>([\s\S]*?)<\/li>/gi;
const TABLE_ROW_RE = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
const TABLE_CELL_RE = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
const TH_RE = /<th[^>]*>[\s\S]*?<\/th>/i;
const UL_RE = /<ul[^>]*>([\s\S]*?)<\/ul>/gi;
const OL_RE = /<ol[^>]*>([\s\S]*?)<\/ol>/gi;
const TABLE_RE = /<table[^>]*>([\s\S]*?)<\/table>/gi;

const DEFAULT_FEATURE_ICONS = [
  "Gem",
  "Sparkles",
  "ShieldCheck",
  "Cpu",
  "Package",
  "Heart",
];

function textOnly(html: string): string {
  return stripRichHtml(html);
}

type Segment =
  | { start: number; end: number; block: DescriptionBlock }
  | { start: number; end: number; raw: string };

export function convertRichHtmlToBlocks(
  html: string,
  productName?: string,
): DescriptionBlocks {
  const source = html.trim();
  if (!source) return [];

  const segments: Segment[] = [];

  const push = (
    start: number,
    end: number,
    block: DescriptionBlock | string,
  ) => {
    if (typeof block === "string") {
      segments.push({ start, end, raw: block });
    } else {
      segments.push({ start, end, block });
    }
  };

  // Tables -> specs_table
  for (const match of Array.from(source.matchAll(TABLE_RE))) {
    const start = match.index ?? 0;
    const table = match[0];
    const rows: { label: string; value: string }[] = [];
    const headers = Array.from(
      table.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi),
    ).map((cell) => textOnly(cell[1]));
    for (const rowMatch of Array.from(table.matchAll(TABLE_ROW_RE))) {
      const row = rowMatch[0];
      const isHeader = TH_RE.test(row);
      const cells = Array.from(row.matchAll(TABLE_CELL_RE)).map((cell) =>
        textOnly(cell[1]),
      );
      if (isHeader) continue;
      if (headers.length >= 2) {
        headers.forEach((label, i) => {
          if (label && cells[i]) rows.push({ label, value: cells[i] });
        });
      } else if (cells.length >= 2 && cells[0] && cells[1]) {
        rows.push({ label: cells[0], value: cells[1] });
      }
    }
    if (rows.length > 0) {
      push(start, start + table.length, {
        type: "specs_table",
        title: "",
        rows,
      });
    }
  }

  // Unordered lists -> feature_grid
  for (const match of Array.from(source.matchAll(UL_RE))) {
    const start = match.index ?? 0;
    const items = Array.from(match[0].matchAll(LIST_ITEM_RE))
      .map((item) =>
        textOnly(item[1])
          .replace(/^[-•]\s*/, "")
          .trim(),
      )
      .filter(Boolean);
    if (items.length >= 1) {
      push(start, start + match[0].length, {
        type: "feature_grid",
        title: "",
        items: items.slice(0, 6).map((item, i) => ({
          icon: DEFAULT_FEATURE_ICONS[i % DEFAULT_FEATURE_ICONS.length],
          title: item.slice(0, 80),
          text: item.slice(0, 500),
        })),
      });
    }
  }

  // Ordered lists -> bullet_grid
  for (const match of Array.from(source.matchAll(OL_RE))) {
    const start = match.index ?? 0;
    const items = Array.from(match[0].matchAll(LIST_ITEM_RE))
      .map((item) =>
        textOnly(item[1])
          .replace(/^\d+[.)]?\s*/, "")
          .trim(),
      )
      .filter(Boolean);
    if (items.length >= 1) {
      push(start, start + match[0].length, {
        type: "bullet_grid",
        title: "",
        items: items.slice(0, 12).map((item) => ({
          text: item.slice(0, 300),
        })),
      });
    }
  }

  // Headings -> heading blocks
  for (const match of Array.from(source.matchAll(HEADING_RE))) {
    const start = match.index ?? 0;
    const title = textOnly(match[2]).trim();
    if (title) {
      push(start, start + match[0].length, {
        type: "heading",
        title,
        subtitle: "",
      });
    }
  }

  // Remaining paragraphs -> paragraph blocks
  for (const match of Array.from(source.matchAll(PARAGRAPH_RE))) {
    const start = match.index ?? 0;
    const inner = match[2].trim();
    if (textOnly(inner)) {
      push(start, start + match[0].length, `<p>${inner}</p>`);
    }
  }

  // Sort by document position, dropping any segment swallowed by an earlier one.
  segments.sort((a, b) => a.start - b.start);
  const blocks: DescriptionBlock[] = [];
  let cursor = -1;
  for (const segment of segments) {
    if (segment.start < cursor) continue;
    cursor = segment.end;
    if ("block" in segment) {
      blocks.push(segment.block);
    } else {
      blocks.push({ type: "paragraph", html: segment.raw });
    }
  }

  // Leftover text (not inside any recognized tag) -> single paragraph.
  const leftover = textOnly(
    source
      .replace(TABLE_RE, " ")
      .replace(UL_RE, " ")
      .replace(OL_RE, " ")
      .replace(HEADING_RE, " ")
      .replace(PARAGRAPH_RE, " "),
  );
  if (leftover) {
    blocks.push({ type: "paragraph", html: `<p>${leftover}</p>` });
  }

  // Clean empty titles
  let cleaned = blocks.filter((block) => {
    if (block.type === "heading") return Boolean(block.title);
    if (block.type === "paragraph") return Boolean(textOnly(block.html));
    return true;
  }) as DescriptionBlock[];

  // Drop a leading heading that merely repeats the product name (it would
  // render as an <h2> duplicating the page <h1>).
  const firstName = productName?.trim();
  if (firstName && cleaned.length > 0) {
    const first = cleaned[0];
    if (first.type === "heading") {
      const title = first.title.trim();
      const normalized = (value: string) =>
        value.replace(/[-\s_]+/g, " ").toLowerCase();
      if (
        normalized(title) === normalized(firstName) ||
        normalized(title).startsWith(normalized(firstName)) ||
        normalized(firstName).startsWith(normalized(title))
      ) {
        cleaned = cleaned.slice(1);
      }
    }
  }

  // Cap at 50
  return cleaned.slice(0, 50);
}
