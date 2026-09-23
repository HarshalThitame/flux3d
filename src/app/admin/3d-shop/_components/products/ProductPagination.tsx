import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};
export function ProductPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, index) =>
    Math.min(Math.max(1, page - 2) + index, totalPages),
  ).filter((value, index, list) => list.indexOf(value) === index);
  return (
    <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-[#6F7192]">
        Showing{" "}
        <strong className="text-[#0F1B3D]">
          {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}
        </strong>{" "}
        of <strong className="text-[#0F1B3D]">{total}</strong>
      </p>
      <div className="flex items-center gap-2">
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          aria-label="Products per page"
          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-[#0F1B3D]"
        >
          <option value={12}>12 / page</option>
          <option value={24}>24 / page</option>
          <option value={48}>48 / page</option>
          <option value={96}>96 / page</option>
        </select>
        <button
          type="button"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
          className="rounded-lg border border-gray-200 bg-white p-1.5 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages[0] > 1 && (
          <>
            <button
              type="button"
              onClick={() => onPageChange(1)}
              className="rounded-lg px-2 py-1 text-sm"
            >
              1
            </button>
            <span className="text-[#6F7192]">…</span>
          </>
        )}
        {pages.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-current={page === item ? "page" : undefined}
            className={`rounded-lg px-2.5 py-1 text-sm font-semibold ${page === item ? "bg-[#6d28d9] text-white" : "text-[#0F1B3D] hover:bg-white"}`}
          >
            {item}
          </button>
        ))}
        {pages.at(-1)! < totalPages && (
          <>
            <span className="text-[#6F7192]">…</span>
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              className="rounded-lg px-2 py-1 text-sm"
            >
              {totalPages}
            </button>
          </>
        )}
        <button
          type="button"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
          className="rounded-lg border border-gray-200 bg-white p-1.5 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
