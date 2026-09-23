"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Download,
  FileJson,
  FileSpreadsheet,
  Loader2,
  Package,
  Plus,
  Upload,
} from "lucide-react";
import { motion } from "framer-motion";
import AdminToast, {
  type AdminToastState,
} from "@/components/admin/AdminToast";
import type { ShopCategory, ShopProduct } from "@/lib/shop/admin-types";
import { slugifyShopValue } from "@/lib/shop/admin-types";
import { ImportModal } from "./ImportModal";
import { BulkActionBar } from "./products/BulkActionBar";
import { ProductFilterToolbar } from "./products/ProductFilterToolbar";
import { ProductGridView } from "./products/ProductGridView";
import { ProductKpiBar } from "./products/ProductKpiBar";
import { ProductListView } from "./products/ProductListView";
import { ProductPagination } from "./products/ProductPagination";
import { QuickPreviewDrawer } from "./products/QuickPreviewDrawer";
import {
  filterProducts,
  pageProducts,
  sortProducts,
  tabCounts,
  type ProductFilters,
  type SortDirection,
  type SortKey,
} from "./products/product-list-utils";

const initialFilters: ProductFilters = {
  status: "all",
  categoryId: "",
  search: "",
  stock: "",
  featuredOnly: false,
  customizableOnly: false,
  priceMin: "",
  priceMax: "",
};

type ProductResponse = { products?: ShopProduct[]; error?: string };

export default function ShopProductListClient() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ProductFilters>(initialFilters);
  const [searchInput, setSearchInput] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [viewPreferenceLoaded, setViewPreferenceLoaded] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<ShopProduct | null>(
    null,
  );
  const [toast, setToast] = useState<AdminToastState>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const [activeResponse, archivedResponse, categoriesResponse] =
        await Promise.all([
          fetch("/api/3d-shop/admin/products"),
          fetch("/api/3d-shop/admin/products?status=archived"),
          fetch("/api/3d-shop/admin/categories"),
        ]);
      const [activeData, archivedData, categoryData] = await Promise.all([
        activeResponse.json().catch(() => ({})) as Promise<ProductResponse>,
        archivedResponse.json().catch(() => ({})) as Promise<ProductResponse>,
        categoriesResponse.json().catch(() => ({})) as Promise<{
          categories?: ShopCategory[];
          error?: string;
        }>,
      ]);
      if (!activeResponse.ok)
        throw new Error(activeData.error || "Failed to load products.");
      if (!archivedResponse.ok)
        throw new Error(
          archivedData.error || "Failed to load archived products.",
        );
      if (!categoriesResponse.ok)
        throw new Error(categoryData.error || "Failed to load categories.");
      const merged = [
        ...(activeData.products ?? []),
        ...(archivedData.products ?? []),
      ];
      setProducts(
        Array.from(
          new Map(merged.map((product) => [product.id, product])).values(),
        ),
      );
      setCategories(categoryData.categories ?? []);
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to load products.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadCatalog(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadCatalog]);
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const saved = window.localStorage.getItem("admin-3d-shop-products-view");
      if (saved === "grid" || saved === "list") setViewMode(saved);
      setViewPreferenceLoaded(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);
  useEffect(() => {
    if (!viewPreferenceLoaded) return;
    window.localStorage.setItem("admin-3d-shop-products-view", viewMode);
  }, [viewMode, viewPreferenceLoaded]);
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setFilters((current) =>
        current.search === searchInput
          ? current
          : { ...current, search: searchInput },
      );
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape" && selectedIds.size) setSelectedIds(new Set());
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedIds.size]);

  const filteredProducts = useMemo(
    () => filterProducts(products, filters),
    [products, filters],
  );
  const sortedProducts = useMemo(
    () => sortProducts(filteredProducts, sortKey, sortDirection),
    [filteredProducts, sortKey, sortDirection],
  );
  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleProducts = useMemo(
    () => pageProducts(sortedProducts, currentPage, pageSize),
    [sortedProducts, currentPage, pageSize],
  );
  const counts = useMemo(() => tabCounts(products), [products]);
  const allFilteredSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((product) => selectedIds.has(product.id));

  const updateFilters = (next: ProductFilters) => {
    setFilters(next);
    setPage(1);
  };
  const toggleSelected = (id: string) =>
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAllFiltered = () =>
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allFilteredSelected)
        filteredProducts.forEach((product) => next.delete(product.id));
      else filteredProducts.forEach((product) => next.add(product.id));
      return next;
    });
  const changeSortFromColumn = (key: SortKey) => {
    if (key === sortKey)
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDirection(key === "created_at" ? "desc" : "asc");
    }
    setPage(1);
  };

  async function archiveProduct(product: ShopProduct) {
    if (
      !window.confirm(
        `Archive "${product.name}"? It will be removed from the storefront.`,
      )
    )
      return;
    try {
      const response = await fetch(
        `/api/3d-shop/admin/products?id=${product.id}`,
        { method: "DELETE" },
      );
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error || "Failed to archive product.");
      setToast({ type: "success", message: "Product archived." });
      setPreviewProduct(null);
      await loadCatalog();
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to archive product.",
      });
    }
  }

  async function duplicateProduct(product: ShopProduct) {
    const copyName = `${product.name} Copy`;
    const existingSlugs = new Set(products.map((item) => item.slug));
    const prefix = `${slugifyShopValue(copyName)}-${product.id.slice(0, 8)}`;
    let slug = prefix;
    let suffix = 2;
    while (existingSlugs.has(slug)) {
      slug = `${prefix}-${suffix}`;
      suffix += 1;
    }
    const payload = {
      name: copyName,
      slug,
      description: product.description,
      long_description: product.long_description,
      long_description_blocks: product.long_description_blocks ?? [],
      category_id: product.category_id,
      tags: product.tags ?? [],
      occasion_tags: product.occasion_tags ?? [],
      thumbnail_url: product.thumbnail_url,
      image_urls: product.image_urls ?? [],
      image_alt: product.image_alt ?? {},
      model_url: product.model_url,
      base_price: product.base_price,
      is_customizable: product.is_customizable ?? false,
      customization_label: product.customization_label,
      is_featured: false,
      is_active: false,
      meta_title: product.meta_title,
      meta_description: product.meta_description,
      published_at: null,
    };
    try {
      const response = await fetch("/api/3d-shop/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error || "Failed to duplicate product.");
      setToast({ type: "success", message: "Draft copy created." });
      await loadCatalog();
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to duplicate product.",
      });
    }
  }

  async function mutateSelection(kind: "activate" | "draft" | "archive") {
    const ids = [...selectedIds];
    if (!ids.length) return;
    const payload =
      kind === "activate"
        ? { is_active: true, is_archived: false }
        : kind === "draft"
          ? { is_active: false, is_archived: false }
          : { is_active: false, is_archived: true };
    setBulkBusy(true);
    setToast({
      type: "success",
      message: `${kind === "archive" ? "Archiving" : kind === "activate" ? "Activating" : "Moving"} ${ids.length} products…`,
    });
    const results = await Promise.allSettled(
      ids.map(async (id) => {
        const response = await fetch("/api/3d-shop/admin/products", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ...payload }),
        });
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(data.error || "Update failed.");
        }
        return id;
      }),
    );
    const succeeded = results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );
    const failed = ids.filter((id) => !succeeded.includes(id));
    setSelectedIds(new Set(failed));
    setBulkBusy(false);
    await loadCatalog();
    setToast({
      type: failed.length ? "error" : "success",
      message: failed.length
        ? `${succeeded.length} updated; ${failed.length} failed. Failed items remain selected.`
        : `${succeeded.length} products updated.`,
    });
  }

  async function exportProducts(format: "csv" | "json", ids?: string[]) {
    setExporting(true);
    setExportOpen(false);
    try {
      const params = new URLSearchParams({ format });
      if (ids?.length) {
        params.set("ids", ids.join(","));
      } else {
        if (filters.categoryId) params.set("category_id", filters.categoryId);
        if (
          filters.status === "active" ||
          filters.status === "draft" ||
          filters.status === "archived"
        )
          params.set("status", filters.status);
        if (filters.search.trim()) params.set("search", filters.search.trim());
      }
      const response = await fetch(
        `/api/3d-shop/admin/products/export?${params}`,
      );
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Export failed.");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const filename =
        disposition.match(/filename="([^"]+)"/)?.[1] ||
        `3d-shop-products.${format}`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      setToast({
        type: "success",
        message: `Exported ${ids?.length ?? "all"} products as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      setToast({
        type: "error",
        message: error instanceof Error ? error.message : "Export failed.",
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminToast toast={toast} />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
      >
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#6d28d9]/20 bg-[#6d28d9]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#6d28d9]">
            <Package className="h-3.5 w-3.5" />
            3D Shop
          </div>
          <h1 className="font-[var(--font-syne)] text-3xl font-bold tracking-tight text-[#0F1B3D]">
            Products
          </h1>
          <p className="mt-2 text-sm text-[#6F7192]">
            Create, price, and manage 3D Shop products.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0F1B3D] shadow-sm hover:bg-gray-50"
          >
            <Upload className="h-4 w-4 text-[#6F7192]" />
            Import
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportOpen((value) => !value)}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0F1B3D] shadow-sm hover:bg-gray-50 disabled:opacity-60"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4 text-[#6F7192]" />
              )}
              Export
            </button>
            {exportOpen && (
              <>
                <div className="absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => void exportProducts("csv")}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-gray-50"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-[#6d28d9]" />
                    Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => void exportProducts("json")}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-gray-50"
                  >
                    <FileJson className="h-4 w-4 text-[#6d28d9]" />
                    Export JSON
                  </button>
                </div>
                <button
                  type="button"
                  aria-label="Close export menu"
                  className="fixed inset-0 z-20 cursor-default"
                  onClick={() => setExportOpen(false)}
                />
              </>
            )}
          </div>
          <Link
            href="/admin/3d-shop/products/new"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6d28d9] to-[#8b5cf6] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Link>
        </div>
      </motion.div>
      <ProductKpiBar products={products} loading={loading} />
      <ProductFilterToolbar
        categories={categories}
        filters={filters}
        counts={counts}
        viewMode={viewMode}
        sortKey={sortKey}
        sortDirection={sortDirection}
        advancedOpen={advancedOpen}
        onFiltersChange={updateFilters}
        onViewModeChange={setViewMode}
        onSortChange={(key, direction) => {
          setSortKey(key);
          setSortDirection(direction);
          setPage(1);
        }}
        onAdvancedToggle={() => setAdvancedOpen((value) => !value)}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        searchInputRef={searchRef}
      />
      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="aspect-[4/5] animate-pulse rounded-2xl bg-gray-100"
            />
          ))}
        </div>
      ) : visibleProducts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-20 text-center">
          <Package className="mx-auto h-9 w-9 text-gray-400" />
          <h2 className="mt-3 text-base font-semibold text-[#0F1B3D]">
            No products found
          </h2>
          <p className="mt-1 text-sm text-[#6F7192]">
            {filters.status === "all" && !filters.search
              ? "Create your first product to start selling."
              : "Try clearing a filter or adjusting your search."}
          </p>
          {filters.status === "all" && !filters.search ? (
            <Link
              href="/admin/3d-shop/products/new"
              className="mt-4 inline-flex rounded-xl bg-[#6d28d9] px-4 py-2 text-sm font-semibold text-white"
            >
              Add Product
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                setFilters(initialFilters);
                setSearchInput("");
              }}
              className="mt-4 text-sm font-semibold text-[#6d28d9]"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-0">
          {viewMode === "grid" ? (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={toggleAllFiltered}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-[#0F1B3D] shadow-sm hover:bg-gray-50"
                >
                  {allFilteredSelected
                    ? "Clear filtered selection"
                    : `Select all ${filteredProducts.length} filtered`}
                </button>
              </div>
              <ProductGridView
                products={visibleProducts}
                selectedIds={selectedIds}
                onSelect={toggleSelected}
                onPreview={setPreviewProduct}
                onDuplicate={(product) => void duplicateProduct(product)}
                onArchive={(product) => void archiveProduct(product)}
              />
            </div>
          ) : (
            <ProductListView
              products={visibleProducts}
              selectedIds={selectedIds}
              allPageSelected={allFilteredSelected}
              onSelect={toggleSelected}
              onSelectAll={toggleAllFiltered}
              onPreview={setPreviewProduct}
              onDuplicate={(product) => void duplicateProduct(product)}
              onArchive={(product) => void archiveProduct(product)}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={changeSortFromColumn}
            />
          )}
          <ProductPagination
            page={currentPage}
            pageSize={pageSize}
            total={sortedProducts.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </div>
      )}
      <BulkActionBar
        count={selectedIds.size}
        busy={bulkBusy}
        onActivate={() => void mutateSelection("activate")}
        onDraft={() => void mutateSelection("draft")}
        onArchive={() => void mutateSelection("archive")}
        onExport={() => void exportProducts("csv", [...selectedIds])}
        onClear={() => setSelectedIds(new Set())}
      />
      <QuickPreviewDrawer
        product={previewProduct}
        onClose={() => setPreviewProduct(null)}
        onDuplicate={(product) => void duplicateProduct(product)}
        onArchive={(product) => void archiveProduct(product)}
      />
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => {
          setPage(1);
          void loadCatalog();
        }}
      />
    </div>
  );
}
