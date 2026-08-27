"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

type LibraryAsset = {
  id: string;
  public_url: string;
  file_name: string | null;
  size_bytes: number | null;
};

export function MediaLibraryModal({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (url: string) => void;
}) {
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const PAGE_SIZE = 24;

  const load = useCallback(
    async (nextOffset: number, query: string, replace: boolean) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(nextOffset),
        });
        if (query.trim()) params.set("search", query.trim());
        const response = await fetch(
          `/api/3d-shop/admin/media?${params.toString()}`,
        );
        const data = (await response.json().catch(() => ({}))) as {
          assets?: LibraryAsset[];
          total?: number;
        };
        if (!response.ok) return;
        setAssets((current) =>
          replace ? (data.assets ?? []) : [...current, ...(data.assets ?? [])],
        );
        setTotal(data.total ?? 0);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void load(0, search, true), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch(value: string) {
    setSearch(value);
    setOffset(0);
    void load(0, value, true);
  }

  return (
    <div
      className="fixed inset-0 z-[95] grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[85dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <h3 className="text-sm font-bold text-[#0F1B3D]">
            Media library {total > 0 ? `(${total})` : ""}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close library"
            className="rounded-lg p-1.5 text-[#6F7192] hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="border-b border-gray-100 px-5 py-3">
          <input
            value={search}
            onChange={(event) => handleSearch(event.target.value)}
            placeholder="Search by file name..."
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#6d28d9]/40"
          />
        </div>
        <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto p-5">
          {!loading && assets.length === 0 && (
            <p className="py-10 text-center text-sm text-[#6F7192]">
              No library images yet — uploads are added here automatically.
            </p>
          )}
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {assets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => onPick(asset.public_url)}
                title={asset.file_name ?? "Attach image"}
                className="group relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-50 transition hover:border-[#6d28d9] hover:shadow-md"
              >
                <Image
                  src={asset.public_url}
                  alt={asset.file_name ?? "Library image"}
                  fill
                  sizes="140px"
                  className="object-cover"
                />
                <span className="absolute inset-x-0 bottom-0 hidden bg-[#0F1B3D]/75 px-1 py-0.5 text-center text-[9px] font-semibold text-white backdrop-blur group-hover:block">
                  Attach
                </span>
              </button>
            ))}
          </div>
          {assets.length < total && (
            <div className="mt-4 text-center">
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  const next = offset + PAGE_SIZE;
                  setOffset(next);
                  void load(next, search, false);
                }}
                className="rounded-xl border border-[#6d28d9]/20 px-4 py-2 text-xs font-semibold text-[#6d28d9] hover:bg-[#6d28d9]/5 disabled:opacity-60"
              >
                {loading ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
