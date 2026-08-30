"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownUp, Check, ChevronDown, X, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type {
  ShopPublicCategory,
  ShopPublicProduct,
} from "@/lib/shop/public-types";

type SortOption = "featured" | "newest" | "price_asc" | "price_desc" | "rating";

interface ProductFilterBarProps {
  products: ShopPublicProduct[];
  categories: ShopPublicCategory[];
  onFilteredChange: (products: ShopPublicProduct[]) => void;
  className?: string;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
];

const PRICE_RANGES = [
  { label: "Under ₹500", min: 0, max: 500 },
  { label: "₹500 – ₹1,000", min: 500, max: 1000 },
  { label: "₹1,000 – ₹2,000", min: 1000, max: 2000 },
  { label: "₹2,000 – ₹5,000", min: 2000, max: 5000 },
  { label: "₹5,000+", min: 5000, max: Infinity },
];

export default function ProductFilterBar({
  products,
  categories,
  onFilteredChange,
  className = "",
}: ProductFilterBarProps) {
  const [selectedCategorySlug, setSelectedCategorySlug] =
    useState<string>("all");
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
  const [sort, setSort] = useState<SortOption>("featured");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  // Build tree
  const { rootCategories, categoryMap } = useMemo(() => {
    const map = new Map<
      string,
      ShopPublicCategory & { children: ShopPublicCategory[] }
    >();
    categories.forEach((c) => map.set(c.id, { ...c, children: [] }));
    const roots: (ShopPublicCategory & { children: ShopPublicCategory[] })[] =
      [];

    map.forEach((c) => {
      if (c.parent_category_id && map.has(c.parent_category_id)) {
        map.get(c.parent_category_id)!.children.push(c);
      } else {
        roots.push(c);
      }
    });

    // Also build a slug->id map for quick lookup
    const slugMap = new Map<
      string,
      ShopPublicCategory & { children: ShopPublicCategory[] }
    >();
    map.forEach((c) => slugMap.set(c.slug, c));

    return { rootCategories: roots, categoryMap: slugMap };
  }, [categories]);

  // Determine active root category (for showing subcategories)
  const activeRoot = useMemo(() => {
    if (selectedCategorySlug === "all") return null;
    const cat = categoryMap.get(selectedCategorySlug);
    if (!cat) return null;
    if (!cat.parent_category_id) return cat;
    return (
      categoryMap.get(
        categories.find((c) => c.id === cat.parent_category_id)?.slug ?? "",
      ) ?? null
    );
  }, [selectedCategorySlug, categoryMap, categories]);

  const activeFilters = useMemo(() => {
    const filters: { label: string; onRemove: () => void }[] = [];
    if (selectedCategorySlug !== "all") {
      const cat = categoryMap.get(selectedCategorySlug);
      if (cat)
        filters.push({
          label: cat.name,
          onRemove: () => setSelectedCategorySlug("all"),
        });
    }
    if (selectedPrice !== null) {
      filters.push({
        label: PRICE_RANGES[selectedPrice].label,
        onRemove: () => setSelectedPrice(null),
      });
    }
    if (inStockOnly) {
      filters.push({
        label: "In Stock",
        onRemove: () => setInStockOnly(false),
      });
    }
    return filters;
  }, [selectedCategorySlug, selectedPrice, inStockOnly, categoryMap]);

  const filtered = useMemo(() => {
    let result = [...products];

    if (selectedCategorySlug !== "all") {
      const cat = categoryMap.get(selectedCategorySlug);
      if (cat) {
        // Collect all descendant IDs
        const ids = new Set([cat.id]);
        cat.children?.forEach((child) => ids.add(child.id));

        result = result.filter((p) => p.categories?.some((c) => ids.has(c.id)));
      }
    }

    if (selectedPrice !== null) {
      const range = PRICE_RANGES[selectedPrice];
      result = result.filter(
        (p) => p.display_price >= range.min && p.display_price <= range.max,
      );
    }

    if (inStockOnly) {
      result = result.filter((p) => p.in_stock);
    }

    switch (sort) {
      case "price_asc":
        result.sort((a, b) => a.display_price - b.display_price);
        break;
      case "price_desc":
        result.sort((a, b) => b.display_price - a.display_price);
        break;
      case "rating":
        result.sort(
          (a, b) =>
            b.avg_rating - a.avg_rating || b.review_count - a.review_count,
        );
        break;
      case "newest":
        result.sort(
          (a, b) =>
            new Date(b.created_at ?? 0).getTime() -
            new Date(a.created_at ?? 0).getTime(),
        );
        break;
      case "featured":
      default:
        result.sort(
          (a, b) =>
            Number(b.is_featured) - Number(a.is_featured) ||
            new Date(b.created_at ?? 0).getTime() -
              new Date(a.created_at ?? 0).getTime(),
        );
        break;
    }

    return result;
  }, [
    products,
    selectedCategorySlug,
    selectedPrice,
    sort,
    inStockOnly,
    categoryMap,
  ]);

  return (
    <div className={`${className}`}>
      {/* Filter bar container */}
      <div className="flex flex-col gap-4">
        {/* Tier 1: Root Categories + Sort */}
        <div className="flex items-center gap-3">
          <div className="flex flex-1 items-center gap-2 overflow-x-auto pb-1 scrollbar-hide [-webkit-overflow-scrolling:touch]">
            <button
              type="button"
              onClick={() => setSelectedCategorySlug("all")}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-5 py-2.5 text-[13px] font-bold tracking-[0.03em] transition-all duration-300 ${
                selectedCategorySlug === "all"
                  ? "bg-[var(--shop-text-primary)] text-white shadow-[var(--shop-shadow-md)]"
                  : "border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] text-[var(--shop-text-secondary)] hover:border-[var(--shop-border-gold)] hover:bg-white hover:text-[var(--shop-text-primary)] hover:shadow-[var(--shop-shadow-sm)]"
              }`}
            >
              All
            </button>
            {rootCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategorySlug(cat.slug)}
                className={`flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-bold tracking-[0.03em] transition-all duration-300 ${
                  activeRoot?.id === cat.id
                    ? "bg-[var(--shop-text-primary)] text-white shadow-[var(--shop-shadow-md)]"
                    : "border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] text-[var(--shop-text-secondary)] hover:border-[var(--shop-border-gold)] hover:bg-white hover:text-[var(--shop-text-primary)] hover:shadow-[var(--shop-shadow-sm)]"
                }`}
              >
                {cat.icon_emoji && (
                  <span className="text-[14px]">{cat.icon_emoji}</span>
                )}
                {cat.name}
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <div className="relative shrink-0 hidden sm:block">
            <button
              type="button"
              onClick={() => setSortOpen(!sortOpen)}
              className="flex min-h-[42px] items-center gap-2 rounded-full border border-[var(--shop-border-light)] bg-white px-5 text-[13px] font-bold text-[var(--shop-text-primary)] shadow-sm transition-all hover:border-[var(--shop-border-gold)] hover:shadow-[var(--shop-shadow-sm)]"
            >
              <ArrowDownUp className="h-4 w-4 text-[var(--shop-gold)]" />
              <span>{SORT_OPTIONS.find((o) => o.value === sort)?.label}</span>
              <ChevronDown
                className={`h-4 w-4 text-[var(--shop-text-muted)] transition-transform duration-300 ${sortOpen ? "rotate-180" : ""}`}
              />
            </button>
            <AnimatePresence>
              {sortOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setSortOpen(false)}
                  />
                  <motion.div
                    role="listbox"
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-[220px] overflow-hidden rounded-[var(--shop-radius-lg)] border border-[var(--shop-border-light)] bg-white p-1.5 shadow-[var(--shop-shadow-lg)]"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={sort === option.value}
                        onClick={() => {
                          setSort(option.value);
                          setSortOpen(false);
                        }}
                        className={`flex w-full items-center gap-3 rounded-[var(--shop-radius-md)] px-4 py-2.5 text-[13px] font-semibold transition-all ${
                          sort === option.value
                            ? "bg-[var(--shop-gold-faint)] text-[var(--shop-text-primary)]"
                            : "text-[var(--shop-text-muted)] hover:bg-[var(--shop-bg-soft)] hover:text-[var(--shop-text-primary)]"
                        }`}
                      >
                        <Check
                          className={`h-4 w-4 ${sort === option.value ? "text-[var(--shop-gold)] opacity-100" : "opacity-0"}`}
                        />
                        {option.label}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Tier 2: Subcategories (Only shows if active root has children) */}
        <AnimatePresence mode="wait">
          {activeRoot && activeRoot.children.length > 0 && (
            <motion.div
              key={`sub-${activeRoot.id}`}
              initial={{ opacity: 0, height: 0, marginTop: -16 }}
              animate={{ opacity: 1, height: "auto", marginTop: 0 }}
              exit={{ opacity: 0, height: 0, marginTop: -16 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide [-webkit-overflow-scrolling:touch]"
            >
              <div className="flex shrink-0 items-center gap-2 border-l-2 border-[var(--shop-border-gold)] pl-3">
                <button
                  type="button"
                  onClick={() => setSelectedCategorySlug(activeRoot.slug)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-bold tracking-[0.03em] transition-all duration-300 ${
                    selectedCategorySlug === activeRoot.slug
                      ? "bg-[var(--shop-gold-faint)] border border-[var(--shop-border-gold)] text-[var(--shop-gold)] shadow-sm"
                      : "border border-transparent bg-transparent text-[var(--shop-text-muted)] hover:bg-[var(--shop-bg-soft)] hover:text-[var(--shop-text-primary)]"
                  }`}
                >
                  All {activeRoot.name}
                </button>
                {activeRoot.children.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => setSelectedCategorySlug(child.slug)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-bold tracking-[0.03em] transition-all duration-300 ${
                      selectedCategorySlug === child.slug
                        ? "bg-[var(--shop-gold-faint)] border border-[var(--shop-border-gold)] text-[var(--shop-gold)] shadow-sm"
                        : "border border-transparent bg-transparent text-[var(--shop-text-muted)] hover:bg-[var(--shop-bg-soft)] hover:text-[var(--shop-text-primary)]"
                    }`}
                  >
                    {child.icon_emoji && (
                      <span className="text-[12px]">{child.icon_emoji}</span>
                    )}
                    {child.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Third row: price pills + stock toggle (Compact Utilities) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--shop-border-light)]">
          {/* Mobile sort (only visible on mobile) */}
          <div className="relative shrink-0 sm:hidden">
            <button
              type="button"
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--shop-border-light)] bg-white px-3 py-1.5 text-[11px] font-bold text-[var(--shop-text-secondary)] transition hover:border-[var(--shop-border-gold)]"
            >
              <Filter className="h-3.5 w-3.5" />
              Sort
            </button>
          </div>

          <div className="hidden sm:block h-4 w-px bg-[var(--shop-border-light)] mr-1" />

          {PRICE_RANGES.map((range, i) => (
            <button
              key={range.label}
              type="button"
              onClick={() => setSelectedPrice(selectedPrice === i ? null : i)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold tracking-[0.04em] transition-all duration-200 ${
                selectedPrice === i
                  ? "border border-[var(--shop-border-gold)] bg-[var(--shop-gold-faint)] text-[var(--shop-gold)]"
                  : "border border-[var(--shop-border-light)] bg-white text-[var(--shop-text-muted)] hover:border-[var(--shop-border-medium)] hover:text-[var(--shop-text-secondary)]"
              }`}
            >
              {range.label}
            </button>
          ))}

          <div className="mx-1 h-4 w-px bg-[var(--shop-border-light)]" />

          <button
            type="button"
            onClick={() => setInStockOnly(!inStockOnly)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold tracking-[0.04em] transition-all duration-200 ${
              inStockOnly
                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border border-[var(--shop-border-light)] bg-white text-[var(--shop-text-muted)] hover:border-[var(--shop-border-medium)] hover:text-[var(--shop-text-secondary)]"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${inStockOnly ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-[var(--shop-text-subtle)]"}`}
            />
            In Stock
          </button>
        </div>

        {/* Active filter chips */}
        <AnimatePresence>
          {activeFilters.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap items-center gap-2 pt-1"
            >
              {activeFilters.map((filter, i) => (
                <motion.span
                  key={`${filter.label}-${i}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--shop-border-gold)] bg-[var(--shop-gold-faint)] px-3 py-1 text-[11px] font-semibold text-[var(--shop-gold)] shadow-sm"
                >
                  {filter.label}
                  <button
                    type="button"
                    onClick={filter.onRemove}
                    aria-label={`Remove ${filter.label} filter`}
                    className="ml-0.5 inline-flex hover:text-[var(--shop-text-primary)]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </motion.span>
              ))}
              <button
                type="button"
                onClick={() => {
                  setSelectedCategorySlug("all");
                  setSelectedPrice(null);
                  setInStockOnly(false);
                }}
                className="ml-2 text-[11px] font-bold text-[var(--shop-text-muted)] underline underline-offset-2 transition hover:text-[var(--shop-text-primary)]"
              >
                Clear all
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Hidden: trigger parent update via a child effect wrapper */}
      <FilterChangeTrigger filtered={filtered} onChange={onFilteredChange} />
    </div>
  );
}

function FilterChangeTrigger({
  filtered,
  onChange,
}: {
  filtered: ShopPublicProduct[];
  onChange: (p: ShopPublicProduct[]) => void;
}) {
  const key = filtered.map((p) => p.id).join(",");
  const prevKeyRef = useRef("");

  useEffect(() => {
    if (key !== prevKeyRef.current) {
      prevKeyRef.current = key;
      onChange(filtered);
    }
  }, [key, filtered, onChange]);

  return null;
}
