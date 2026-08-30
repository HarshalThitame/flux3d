"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Edit3,
  GripVertical,
  ImagePlus,
  Layers,
  Plus,
  Trash2,
  Folder,
  FolderOpen,
  CornerDownRight,
  ChevronRight,
  ChevronDown,
  ListTree,
  Expand,
  Shrink,
} from "lucide-react";
import Modal from "@/components/admin/Modal";
import AdminToast, {
  type AdminToastState,
} from "@/components/admin/AdminToast";
import type { ShopCategory } from "@/lib/shop/admin-types";
import { slugifyShopValue } from "@/lib/shop/admin-types";

type CategoryForm = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  icon_emoji: string;
  banner_image_url: string;
  parent_category_id: string;
  display_order: number;
  is_active: boolean;
};

const emptyForm: CategoryForm = {
  name: "",
  slug: "",
  description: "",
  icon_emoji: "🧩",
  banner_image_url: "",
  parent_category_id: "",
  display_order: 0,
  is_active: true,
};

type TreeNode = ShopCategory & { children: TreeNode[] };

export default function ShopCategoryManager() {
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [slugLocked, setSlugLocked] = useState(true);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [dragId, setDragId] = useState<string | null>(null);
  const [toast, setToast] = useState<AdminToastState>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  useEffect(() => {
    void loadCategories();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const { tree, categoryById } = useMemo(() => {
    const map = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];

    categories.forEach((c) => map.set(c.id, { ...c, children: [] }));

    categories.forEach((c) => {
      if (c.parent_category_id && map.has(c.parent_category_id)) {
        map.get(c.parent_category_id)!.children.push(map.get(c.id)!);
      } else {
        rootNodes.push(map.get(c.id)!);
      }
    });

    const sortTree = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
      nodes.forEach((n) => sortTree(n.children));
    };
    sortTree(rootNodes);

    return { tree: rootNodes, categoryById: map };
  }, [categories]);

  async function loadCategories() {
    setLoading(true);
    try {
      const response = await fetch("/api/3d-shop/admin/categories");
      const data = (await response.json()) as {
        categories?: ShopCategory[];
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error || "Failed to load categories.");
      const cats = data.categories ?? [];
      setCategories(cats);
      setExpanded(new Set(cats.map((c) => c.id)));
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to load categories.",
      });
    } finally {
      setLoading(false);
    }
  }

  function expandAll() {
    setExpanded(new Set(categories.map((c) => c.id)));
  }

  function collapseAll() {
    setExpanded(new Set());
  }

  function openCreateModal(parentId?: string) {
    setForm({
      ...emptyForm,
      display_order: categories.length,
      parent_category_id: parentId ?? "",
    });
    setSlugLocked(true);
    setModalOpen(true);
  }

  function openEditModal(category: ShopCategory) {
    setForm({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      icon_emoji: category.icon_emoji ?? "",
      banner_image_url: category.banner_image_url ?? "",
      parent_category_id: category.parent_category_id ?? "",
      display_order: category.display_order ?? 0,
      is_active: category.is_active ?? true,
    });
    setSlugLocked(true);
    setModalOpen(true);
  }

  function updateForm<K extends keyof CategoryForm>(
    key: K,
    value: CategoryForm[K],
  ) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "name" && slugLocked && !current.id) {
        next.slug = slugifyShopValue(String(value));
      }
      return next;
    });
  }

  async function saveCategory(event: React.FormEvent) {
    event.preventDefault();

    if (form.id && form.parent_category_id) {
      if (form.id === form.parent_category_id) {
        setToast({
          type: "error",
          message: "Category cannot be its own parent.",
        });
        return;
      }
      if (isDescendant(form.id, form.parent_category_id)) {
        setToast({
          type: "error",
          message:
            "Circular loop detected: Cannot set a descendant as a parent.",
        });
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        parent_category_id: form.parent_category_id || null,
        banner_image_url: form.banner_image_url || null,
        icon_emoji: form.icon_emoji || null,
      };
      const response = await fetch("/api/3d-shop/admin/categories", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(data.error || "Failed to save category.");
      setToast({
        type: "success",
        message: form.id ? "Category updated." : "Category created.",
      });
      setModalOpen(false);
      await loadCategories();
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to save category.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(category: ShopCategory) {
    if (
      !window.confirm(
        `Delete "${category.name}"? This only works when no products are linked.`,
      )
    )
      return;
    const response = await fetch(
      `/api/3d-shop/admin/categories?id=${category.id}`,
      { method: "DELETE" },
    );
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    if (!response.ok) {
      setToast({
        type: "error",
        message: data.error || "Failed to delete category.",
      });
      return;
    }
    setToast({ type: "success", message: "Category deleted." });
    await loadCategories();
  }

  async function uploadBanner(file: File) {
    const body = new FormData();
    body.append("file", file);
    body.append("productId", "category-banners");

    const response = await fetch("/api/3d-shop/admin/upload", {
      method: "POST",
      body,
    });
    const data = (await response.json()) as {
      publicUrl?: string;
      error?: string;
    };
    if (!response.ok || !data.publicUrl)
      throw new Error(data.error || "Upload failed.");
    updateForm("banner_image_url", data.publicUrl);
  }

  function isDescendant(parentId: string, nodeId: string): boolean {
    const parent = categoryById.get(parentId);
    if (!parent) return false;
    if (parent.children.some((c) => c.id === nodeId)) return true;
    return parent.children.some((c) => isDescendant(c.id, nodeId));
  }

  async function handleReparent(draggedId: string, targetId: string | null) {
    if (draggedId === targetId) return;
    if (targetId && isDescendant(draggedId, targetId)) {
      setToast({
        type: "error",
        message:
          "Cannot move a category inside its own descendant (Circular loop).",
      });
      return;
    }

    setCategories((current) =>
      current.map((c) =>
        c.id === draggedId ? { ...c, parent_category_id: targetId } : c,
      ),
    );
    const response = await fetch("/api/3d-shop/admin/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: draggedId,
        parent_category_id: targetId,
      }),
    });
    if (!response.ok) {
      setToast({ type: "error", message: "Failed to update category parent." });
      await loadCategories();
    } else {
      setToast({ type: "success", message: "Category moved successfully." });
      if (targetId) {
        setExpanded((prev) => {
          const next = new Set(prev);
          next.add(targetId);
          return next;
        });
      }
    }
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const renderNode = (node: TreeNode, depth = 0) => {
    const isExpanded = expanded.has(node.id);
    const isDragTarget = dropTarget === node.id;
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id} className="w-full">
        <div
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            setDragId(node.id);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (dragId !== node.id && !isDescendant(dragId!, node.id)) {
              setDropTarget(node.id);
            }
          }}
          onDragLeave={(e) => {
            e.stopPropagation();
            setDropTarget(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDropTarget(null);
            if (dragId) handleReparent(dragId, node.id);
          }}
          className={`group relative flex items-center justify-between border-b border-gray-100 py-3 pr-4 transition-colors hover:bg-indigo-50/50 ${isDragTarget ? "bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500" : ""}`}
        >
          {/* Visual Tree Lines */}
          <div
            className="absolute left-0 top-0 bottom-0 pointer-events-none flex"
            style={{ paddingLeft: "1rem" }}
          >
            {Array.from({ length: depth }).map((_, i) => (
              <div
                key={i}
                className="w-6 border-l-2 border-gray-100 h-full ml-[11px]"
              />
            ))}
          </div>

          <div
            className="flex items-center gap-2 relative z-10"
            style={{ paddingLeft: `${Math.max(1, depth * 1.5 + 1)}rem` }}
          >
            <div className="flex w-6 justify-center cursor-move text-gray-300 hover:text-gray-500">
              <GripVertical className="h-4 w-4" />
            </div>

            <button
              type="button"
              onClick={() => toggleExpanded(node.id)}
              className={`flex h-6 w-6 items-center justify-center rounded hover:bg-gray-200 ${!hasChildren ? "invisible" : "text-gray-500 hover:text-gray-900"}`}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-gray-200 text-lg shadow-sm">
              {node.icon_emoji || "🧩"}
            </div>

            <div className="flex flex-col ml-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#0F1B3D]">
                  {node.name}
                </span>
                <span className="text-xs text-gray-400">/{node.slug}</span>
                {!node.is_active && (
                  <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                    Hidden
                  </span>
                )}
              </div>
              <span className="text-[11px] text-gray-400 font-medium">
                Order: {node.display_order ?? 0} • Products:{" "}
                {node.product_count ?? 0}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 relative z-10">
            <button
              type="button"
              onClick={() => openCreateModal(node.id)}
              className="inline-flex items-center gap-1 rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700"
              title="Add Subcategory"
            >
              <Plus className="h-3.5 w-3.5" /> Subcategory
            </button>
            <div className="h-4 w-px bg-gray-200 mx-1" />
            <button
              type="button"
              onClick={() => openEditModal(node)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
              title="Edit"
            >
              <Edit3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => void deleteCategory(node)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div className="w-full relative">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <AdminToast toast={toast} />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
      >
        <div>
          <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#6d28d9]/20 bg-[#6d28d9]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#6d28d9]">
            <Layers className="h-3 w-3" />
            3D Shop
          </div>
          <h1 className="font-[var(--font-syne)] text-3xl font-bold tracking-tight text-[#0F1B3D]">
            Category Hierarchy
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#6F7192]">
            Drag and drop to reorganize categories into an infinite nested tree.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={expandAll}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            <Expand className="h-4 w-4" />
            Expand All
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            <Shrink className="h-4 w-4" />
            Collapse All
          </button>
          <button
            type="button"
            onClick={() => openCreateModal()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6d28d9] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5b21b6]"
          >
            <ListTree className="h-4 w-4" />
            Add Root Category
          </button>
        </div>
      </motion.div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div
          className={`border-b border-gray-100 bg-gray-50 px-4 py-3 ${dropTarget === "root" ? "bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (
              dragId &&
              categoryById.get(dragId)?.parent_category_id !== null
            ) {
              setDropTarget("root");
            }
          }}
          onDragLeave={(e) => {
            e.stopPropagation();
            setDropTarget(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDropTarget(null);
            if (dragId) handleReparent(dragId, null);
          }}
        >
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gray-500">
            <CornerDownRight className="h-4 w-4 text-gray-400" />
            Root Level (Drop here to make top-level)
          </div>
        </div>
        <div className="flex flex-col w-full">
          {loading ? (
            <div className="px-5 py-12 text-center text-sm text-[#6F7192]">
              Loading categories...
            </div>
          ) : tree.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-[#6F7192]">
              No categories yet.
            </div>
          ) : (
            tree.map((node) => renderNode(node, 0))
          )}
        </div>
      </div>

      <Modal
        open={modalOpen}
        onOpenChangeAction={setModalOpen}
        title={form.id ? "Edit Category" : "Add Category"}
        description="Create Shop navigation and merchandising groups."
      >
        <form
          onSubmit={saveCategory}
          className="scrollbar-hide max-h-[calc(100vh-180px)] space-y-4 overflow-y-auto pr-1"
        >
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[#6F7192]">
              Name
            </span>
            <input
              value={form.name}
              onChange={(event) => updateForm("name", event.target.value)}
              className="w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3.5 py-2.5 text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9]/30"
              required
            />
          </label>

          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[#6F7192]">
                Slug
              </span>
              <input
                value={form.slug}
                readOnly={slugLocked}
                onChange={(event) =>
                  updateForm("slug", slugifyShopValue(event.target.value))
                }
                className="w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3.5 py-2.5 text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9]/30 read-only:text-[#6F7192]"
                required
              />
            </label>
            <button
              type="button"
              onClick={() => setSlugLocked((current) => !current)}
              className="mt-6 rounded-xl border border-gray-200 px-3 py-2 text-sm text-[#6F7192] hover:bg-gray-50"
            >
              {slugLocked ? "Edit" : "Lock"}
            </button>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[#6F7192]">
              Description
            </span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(event) =>
                updateForm("description", event.target.value)
              }
              className="w-full resize-none rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3.5 py-2.5 text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9]/30"
            />
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[#6F7192]">
                Icon Emoji
              </span>
              <div className="flex items-center gap-2">
                <input
                  value={form.icon_emoji}
                  onChange={(event) =>
                    updateForm("icon_emoji", event.target.value)
                  }
                  className="w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3.5 py-2.5 text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9]/30"
                />
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-gray-200 bg-gray-50 text-xl">
                  {form.icon_emoji || "🧩"}
                </span>
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[#6F7192]">
                Parent Category
              </span>
              <select
                value={form.parent_category_id}
                onChange={(event) =>
                  updateForm("parent_category_id", event.target.value)
                }
                className="w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3.5 py-2.5 text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9]/30"
              >
                <option value="">None (Root)</option>
                {categories
                  .filter(
                    (category) =>
                      category.id !== form.id &&
                      !isDescendant(form.id || "", category.id),
                  )
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[#6F7192]">
                Display Order
              </span>
              <input
                type="number"
                value={form.display_order}
                onChange={(event) =>
                  updateForm("display_order", Number(event.target.value))
                }
                className="w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3.5 py-2.5 text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9]/30"
              />
            </label>
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div>
                <div className="text-sm font-medium text-[#0F1B3D]">
                  Is Active
                </div>
                <div className="text-xs text-[#6F7192]">
                  Show in Shop browsing.
                </div>
              </div>
              <button
                type="button"
                aria-pressed={form.is_active}
                onClick={() => updateForm("is_active", !form.is_active)}
                className={`relative h-6 w-11 rounded-full transition ${form.is_active ? "bg-[#6d28d9]" : "bg-gray-200"}`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${form.is_active ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <div className="mb-2 text-xs font-medium text-[#6F7192]">
              Banner Image
            </div>
            {form.banner_image_url && (
              <Image
                src={form.banner_image_url}
                alt="Category banner preview"
                width={640}
                height={160}
                className="mb-3 h-28 w-full rounded-lg object-cover"
              />
            )}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#6d28d9]/20 bg-white px-3 py-2 text-sm text-[#6d28d9] hover:bg-[#6d28d9]/5">
              <ImagePlus className="h-4 w-4" />
              Upload Banner
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void uploadBanner(file).catch((error) =>
                    setToast({
                      type: "error",
                      message:
                        error instanceof Error
                          ? error.message
                          : "Upload failed.",
                    }),
                  );
                }}
              />
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-[#6F7192] hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              disabled={saving}
              className="rounded-xl bg-[#6d28d9] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
