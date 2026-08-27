import type { DescriptionBlock, DescriptionBlocks } from "@/lib/shop/blocks";
import { stripRichHtml } from "@/lib/shop/blocks";

const HEADING_RE = /<(h2|h3)[^>]*>([\s\S]*?)<\/\1>/gi;
const PARAGRAPH_RE = /<(p|div)[^>]*>([\s\S]*?)<\/\1>/gi;
const LIST_ITEM_RE = /<li[^>]*>([\s\S]*?)<\/li>/gi;
const TABLE_ROW_RE = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
const TABLE_CELL_RE = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
const UL_RE = /<ul[^>]*>([\s\S]*?)<\/ul>/gi;
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

export function convertRichHtmlToBlocks(html: string): DescriptionBlocks {
  const source = html.trim();
  if (!source) return [];

  const blocks: DescriptionBlocks = [];
  const consumedRanges: { start: number; end: number }[] = [];
  const consumed = (start: number, end: number) =>
    consumedRanges.some((range) => start >= range.start && end <= range.end);

  // Tables -> specs_table
  const tables = Array.from(source.matchAll(TABLE_RE));
  for (const match of tables) {
    const index = match.index ?? 0;
    if (consumed(index, index + match[0].length)) continue;
    const cellMatches = Array.from(match[0].matchAll(TABLE_CELL_RE)).map(
      (cell) => textOnly(cell[1]),
    );
    const meaningful = cellMatches.filter(Boolean);
    if (meaningful.length >= 2) {
      const rows: { label: string; value: string }[] = [];
      const headers = Array.from(
        match[0].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi),
      ).map((cell) => textOnly(cell[1]));
      const rowMatches = Array.from(match[0].matchAll(TABLE_ROW_RE));
      for (const row of rowMatches) {
        const cells = Array.from(row[0].matchAll(TABLE_CELL_RE)).map((cell) =>
          textOnly(cell[1]),
        );
        if (cells.length >= 2 && cells[0] && cells[1]) {
          rows.push({ label: cells[0], value: cells[1] });
        } else if (
          headers.length >= 2 &&
          cells.length >= headers.length &&
          cells[0] &&
          cells[1]
        ) {
          rows.push({ label: cells[0], value: cells[1] });
        }
      }
      if (rows.length > 0) {
        blocks.push({ type: "specs_table", title: "", rows });
        consumedRanges.push({ start: index, end: index + match[0].length });
        continue;
      }
    }
  }

  // Unordered lists -> feature_grid
  const lists = Array.from(source.matchAll(UL_RE));
  for (const match of lists) {
    const index = match.index ?? 0;
    if (consumed(index, index + match[0].length)) continue;
    const items = Array.from(match[0].matchAll(LIST_ITEM_RE))
      .map((item) =>
        textOnly(item[1])
          .replace(/^[-•]\s*/, "")
          .trim(),
      )
      .filter(Boolean);
    if (items.length >= 1) {
      blocks.push({
        type: "feature_grid",
        title: "",
        items: items.slice(0, 6).map((item, i) => ({
          icon: DEFAULT_FEATURE_ICONS[i % DEFAULT_FEATURE_ICONS.length],
          title: item.slice(0, 80),
          text: item.slice(0, 500),
        })),
      });
      consumedRanges.push({ start: index, end: index + match[0].length });
      continue;
    }
  }

  // Headings -> heading blocks
  const headings = Array.from(source.matchAll(HEADING_RE));
  for (const match of headings) {
    const index = match.index ?? 0;
    if (consumed(index, index + match[0].length)) continue;
    const title = textOnly(match[2]).trim();
    if (title) {
      blocks.push({ type: "heading", title, subtitle: "" });
      consumedRanges.push({ start: index, end: index + match[0].length });
    }
  }

  // Remaining paragraphs -> paragraph blocks
  const paragraphs = Array.from(source.matchAll(PARAGRAPH_RE));
  for (const match of paragraphs) {
    const index = match.index ?? 0;
    if (consumed(index, index + match[0].length)) continue;
    const inner = match[2].trim();
    if (textOnly(inner)) {
      blocks.push({ type: "paragraph", html: `<p>${inner}</p>` });
      consumedRanges.push({ start: index, end: index + match[0].length });
    }
  }

  // Any leftover text -> single paragraph
  const remaining = source
    .replace(TABLE_RE, " ")
    .replace(UL_RE, " ")
    .replace(HEADING_RE, " ")
    .replace(PARAGRAPH_RE, " ");
  const leftover = textOnly(remaining);
  if (leftover) {
    blocks.push({ type: "paragraph", html: `<p>${leftover}</p>` });
  }

  // Clean empty titles
  const cleaned = blocks.filter((block) => {
    if (block.type === "heading") return Boolean(block.title);
    if (block.type === "paragraph") return Boolean(textOnly(block.html));
    return true;
  }) as DescriptionBlock[];

  // Cap at 50
  return cleaned.slice(0, 50);
}
