import { Archive, Download, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

type Props = {
  count: number;
  busy: boolean;
  onActivate: () => void;
  onDraft: () => void;
  onArchive: () => void;
  onExport: () => void;
  onClear: () => void;
};
export function BulkActionBar({
  count,
  busy,
  onActivate,
  onDraft,
  onArchive,
  onExport,
  onClear,
}: Props) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed bottom-5 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-2xl border border-[#6d28d9]/20 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur-md"
        >
          <span className="mr-1 text-sm font-semibold text-[#0F1B3D]">
            {count} selected
          </span>
          <span className="hidden h-5 w-px bg-gray-200 sm:block" />
          <button
            type="button"
            disabled={busy}
            onClick={onActivate}
            className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
          >
            Activate
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onDraft}
            className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-[#0F1B3D] hover:bg-gray-100 disabled:opacity-50"
          >
            Draft
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onArchive}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
          >
            <Archive className="h-3.5 w-3.5" />
            Archive
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onExport}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-[#6d28d9] hover:bg-violet-50 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClear}
            aria-label="Clear selection"
            className="ml-1 rounded-lg p-1.5 text-[#6F7192] hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
