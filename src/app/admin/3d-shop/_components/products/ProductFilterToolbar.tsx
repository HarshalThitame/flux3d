import { Filter, Grid2X2, List, Search } from "lucide-react";
import type { RefObject } from "react";
import type { ShopCategory } from "@/lib/shop/admin-types";
import type {
  ProductFilters,
  ProductStatus,
  SortDirection,
  SortKey,
} from "./product-list-utils";

const tabs: { label: string; value: ProductStatus }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Draft", value: "draft" },
  { label: "Archived", value: "archived" },
  { label: "Scheduled", value: "scheduled" },
];
const sortOptions: { label: string; key: SortKey; direction: SortDirection }[] =
  [
    { label: "Newest First", key: "created_at", direction: "desc" },
    { label: "Oldest First", key: "created_at", direction: "asc" },
    { label: "Name A–Z", key: "name", direction: "asc" },
    { label: "Name Z–A", key: "name", direction: "desc" },
    { label: "Price Low–High", key: "price", direction: "asc" },
    { label: "Price High–Low", key: "price", direction: "desc" },
    { label: "Stock: Low First", key: "stock", direction: "asc" },
  ];

type Props = {
  categories: ShopCategory[];
  filters: ProductFilters;
  counts: Record<ProductStatus, number>;
  viewMode: "grid" | "list";
  sortKey: SortKey;
  sortDirection: SortDirection;
  advancedOpen: boolean;
  onFiltersChange: (next: ProductFilters) => void;
  onViewModeChange: (mode: "grid" | "list") => void;
  onSortChange: (key: SortKey, direction: SortDirection) => void;
  onAdvancedToggle: () => void;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
};

export function ProductFilterToolbar({
  categories,
  filters,
  counts,
  viewMode,
  sortKey,
  sortDirection,
  advancedOpen,
  onFiltersChange,
  onViewModeChange,
  onSortChange,
  onAdvancedToggle,
  searchInput,
  onSearchInputChange,
  searchInputRef,
}: Props) {
  const inputClass =
    "rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#0F1B3D] shadow-sm outline-none focus:border-[#6d28d9] focus:ring-1 focus:ring-[#6d28d9]";
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 border-b border-gray-200 pb-4 xl:flex-row xl:items-center xl:justify-between">
        <div
          className="flex gap-1 overflow-x-auto"
          role="tablist"
          aria-label="Product status"
        >
          <>
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={filters.status === tab.value}
                onClick={() =>
                  onFiltersChange({ ...filters, status: tab.value })
                }
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/40 ${filters.status === tab.value ? "bg-[#6d28d9]/10 text-[#6d28d9]" : "text-[#6F7192] hover:bg-gray-50"}`}
              >
                {tab.label}
                <span className="ml-1.5 rounded-full bg-current/10 px-1.5 py-0.5 text-[10px] font-bold">
                  {counts[tab.value]}
                </span>
              </button>
            ))}
          </>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1 sm:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F7192]" />
            <input
              value={searchInput}
              onChange={(event) => onSearchInputChange(event.target.value)}
              placeholder="Search products..."
              aria-label="Search products"
              className={`${inputClass} w-full pl-9`}
            />
          </div>
          <select
            value={filters.categoryId}
            onChange={(event) =>
              onFiltersChange({ ...filters, categoryId: event.target.value })
            }
            aria-label="Filter category"
            className={inputClass}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            value={`${sortKey}:${sortDirection}`}
            onChange={(event) => {
              const [key, direction] = event.target.value.split(":") as [
                SortKey,
                SortDirection,
              ];
              onSortChange(key, direction);
            }}
            aria-label="Sort products"
            className={inputClass}
          >
            {sortOptions.map((option) => (
              <option
                key={`${option.key}:${option.direction}`}
                value={`${option.key}:${option.direction}`}
              >
                {option.label}
              </option>
            ))}
          </select>
          <div className="inline-flex rounded-xl border border-gray-200 p-1">
            <button
              type="button"
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
              onClick={() => onViewModeChange("grid")}
              className={`rounded-lg p-2 ${viewMode === "grid" ? "bg-[#6d28d9] text-white" : "text-[#6F7192]"}`}
            >
              <Grid2X2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="List view"
              aria-pressed={viewMode === "list"}
              onClick={() => onViewModeChange("list")}
              className={`rounded-lg p-2 ${viewMode === "list" ? "bg-[#6d28d9] text-white" : "text-[#6F7192]"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={onAdvancedToggle}
            aria-expanded={advancedOpen}
            className={`${inputClass} inline-flex items-center gap-2`}
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>
      </div>
      {advancedOpen && (
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-4">
          <select
            value={filters.stock}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                stock: event.target.value as ProductFilters["stock"],
              })
            }
            aria-label="Filter stock"
            className={inputClass}
          >
            <option value="">All stock</option>
            <option value="in_stock">In stock</option>
            <option value="low_stock">Low stock</option>
            <option value="out_of_stock">Out of stock</option>
          </select>
          <input
            ref={searchInputRef}
            type="number"
            min="0"
            value={filters.priceMin}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                priceMin:
                  event.target.value === "" ? "" : Number(event.target.value),
              })
            }
            placeholder="Min price"
            aria-label="Minimum price"
            className={inputClass}
          />
          <input
            type="number"
            min="0"
            value={filters.priceMax}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                priceMax:
                  event.target.value === "" ? "" : Number(event.target.value),
              })
            }
            placeholder="Max price"
            aria-label="Maximum price"
            className={inputClass}
          />
          <div className="flex items-center gap-4 text-sm text-[#0F1B3D]">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.featuredOnly}
                onChange={(event) =>
                  onFiltersChange({
                    ...filters,
                    featuredOnly: event.target.checked,
                  })
                }
                className="accent-[#6d28d9]"
              />
              Featured
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.customizableOnly}
                onChange={(event) =>
                  onFiltersChange({
                    ...filters,
                    customizableOnly: event.target.checked,
                  })
                }
                className="accent-[#6d28d9]"
              />
              Customizable
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
