"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Archive, Copy, ExternalLink, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ShopProduct } from "@/lib/shop/admin-types";
import { productStatus, stockBarClasses } from "./product-list-utils";

type Props = {
  product: ShopProduct | null;
  onClose: () => void;
  onDuplicate: (product: ShopProduct) => void;
  onArchive: (product: ShopProduct) => void;
};
export function QuickPreviewDrawer({
  product,
  onClose,
  onDuplicate,
  onArchive,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!product) return;
    const dialog = dialogRef.current;
    dialog?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialog) return;
      const targets = [
        ...dialog.querySelectorAll<HTMLElement>(
          'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((target) => !target.hasAttribute("disabled"));
      if (!targets.length) return;
      const first = targets[0];
      const last = targets.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [product, onClose]);
  return (
    <AnimatePresence>
      {product && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-[#0F1B3D]/35"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.dialog
            ref={dialogRef}
            open
            role="dialog"
            aria-modal="true"
            aria-label={`Preview ${product.name}`}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.2 }}
            className="absolute right-0 top-0 m-0 flex h-full w-full max-w-lg flex-col border-0 bg-white p-0 text-left shadow-2xl outline-none"
          >
            <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-4">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close preview"
                className="rounded-lg p-2 text-[#6F7192] hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
              <h2 className="min-w-0 flex-1 truncate text-base font-bold text-[#0F1B3D]">
                {product.name}
              </h2>
              <Link
                href={`/admin/3d-shop/products/${product.id}/edit`}
                className="rounded-lg bg-[#6d28d9] px-3 py-2 text-sm font-semibold text-white"
              >
                Edit
              </Link>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <div className="relative aspect-video overflow-hidden rounded-xl bg-gray-100">
                {product.thumbnail_url ? (
                  <Image
                    src={product.thumbnail_url}
                    alt={product.name}
                    fill
                    sizes="(max-width: 512px) 100vw, 512px"
                    className="object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-sm text-[#6F7192]">
                    No image
                  </div>
                )}
              </div>
              {product.image_urls && product.image_urls.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {product.image_urls.slice(0, 4).map((url) => (
                    <div
                      key={url}
                      className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gray-200"
                    >
                      <Image
                        src={url}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-gray-100 px-2.5 py-1 font-semibold text-[#0F1B3D]">
                  {product.category_name || "Uncategorized"}
                </span>
                <span className="rounded-full bg-violet-50 px-2.5 py-1 font-semibold capitalize text-violet-700">
                  {productStatus(product)}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs text-[#6F7192]">Price</dt>
                  <dd className="mt-1 font-bold text-[#0F1B3D]">
                    ₹{Number(product.base_price ?? 0).toFixed(2)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#6F7192]">SKUs</dt>
                  <dd className="mt-1 font-bold text-[#0F1B3D]">
                    {product.sku_count ?? 0}
                  </dd>
                </div>
              </dl>
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-semibold text-[#0F1B3D]">Stock</span>
                  <span className="text-[#6F7192]">
                    {product.stock_status ?? "No SKUs"}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div
                    className={`h-2 rounded-full ${stockBarClasses(product.stock_status)}`}
                  />
                </div>
              </div>
              {product.tags && product.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-[#0F1B3D]">Tags</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {product.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-[#6F7192]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <h3 className="text-sm font-semibold text-[#0F1B3D]">
                  Description
                </h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#6F7192]">
                  {product.long_description ||
                    product.description ||
                    "No description yet."}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-gray-200 p-4">
              <button
                type="button"
                onClick={() => onDuplicate(product)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-[#0F1B3D]"
              >
                <Copy className="h-4 w-4" />
                Duplicate
              </button>
              <button
                type="button"
                onClick={() => onArchive(product)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700"
              >
                <Archive className="h-4 w-4" />
                Archive
              </button>
              <Link
                href={`/3d-shop/product/${product.slug}`}
                target="_blank"
                className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[#6d28d9] hover:bg-violet-50"
              >
                <ExternalLink className="h-4 w-4" />
                View live
              </Link>
            </div>
          </motion.dialog>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
