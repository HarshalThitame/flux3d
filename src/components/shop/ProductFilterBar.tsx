"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownUp,
  Check,
  ChevronDown,
  X,
  SlidersHorizontal,
  Package,
  Tag,
  Layers3,
  type LucideIcon,
} from "lucide-react";
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

interface DropdownButtonProps {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  value: string | undefined;
}

function DropdownButton({
  active,
  onClick,
  icon: Icon,
  label,
  value,
}: DropdownButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-all ${
        active
          ? "border-[var(--shop-border-gold)] bg-[var(--shop-gold-faint)] text-[var(--shop-text-primary)] shadow-sm"
          : "border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] text-[var(--shop-text-secondary)] hover:border-[var(--shop-border-gold)] hover:text-[var(--shop-text-primary)] hover:shadow-sm"
      }`}
    >
      <Icon
        className={`h-4 w-4 ${active ? "text-[var(--shop-gold)]" : "text-[var(--shop-text-muted)]"}`}
      />
      <span className="hidden sm:inline">{label}:</span>
      <span className={active ? "text-[var(--shop-gold)]" : ""}>{value}</span>
      <ChevronDown
        className={`ml-1 h-3.5 w-3.5 transition-transform duration-300 ${active ? "rotate-180 text-[var(--shop-gold)]" : "text-[var(--shop-text-muted)]"}`}
      />
    </button>
  );
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest Arrivals" },
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
  const [activeDropdown, setActiveDropdown] = useState<
    "category" | "price" | "sort" | null
  >(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { rootCategories, categoryMap } = useMemo(() => {
    const map = new Map<
      string,
      ShopPublicCategory & { children: ShopPublicCategory[] }
    >();
    categories.forEach((c) => map.set(c.id, { ...c, children: [] }));
    const roots: (ShopPublicCategory & { children: ShopPublicCategory[] })[] =
      [];
    const slugMap = new Map<
      string,
      ShopPublicCategory & { children: ShopPublicCategory[] }
    >();

    map.forEach((c) => {
      if (c.parent_category_id && map.has(c.parent_category_id)) {
        map.get(c.parent_category_id)!.children.push(c);
      } else {
        roots.push(c);
      }
    });

    map.forEach((c) => slugMap.set(c.slug, c));
    return { rootCategories: roots, categoryMap: slugMap };
  }, [categories]);

  const activeFilters = useMemo(() => {
    const filters: { id: string; label: string; onRemove: () => void }[] = [];
    if (selectedCategorySlug !== "all") {
      const cat = categoryMap.get(selectedCategorySlug);
      if (cat)
        filters.push({
          id: "cat",
          label: cat.name,
          onRemove: () => setSelectedCategorySlug("all"),
        });
    }
    if (selectedPrice !== null) {
      filters.push({
        id: "price",
        label: PRICE_RANGES[selectedPrice].label,
        onRemove: () => setSelectedPrice(null),
      });
    }
    if (inStockOnly) {
      filters.push({
        id: "stock",
        label: "In Stock Only",
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

  useEffect(() => {
    onFilteredChange(filtered);
  }, [filtered, onFilteredChange]);
  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col gap-4 ${className}`}
    >
      {/* Top Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-[var(--shop-border-light)] pb-4">
        {/* Left Side: Filters */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 border-r border-[var(--shop-border-light)] pr-2 sm:pr-4">
            <SlidersHorizontal className="h-4 w-4 text-[var(--shop-text-muted)]" />
            <span className="hidden sm:inline text-xs font-bold uppercase tracking-widest text-[var(--shop-text-secondary)]">
              Filters
            </span>
          </div>

          {/* Category Dropdown */}
          <div className="relative">
            <DropdownButton
              active={activeDropdown === "category"}
              onClick={() =>
                setActiveDropdown(
                  activeDropdown === "category" ? null : "category",
                )
              }
              icon={Layers3}
              label="Category"
              value={
                selectedCategorySlug === "all"
                  ? "All"
                  : categoryMap.get(selectedCategorySlug)?.name
              }
            />
            <AnimatePresence>
              {activeDropdown === "category" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-64 rounded-xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] p-2 shadow-[var(--shop-shadow-xl)]"
                >
                  <div className="max-h-80 overflow-y-auto">
                    <button
                      onClick={() => {
                        setSelectedCategorySlug("all");
                        setActiveDropdown(null);
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                        selectedCategorySlug === "all"
                          ? "bg-[var(--shop-gold-faint)] font-bold text-[var(--shop-text-primary)]"
                          : "text-[var(--shop-text-secondary)] hover:bg-[var(--shop-bg-soft)]"
                      }`}
                    >
                      All Categories
                    </button>
                    {rootCategories.map((cat) => (
                      <div key={cat.id} className="mt-1">
                        <button
                          onClick={() => {
                            setSelectedCategorySlug(cat.slug);
                            setActiveDropdown(null);
                          }}
                          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                            selectedCategorySlug === cat.slug
                              ? "bg-[var(--shop-gold-faint)] font-bold text-[var(--shop-text-primary)]"
                              : "text-[var(--shop-text-secondary)] hover:bg-[var(--shop-bg-soft)]"
                          }`}
                        >
                          {cat.name}
                        </button>
                        {cat.children.map((child) => (
                          <button
                            key={child.id}
                            onClick={() => {
                              setSelectedCategorySlug(child.slug);
                              setActiveDropdown(null);
                            }}
                            className={`flex w-full items-center gap-2 rounded-lg pl-8 pr-3 py-1.5 text-sm transition-colors ${
                              selectedCategorySlug === child.slug
                                ? "bg-[var(--shop-gold-faint)] font-bold text-[var(--shop-text-primary)]"
                                : "text-[var(--shop-text-muted)] hover:bg-[var(--shop-bg-soft)] hover:text-[var(--shop-text-secondary)]"
                            }`}
                          >
                            {child.name}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Price Dropdown */}
          <div className="relative">
            <DropdownButton
              active={activeDropdown === "price"}
              onClick={() =>
                setActiveDropdown(activeDropdown === "price" ? null : "price")
              }
              icon={Tag}
              label="Price"
              value={
                selectedPrice === null
                  ? "Any"
                  : PRICE_RANGES[selectedPrice].label
              }
            />
            <AnimatePresence>
              {activeDropdown === "price" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-56 rounded-xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] p-2 shadow-[var(--shop-shadow-xl)]"
                >
                  <button
                    onClick={() => {
                      setSelectedPrice(null);
                      setActiveDropdown(null);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      selectedPrice === null
                        ? "bg-[var(--shop-gold-faint)] font-bold text-[var(--shop-text-primary)]"
                        : "text-[var(--shop-text-secondary)] hover:bg-[var(--shop-bg-soft)]"
                    }`}
                  >
                    Any Price
                  </button>
                  {PRICE_RANGES.map((range, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedPrice(idx);
                        setActiveDropdown(null);
                      }}
                      className={`mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        selectedPrice === idx
                          ? "bg-[var(--shop-gold-faint)] font-bold text-[var(--shop-text-primary)]"
                          : "text-[var(--shop-text-secondary)] hover:bg-[var(--shop-bg-soft)]"
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* In Stock Toggle */}
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] px-3 py-2 text-sm font-semibold text-[var(--shop-text-secondary)] transition-all hover:border-[var(--shop-border-gold)] hover:shadow-sm">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--shop-border-light)] text-[var(--shop-gold)] focus:ring-[var(--shop-gold)]"
            />
            <Package className="h-4 w-4 text-[var(--shop-text-muted)] hidden sm:block" />
            In Stock
          </label>
        </div>

        {/* Right Side: Sort */}
        <div className="relative">
          <DropdownButton
            active={activeDropdown === "sort"}
            onClick={() =>
              setActiveDropdown(activeDropdown === "sort" ? null : "sort")
            }
            icon={ArrowDownUp}
            label="Sort"
            value={SORT_OPTIONS.find((o) => o.value === sort)?.label}
          />
          <AnimatePresence>
            {activeDropdown === "sort" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-56 rounded-xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] p-2 shadow-[var(--shop-shadow-xl)]"
              >
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSort(option.value);
                      setActiveDropdown(null);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      sort === option.value
                        ? "bg-[var(--shop-gold-faint)] font-bold text-[var(--shop-text-primary)]"
                        : "text-[var(--shop-text-secondary)] hover:bg-[var(--shop-bg-soft)]"
                    }`}
                  >
                    <Check
                      className={`h-4 w-4 ${sort === option.value ? "text-[var(--shop-gold)] opacity-100" : "opacity-0"}`}
                    />
                    {option.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Active Filter Badges */}
      <AnimatePresence>
        {activeFilters.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap items-center gap-2 pt-1"
          >
            <span className="text-xs font-semibold text-[var(--shop-text-muted)] mr-1">
              Active Filters:
            </span>
            <AnimatePresence>
              {activeFilters.map((filter) => (
                <motion.button
                  key={filter.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={filter.onRemove}
                  className="group flex items-center gap-1.5 rounded-full border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] px-3 py-1 text-xs font-semibold text-[var(--shop-text-secondary)] shadow-sm transition-colors hover:border-[var(--shop-border-gold)] hover:bg-[var(--shop-gold-faint)] hover:text-[var(--shop-text-primary)]"
                >
                  {filter.label}
                  <X className="h-3 w-3 text-[var(--shop-text-muted)] transition-colors group-hover:text-[var(--shop-text-primary)]" />
                </motion.button>
              ))}
            </AnimatePresence>
            {activeFilters.length > 1 && (
              <button
                onClick={() => {
                  setSelectedCategorySlug("all");
                  setSelectedPrice(null);
                  setInStockOnly(false);
                }}
                className="ml-2 text-xs font-bold text-[var(--shop-gold)] hover:underline"
              >
                Clear all
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
