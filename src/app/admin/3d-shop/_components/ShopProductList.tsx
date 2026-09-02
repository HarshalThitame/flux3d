"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Archive,
  ChevronDown,
  Copy,
  Download,
  Edit3,
  FileJson,
  FileSpreadsheet,
  Loader2,
  Package,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import AdminToast, {
  type AdminToastState,
} from "@/components/admin/AdminToast";
import { ImportModal } from "./ImportModal";
import type { ShopCategory, ShopProduct } from "@/lib/shop/admin-types";
import { slugifyShopValue } from "@/lib/shop/admin-types";

const PAGE_SIZE = 20;

function stockClasses(status: ShopProduct["stock_status"]) {
  if (status === "All In Stock") return "bg-emerald-100 text-emerald-700";
  if (status === "Some Low Stock") return "bg-yellow-100 text-yellow-700";
  if (status === "Out of Stock") return "bg-rose-100 text-rose-700";
  return "bg-gray-100 text-[#6F7192]";
}

export default function ShopProductList() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<AdminToastState>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const [searchInput, setSearchInput] = useState("");

  const loadCategories = useCallback(async () => {
    const response = await fetch("/api/3d-shop/admin/categories");
    const data = (await response.json().catch(() => ({}))) as {
      categories?: ShopCategory[];
    };
    setCategories(data.categories ?? []);
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryId) params.set("category_id", categoryId);
      if (status) params.set("status", status);
      if (search.trim()) params.set("search", search.trim());

      const response = await fetch(
        `/api/3d-shop/admin/products?${params.toString()}`,
      );
      const data = (await response.json()) as {
        products?: ShopProduct[];
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error || "Failed to load products.");

      const newProducts = data.products ?? [];
      setProducts(newProducts);
      setPage((current) => {
        const newTotal = Math.max(Math.ceil(newProducts.length / PAGE_SIZE), 1);
        return current > newTotal ? newTotal : current;
      });
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to load products.",
      });
    } finally {
      setLoading(false);
    }
  }, [categoryId, search, status]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadCategories();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadCategories]);

  // Debounce search input
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (search !== searchInput) {
        setSearch(searchInput);
        setPage(1); // Reset page on search
      }
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput, search]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadProducts();
    }, 50); // slight delay to allow state to settle
    return () => window.clearTimeout(timeout);
  }, [loadProducts]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function archiveProduct(product: ShopProduct) {
    if (
      !window.confirm(
        `Are you sure you want to archive "${product.name}"? This action can be reversed later but will remove the product from the storefront.`,
      )
    )
      return;
    const response = await fetch(
      `/api/3d-shop/admin/products?id=${product.id}`,
      { method: "DELETE" },
    );
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    if (!response.ok) {
      setToast({
        type: "error",
        message: data.error || "Failed to archive product.",
      });
      return;
    }
    setToast({ type: "success", message: "Product archived." });
    await loadProducts();
  }

  async function duplicateProduct(product: ShopProduct) {
    const copyName = `${product.name} Copy`;
    const existingSlugs = new Set(products.map((item) => item.slug));
    const slugPrefix = `${slugifyShopValue(copyName)}-${product.id.slice(0, 8)}`;
    let slug = slugPrefix;
    let suffix = 2;
    while (existingSlugs.has(slug)) {
      slug = `${slugPrefix}-${suffix}`;
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

    const response = await fetch("/api/3d-shop/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    if (!response.ok) {
      setToast({
        type: "error",
        message: data.error || "Failed to duplicate product.",
      });
      return;
    }
    setToast({ type: "success", message: "Draft copy created." });
    await loadProducts();
  }

  const totalPages = Math.max(Math.ceil(products.length / PAGE_SIZE), 1);
  const visibleProducts = useMemo(
    () => products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [page, products],
  );

  async function exportProducts(format: "csv" | "json") {
    setExporting(true);
    setExportOpen(false);
    try {
      const params = new URLSearchParams({ format });
      if (categoryId) params.set("category_id", categoryId);
      if (status) params.set("status", status);
      if (search.trim()) params.set("search", search.trim());
      const response = await fetch(
        `/api/3d-shop/admin/products/export?${params.toString()}`,
      );
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Export failed.");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : `3d-shop-products.${format}`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      setToast({
        type: "success",
        message: `Exported ${format.toUpperCase()} file.`,
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

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    setPage(1);
  };

  const handleCategoryChange = (newCategory: string) => {
    setCategoryId(newCategory);
    setPage(1);
  };

  const STATUS_TABS = [
    { label: "All Products", value: "" },
    { label: "Active", value: "active" },
    { label: "Draft", value: "draft" },
    { label: "Archived", value: "archived" },
  ];

  return (
    <div className="space-y-6">
      <AdminToast toast={toast} />

      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
      >
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#6d28d9]/20 bg-[#6d28d9]/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] font-bold text-[#6d28d9]">
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
          <div className="relative">
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0F1B3D] transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/20 shadow-sm"
            >
              <Upload className="h-4 w-4 text-[#6F7192]" />
              Import
            </button>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportOpen((current) => !current)}
              disabled={exporting}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0F1B3D] transition hover:bg-gray-50 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/20 shadow-sm"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#6F7192]" />
              ) : (
                <Download className="h-4 w-4 text-[#6F7192]" />
              )}
              Export
              <ChevronDown className="h-3.5 w-3.5 text-[#6F7192]" />
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => void exportProducts("csv")}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-[#0F1B3D] hover:bg-gray-50 transition"
                >
                  <FileSpreadsheet className="h-4 w-4 text-[#6d28d9]" />
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => void exportProducts("json")}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-[#0F1B3D] hover:bg-gray-50 transition"
                >
                  <FileJson className="h-4 w-4 text-[#6d28d9]" />
                  Export JSON
                </button>
              </div>
            )}
          </div>
          <Link
            href="/admin/3d-shop/products/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6d28d9] to-[#8b5cf6] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/40 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Link>
        </div>
      </motion.div>

      {/* Tabs & Filters */}
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-4 md:flex-row md:items-center md:justify-between">
        <div
          className="flex overflow-x-auto gap-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          role="tablist"
          aria-label="Product Status Filters"
        >
          {STATUS_TABS.map((tab) => {
            const isActive = status === tab.value;
            return (
              <button
                key={tab.value}
                role="tab"
                aria-selected={isActive}
                onClick={() => handleStatusChange(tab.value)}
                className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/40 ${
                  isActive
                    ? "bg-[#6d28d9]/10 text-[#6d28d9]"
                    : "text-[#6F7192] hover:bg-gray-50 hover:text-[#0F1B3D]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={categoryId}
            onChange={(event) => handleCategoryChange(event.target.value)}
            className="w-full sm:w-48 appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-[#0F1B3D] shadow-sm outline-none transition focus:border-[#6d28d9] focus:ring-1 focus:ring-[#6d28d9] bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%22%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236F7192%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat pr-10"
            aria-label="Filter by category"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F7192]" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search products..."
              aria-label="Search products"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-[#0F1B3D] shadow-sm outline-none transition focus:border-[#6d28d9] focus:ring-1 focus:ring-[#6d28d9]"
            />
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/80 backdrop-blur-sm">
              <tr>
                {["Product", "Pricing", "Stock Status", "State", "Actions"].map(
                  (label, i) => (
                    <th
                      key={label}
                      className={`px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6F7192] ${
                        i === 4 ? "text-right" : ""
                      }`}
                    >
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-6 w-6 animate-spin text-[#6d28d9]" />
                      <p className="text-sm font-medium text-[#6F7192]">
                        Loading products...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : visibleProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="rounded-full bg-gray-50 p-4">
                        <Package className="h-8 w-8 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-base font-medium text-[#0F1B3D]">
                          No products found
                        </p>
                        <p className="mt-1 text-sm text-[#6F7192]">
                          Try adjusting your search or filters to find what
                          you&apos;re looking for.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleProducts.map((product) => {
                  const stateLabel = product.is_archived
                    ? "Archived"
                    : product.is_active
                      ? "Active"
                      : "Draft";
                  const stateClasses = product.is_archived
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : product.is_active
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-gray-50 text-gray-600 border-gray-200";

                  return (
                    <tr
                      key={product.id}
                      className="group transition-colors hover:bg-gray-50/80"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                            {product.thumbnail_url ? (
                              <Image
                                src={product.thumbnail_url}
                                alt={product.name}
                                fill
                                sizes="48px"
                                className="object-cover transition-transform group-hover:scale-105"
                              />
                            ) : (
                              <div className="grid h-full w-full place-items-center text-[10px] font-medium text-[#6F7192]">
                                N/A
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col min-w-0 max-w-[240px] sm:max-w-none">
                            <Link
                              href={`/admin/3d-shop/products/${product.id}/edit`}
                              className="truncate text-sm font-semibold text-[#0F1B3D] transition hover:text-[#6d28d9]"
                            >
                              {product.name}
                            </Link>
                            <span className="truncate text-xs text-[#6F7192] mt-0.5">
                              {product.category_name || "Uncategorized"}
                              {product.is_featured && (
                                <span className="ml-2 inline-flex items-center rounded-full bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                                  Featured
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-[#0F1B3D]">
                            ₹{Number(product.base_price || 0).toFixed(2)}
                          </span>
                          <span className="text-xs text-[#6F7192] mt-0.5">
                            {product.sku_count ?? 0} SKU
                            {product.sku_count !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${stockClasses(product.stock_status)}`}
                        >
                          {product.stock_status || "No SKUs"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${stateClasses}`}
                        >
                          {stateLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 transition-opacity group-hover:opacity-100">
                          <Link
                            href={`/admin/3d-shop/products/${product.id}/edit`}
                            aria-label={`Edit ${product.name}`}
                            className="rounded-lg p-2 text-[#6F7192] transition-colors hover:bg-gray-200 hover:text-[#0F1B3D] focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/40"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => void duplicateProduct(product)}
                            aria-label={`Duplicate ${product.name}`}
                            className="rounded-lg p-2 text-[#6F7192] transition-colors hover:bg-gray-200 hover:text-[#0F1B3D] focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/40"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void archiveProduct(product)}
                            aria-label={`Archive ${product.name}`}
                            className="rounded-lg p-2 text-[#6F7192] transition-colors hover:bg-rose-100 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4 gap-4">
            <div className="text-sm text-[#6F7192]">
              Showing{" "}
              <span className="font-medium text-[#0F1B3D]">
                {(page - 1) * PAGE_SIZE + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-[#0F1B3D]">
                {Math.min(page * PAGE_SIZE, products.length)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-[#0F1B3D]">
                {products.length}
              </span>{" "}
              products
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                aria-label="Previous page"
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-[#0F1B3D] shadow-sm transition hover:bg-gray-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/20"
              >
                Previous
              </button>
              <div className="px-2 text-sm font-medium text-[#6F7192]">
                Page {page} of {totalPages}
              </div>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                aria-label="Next page"
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-[#0F1B3D] shadow-sm transition hover:bg-gray-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/20"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {exportOpen && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setExportOpen(false)}
        />
      )}
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => {
          setPage(1);
          void loadProducts();
        }}
      />
    </div>
  );
}
