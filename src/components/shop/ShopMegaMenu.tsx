"use client";

import Link from "next/link";
import type { ShopPublicCategory } from "@/lib/shop/public-types";
import { ChevronRight } from "lucide-react";

export default function ShopMegaMenu({
  categories,
  onClose,
}: {
  categories: ShopPublicCategory[];
  onClose: () => void;
}) {
  if (!categories || categories.length === 0) return null;

  // Render up to 2 levels deep in the mega menu for a clean UI
  return (
    <div
      className="absolute left-0 top-full mt-2 w-screen max-w-[800px] overflow-hidden rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5"
      style={{ transform: "translateX(-20%)" }}
    >
      <div className="grid grid-cols-3 gap-8">
        {categories.map((category) => (
          <div key={category.id} className="space-y-4">
            <Link
              href={`/3d-shop/category/${category.slug}`}
              onClick={onClose}
              className="group flex items-center gap-2 text-sm font-bold text-gray-900 transition hover:text-[var(--shop-gold)]"
            >
              {category.name}
              <ChevronRight className="h-4 w-4 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
            </Link>
            {category.children && category.children.length > 0 && (
              <ul className="space-y-2">
                {category.children.map((child) => (
                  <li key={child.id}>
                    <Link
                      href={`/3d-shop/category/${child.slug}`}
                      onClick={onClose}
                      className="block text-sm text-gray-500 transition hover:text-[var(--shop-gold)]"
                    >
                      {child.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      <div className="mt-6 border-t border-gray-100 pt-4">
        <Link
          href="/3d-shop"
          onClick={onClose}
          className="text-sm font-semibold text-[var(--shop-gold)] transition hover:text-black"
        >
          View All Products →
        </Link>
      </div>
    </div>
  );
}
