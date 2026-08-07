'use client'

import { UploadCloud, FileArchive, LoaderCircle, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { UploadState } from '@/lib/quote/types'

type FileUploadProps = {
  error: string | null
  uploadState: UploadState
  selectedFileName?: string
  onSelectFile: (file: File) => void
}

export default function FileUpload({
  error,
  uploadState,
  selectedFileName,
  onSelectFile,
}: FileUploadProps) {
  const handleFiles = (files: FileList | null) => {
    if (!files?.[0]) {
      return
    }

    onSelectFile(files[0])
  }

  return (
    <div className="rounded-[28px] border border-[#6d28d9]/10 bg-[rgba(109, 40, 217,0.25)] p-5 backdrop-blur-xl">
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          handleFiles(event.dataTransfer.files)
        }}
        className="relative rounded-[24px] border border-dashed border-[#6d28d9]/10 bg-[var(--bg-elevated)] px-5 py-8 text-center shadow-[var(--shadow-sm)]"
      >
        <input
          type="file"
          accept=".stl,.obj,.3mf"
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(event) => handleFiles(event.target.files)}
        />
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#6d28d9]/20 bg-[#6d28d9]/10 text-[#6d28d9]">
          <UploadCloud className="h-6 w-6" />
        </div>
        <div className="font-[var(--font-syne)] text-xl font-bold text-[#070b1d]">
          Upload your 3D model
        </div>
        <p className="mx-auto mt-3 max-w-[460px] text-sm leading-7 text-[#6F7192]">
          Drag and drop STL, OBJ, or 3MF files here, or click to browse. Files are uploaded to Supabase Storage and analyzed for sizing and price estimation.
        </p>
        <div className="mt-4 text-xs uppercase tracking-[0.22em] text-[#8C7DB8]">
          Supported formats: STL, OBJ, 3MF
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {selectedFileName ? (
          <div className="flex items-center gap-3 rounded-2xl border border-[#6d28d9]/10 bg-[var(--bg-muted)] px-4 py-3">
            <div className="rounded-xl bg-[#6d28d9]/10 p-2 text-[#6d28d9]">
              <FileArchive className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-[#070b1d]">{selectedFileName}</div>
              <div className="text-xs text-[#6F7192]">File ready for preview and pricing</div>
            </div>
            {uploadState.status === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-300" />
            ) : null}
          </div>
        ) : null}

        {uploadState.status === 'uploading' ? (
          <div className="rounded-2xl border border-[#6d28d9]/15 bg-[#6d28d9]/5 px-4 py-3">
            <div className="mb-2 flex items-center justify-between text-sm text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Uploading to Supabase Storage
              </span>
              <span>{uploadState.progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-muted)]">
              <div
                className="h-full rounded-full bg-[#6d28d9] transition-all"
                style={{ width: `${uploadState.progress}%` }}
              />
            </div>
          </div>
        ) : null}

        {uploadState.status === 'error' && uploadState.error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-400/20 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{uploadState.error}</span>
          </div>
        ) : null}

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-400/15 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
