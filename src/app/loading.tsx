export default function Loading() {
  return (
    <div
      className="loading-screen fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-[#f8f6f2] via-[#faf9f7] to-[#ede9fe]"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <div className="loading-printer" aria-hidden="true">
        <div className="loading-printer-frame">
          <div className="loading-printer-rail" />
          <div className="loading-printer-side loading-printer-side-left" />
          <div className="loading-printer-side loading-printer-side-right" />

          <div className="loading-printer-nozzle">
            <div className="loading-printer-head" />
            <div className="loading-printer-tip" />
            <div className="loading-printer-filament" />
          </div>

          <div className="loading-printed-object">
            <span className="loading-layer loading-layer-1" />
            <span className="loading-layer loading-layer-2" />
            <span className="loading-layer loading-layer-3" />
            <span className="loading-layer loading-layer-4" />
          </div>

          <div className="loading-printer-plate" />
        </div>
      </div>

      <div className="loading-brand mt-8 flex items-center gap-2">
        <span className="text-lg font-semibold text-[#0F1B3D]">flux</span>
        <span className="text-lg font-semibold text-[#5b21b6]">3d</span>
      </div>
      <p className="loading-message mt-2 text-sm font-medium text-[#4b4b4b]">3D printing your page...</p>
      <div className="mt-5 h-1 w-48 overflow-hidden rounded-full bg-[#e8e4df]">
        <div className="loading-progress h-full rounded-full bg-gradient-to-r from-violet-600 to-purple-400" />
      </div>
    </div>
  )
}
