"use client";

import { useEffect, useRef, useState } from "react";
import type { ShopCategoryShelf } from "@/lib/shop/home-shelves";

type ShelfNavItem = Pick<
  ShopCategoryShelf,
  "id" | "anchorId" | "name" | "totalCount"
>;

export default function HomeCategoryNav({
  shelves,
}: {
  shelves: ShelfNavItem[];
}) {
  const [activeId, setActiveId] = useState(shelves[0]?.anchorId ?? "");
  const linkRefs = useRef(new Map<string, HTMLAnchorElement>());

  useEffect(() => {
    const sections = shelves
      .map((shelf) => document.getElementById(shelf.anchorId))
      .filter((section): section is HTMLElement => Boolean(section));
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "-28% 0px -58% 0px", threshold: [0, 0.15, 0.4] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [shelves]);

  useEffect(() => {
    const activeLink = linkRefs.current.get(activeId);
    if (!activeLink) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    activeLink.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeId]);

  if (shelves.length === 0) return null;

  return (
    <nav
      aria-label="Shop categories"
      className="sticky top-20 z-30 -mx-4 border-y border-[var(--shop-border-light)] bg-[var(--shop-bg-base)]/95 px-4 py-3 shadow-[0_10px_30px_rgba(28,25,23,0.05)] backdrop-blur-xl sm:-mx-6 sm:px-6 md:-mx-10 md:px-10 lg:-mx-12 lg:px-12"
    >
      <div className="mx-auto flex max-w-[1280px] gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {shelves.map((shelf) => {
          const active = activeId === shelf.anchorId;
          return (
            <a
              key={shelf.id}
              ref={(node) => {
                if (node) linkRefs.current.set(shelf.anchorId, node);
                else linkRefs.current.delete(shelf.anchorId);
              }}
              href={`#${shelf.anchorId}`}
              aria-current={active ? "location" : undefined}
              onClick={() => setActiveId(shelf.anchorId)}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shop-gold)] focus-visible:ring-offset-2 motion-reduce:transition-none ${
                active
                  ? "border-[var(--shop-text-primary)] bg-[var(--shop-text-primary)] text-white shadow-[var(--shop-shadow-sm)]"
                  : "border-[var(--shop-border-light)] bg-white text-[var(--shop-text-secondary)] hover:border-[var(--shop-border-gold)] hover:text-[var(--shop-text-primary)]"
              }`}
            >
              <span>{shelf.name}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] ${
                  active
                    ? "bg-white/15 text-white"
                    : "bg-[var(--shop-bg-muted)] text-[var(--shop-text-muted)]"
                }`}
              >
                {shelf.totalCount}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
