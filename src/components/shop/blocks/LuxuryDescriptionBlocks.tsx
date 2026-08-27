"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { DescriptionBlocks } from "@/lib/shop/blocks";
import { extractTextFromBlock } from "@/lib/shop/blocks";
import { sanitizeShopRichHtml } from "@/lib/shop/rich-text";
import { resolveIcon } from "./block-icons";

const reveal = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
};

function Prose({ html }: { html: string }) {
  const safe = sanitizeShopRichHtml(html);
  if (!safe.replace(/<[^>]*>/g, "").trim()) return null;
  return (
    <div
      className="prose prose-sm max-w-none leading-7 text-[var(--shop-text-secondary)] [&_h2]:font-[var(--shop-font-heading)] [&_h2]:text-[var(--shop-text-primary)] [&_h3]:font-[var(--shop-font-heading)] [&_h3]:text-[var(--shop-text-primary)] [&_a]:text-[var(--shop-brand-primary)] [&_a]:underline-offset-4 [&_strong]:text-[var(--shop-text-primary)] md:prose-base"
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}

function HeadingBlock({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <motion.div
      variants={reveal}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className="mx-auto max-w-3xl text-center"
    >
      <h2 className="font-[var(--shop-font-heading)] text-3xl font-semibold leading-tight text-[var(--shop-text-primary)] md:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[var(--shop-text-muted)] italic md:text-lg">
          {subtitle}
        </p>
      )}
      <motion.span
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        className="mt-6 block h-px w-24 origin-center bg-gradient-to-r from-transparent via-[var(--shop-gold)] to-transparent"
      />
    </motion.div>
  );
}

function ParagraphBlock({ html }: { html: string }) {
  return (
    <motion.div
      variants={reveal}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className="mx-auto max-w-3xl"
    >
      <Prose html={html} />
    </motion.div>
  );
}

function SpecsTableBlock({
  title,
  rows,
}: {
  title?: string;
  rows: { label: string; value: string }[];
}) {
  return (
    <motion.div
      variants={reveal}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className="mx-auto max-w-5xl"
    >
      {title && (
        <h3 className="mb-8 text-center font-[var(--shop-font-heading)] text-2xl font-semibold text-[var(--shop-text-primary)] md:text-3xl">
          {title}
        </h3>
      )}
      <motion.dl
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="grid gap-4 sm:grid-cols-2"
      >
        {rows.map((row, index) => (
          <motion.div
            key={index}
            variants={staggerItem}
            className="group relative overflow-hidden rounded-[var(--shop-radius-lg)] border border-[var(--shop-border-gold)] bg-white/50 p-5 backdrop-blur-sm transition duration-300 hover:shadow-[var(--shop-shadow-md)]"
          >
            <div className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-[var(--shop-gradient-gold)] transition-transform duration-300 group-hover:scale-x-100" />
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--shop-text-muted)]">
              {row.label}
            </dt>
            <dd className="mt-2 text-sm font-medium leading-6 text-[var(--shop-text-primary)]">
              {row.value}
            </dd>
          </motion.div>
        ))}
      </motion.dl>
    </motion.div>
  );
}

function FeatureGridBlock({
  title,
  items,
}: {
  title?: string;
  items: { icon: string; title: string; text: string }[];
}) {
  return (
    <motion.div
      variants={reveal}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className="mx-auto max-w-5xl"
    >
      {title && (
        <h3 className="mb-8 text-center font-[var(--shop-font-heading)] text-2xl font-semibold text-[var(--shop-text-primary)] md:text-3xl">
          {title}
        </h3>
      )}
      <motion.ul
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {items.map((item, index) => {
          const Icon = resolveIcon(item.icon);
          return (
            <motion.li
              key={index}
              variants={staggerItem}
              className="group rounded-[var(--shop-radius-lg)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] p-6 transition duration-300 hover:-translate-y-1 hover:border-[var(--shop-border-gold)] hover:shadow-[var(--shop-shadow-md)]"
            >
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--shop-gold-faint)] text-[var(--shop-gold)] transition duration-300 group-hover:scale-110">
                <Icon className="h-5.5 w-5.5" />
              </span>
              <h4 className="mt-4 font-semibold leading-snug text-[var(--shop-text-primary)]">
                {item.title}
              </h4>
              <p className="mt-2 text-sm leading-6 text-[var(--shop-text-secondary)]">
                {item.text}
              </p>
            </motion.li>
          );
        })}
      </motion.ul>
    </motion.div>
  );
}

function ImageTextSplitBlock({
  imageUrl,
  alt,
  html,
  align,
}: {
  imageUrl: string;
  alt: string;
  html: string;
  align: "left" | "right";
}) {
  const text = (
    <motion.div
      variants={reveal}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className="flex items-center"
    >
      <Prose html={html} />
    </motion.div>
  );
  const image = (
    <motion.div
      variants={reveal}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className="relative aspect-[4/3] overflow-hidden rounded-[var(--shop-radius-xl)] shadow-[var(--shop-shadow-lg)]"
    >
      <Image
        src={imageUrl}
        alt={alt || "Product detail"}
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        className="object-cover"
      />
    </motion.div>
  );
  return (
    <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2">
      {align === "left" ? image : text}
      {align === "left" ? text : image}
    </div>
  );
}

function QuoteBlock({
  text,
  attribution,
}: {
  text: string;
  attribution?: string;
}) {
  return (
    <motion.blockquote
      variants={reveal}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className="mx-auto max-w-3xl border-l-2 border-[var(--shop-gold)] pl-8"
    >
      <p className="font-[var(--shop-font-heading)] text-2xl italic leading-relaxed text-[var(--shop-text-primary)] md:text-3xl">
        “{text}”
      </p>
      {attribution && (
        <footer className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--shop-text-muted)]">
          — {attribution}
        </footer>
      )}
    </motion.blockquote>
  );
}

function DividerBlock({ style }: { style: "gold" | "subtle" }) {
  return (
    <motion.div
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      className={
        style === "gold"
          ? "mx-auto h-px max-w-4xl bg-gradient-to-r from-transparent via-[var(--shop-gold)] to-transparent"
          : "mx-auto h-px max-w-4xl bg-[var(--shop-border-light)]"
      }
    />
  );
}

function BulletGridBlock({
  title,
  items,
}: {
  title?: string;
  items: { icon?: string; text: string }[];
}) {
  return (
    <motion.div
      variants={reveal}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className="mx-auto max-w-5xl"
    >
      {title && (
        <h3 className="mb-8 text-center font-[var(--shop-font-heading)] text-2xl font-semibold text-[var(--shop-text-primary)] md:text-3xl">
          {title}
        </h3>
      )}
      <motion.ul
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {items.map((item, index) => {
          const Icon = item.icon ? resolveIcon(item.icon) : null;
          return (
            <motion.li
              key={index}
              variants={staggerItem}
              className="flex items-start gap-3 rounded-[var(--shop-radius-lg)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] p-4 transition duration-300 hover:border-[var(--shop-border-gold)]"
            >
              {Icon && (
                <span className="mt-0.5 shrink-0 text-[var(--shop-gold)]">
                  <Icon className="h-4 w-4" />
                </span>
              )}
              <span className="text-sm leading-6 text-[var(--shop-text-secondary)]">
                {item.text}
              </span>
            </motion.li>
          );
        })}
      </motion.ul>
    </motion.div>
  );
}

function HtmlEmbedBlock({ html, caption }: { html: string; caption?: string }) {
  return (
    <motion.div
      variants={reveal}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className="mx-auto max-w-5xl"
    >
      <div
        className="overflow-hidden rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-light)] bg-white"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {caption && (
        <p className="mt-3 text-center text-xs text-[var(--shop-text-muted)]">
          {caption}
        </p>
      )}
    </motion.div>
  );
}

const SPACER_HEIGHTS: Record<string, string> = {
  sm: "h-8 md:h-12",
  md: "h-16 md:h-24",
  lg: "h-24 md:h-36",
  xl: "h-36 md:h-52",
};

function SpacerBlock({ height }: { height: "sm" | "md" | "lg" | "xl" }) {
  return <div className={SPACER_HEIGHTS[height] ?? "h-16 md:h-24"} />;
}

function BlockRenderer({ block }: { block: DescriptionBlocks[number] }) {
  switch (block.type) {
    case "heading":
      return <HeadingBlock title={block.title} subtitle={block.subtitle} />;
    case "paragraph":
      return <ParagraphBlock html={block.html} />;
    case "specs_table":
      return <SpecsTableBlock title={block.title} rows={block.rows} />;
    case "feature_grid":
      return <FeatureGridBlock title={block.title} items={block.items} />;
    case "image_text_split":
      if (!block.image_url) return null;
      return (
        <ImageTextSplitBlock
          imageUrl={block.image_url}
          alt={block.alt}
          html={block.html}
          align={block.align}
        />
      );
    case "quote":
      return <QuoteBlock text={block.text} attribution={block.attribution} />;
    case "divider":
      return <DividerBlock style={block.style} />;
    case "bullet_grid":
      return <BulletGridBlock title={block.title} items={block.items} />;
    case "html_embed":
      return <HtmlEmbedBlock html={block.html} caption={block.caption} />;
    case "spacer":
      return <SpacerBlock height={block.height} />;
  }
}

export default function LuxuryDescriptionBlocks({
  blocks,
}: {
  blocks: DescriptionBlocks | null | undefined;
}) {
  if (!blocks || blocks.length === 0) return null;
  const visibleBlocks = blocks.filter(
    (block) =>
      extractTextFromBlock(block).trim().length > 0 ||
      block.type === "divider" ||
      block.type === "html_embed" ||
      block.type === "spacer",
  );
  if (visibleBlocks.length === 0) return null;
  return (
    <div
      className="space-y-14 md:space-y-20"
      itemScope
      itemType="https://schema.org/Product"
    >
      {visibleBlocks.map((block, index) => (
        <BlockRenderer key={index} block={block} />
      ))}
    </div>
  );
}
