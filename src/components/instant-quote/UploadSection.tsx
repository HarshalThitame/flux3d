'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, FileArchive, LoaderCircle, UploadCloud } from 'lucide-react'
import Link from 'next/link'
import type { UploadState } from '@/lib/quote/types'

type UploadSectionProps = {
  error: string | null
  isSignedIn: boolean
  selectedFileName?: string
  uploadState: UploadState
  onSelectFile: (file: File) => void
}

export default function UploadSection({
  error,
  isSignedIn,
  selectedFileName,
  uploadState,
  onSelectFile,
}: UploadSectionProps) {
  const handleFiles = (files: FileList | null) => {
    if (!files?.[0]) {
      return
    }

    onSelectFile(files[0])
  }

  return (
    <motion.section
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 220, damping: 20 }}
      className="group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,34,0.96),rgba(7,11,22,0.92))] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.28)] transition-all duration-300 hover:border-[#FF5C1A]/25 hover:shadow-[0_24px_90px_rgba(255,92,26,0.08)]"
    >
      <motion.div
        aria-hidden
        animate={{ x: [0, 16, 0], y: [0, -12, 0], opacity: [0.28, 0.42, 0.28] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[#FF5C1A]/10 blur-3xl"
      />
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-[var(--font-syne)] text-2xl font-bold text-white">
            Upload your file
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#97a1c2]">
            Drop in your STL, OBJ, or 3MF file to instantly begin a polished quote workflow built for speed, accuracy, and production-ready decisions.
          </p>
        </div>
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          className="rounded-2xl border border-[#FF5C1A]/20 bg-[#FF5C1A]/10 p-3 text-[#FF9A72]"
        >
          <UploadCloud className="h-5 w-5" />
        </motion.div>
      </div>

      <motion.div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          handleFiles(event.dataTransfer.files)
        }}
        className="relative flex min-h-[280px] flex-1 items-center justify-center rounded-[24px] border border-dashed border-white/12 bg-[radial-gradient(circle_at_top,rgba(255,92,26,0.14),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6 text-center transition-colors duration-300 group-hover:border-[#FF5C1A]/20"
        whileHover={{ scale: 1.01 }}
        transition={{ type: 'spring', stiffness: 240, damping: 22 }}
      >
        <input
          type="file"
          accept=".stl,.obj,.3mf"
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(event) => handleFiles(event.target.files)}
        />
        <div className="max-w-md">
          <motion.div
            animate={{ scale: [1, 1.04, 1], boxShadow: ['0 0 28px rgba(255,92,26,0.18)', '0 0 42px rgba(255,92,26,0.24)', '0 0 28px rgba(255,92,26,0.18)'] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] border border-[#FF5C1A]/25 bg-[#FF5C1A]/12 text-[#FF9A72] shadow-[0_0_28px_rgba(255,92,26,0.18)]"
          >
            <UploadCloud className="h-7 w-7" />
          </motion.div>
          <div className="font-[var(--font-syne)] text-2xl font-semibold text-white">
            Drag and drop your model
          </div>
          <p className="mt-3 text-sm leading-7 text-[#97a1c2]">
            Click to browse or drop your printable file here. From the first upload, the experience is designed to feel fast, premium, and effortless.
          </p>
          <div className="mt-4 inline-flex rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-[#7a82a0]">
            STL · OBJ · 3MF
          </div>
        </div>
      </motion.div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <motion.div whileHover={{ y: -2 }} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#7a82a0]">File Input</div>
          <div className="mt-2 flex items-center gap-3">
            <div className="rounded-xl bg-white/5 p-2 text-[#9ca9d5]">
              <FileArchive className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-white">
                {selectedFileName ?? 'No file selected yet'}
              </div>
              <div className="text-xs text-[#7a82a0]">
                {selectedFileName ? 'Your model is ready for live preview and instant pricing' : 'Waiting for your first file'}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#7a82a0]">Upload Progress</div>
          {uploadState.status === 'uploading' ? (
            <div className="mt-3">
              <div className="mb-2 flex items-center justify-between text-sm text-[#f4d0bf]">
                <span className="inline-flex items-center gap-2">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Processing model
                </span>
                <span>{uploadState.progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-[#FF5C1A] transition-all duration-300"
                  style={{ width: `${uploadState.progress}%` }}
                />
              </div>
            </div>
          ) : uploadState.status === 'success' ? (
            <div className="mt-3 inline-flex items-center gap-2 text-sm text-emerald-200">
              <CheckCircle2 className="h-4 w-4" />
              {isSignedIn ? 'Uploaded successfully and connected to your workspace' : 'Loaded instantly for local preview'}
            </div>
          ) : (
            <div className="mt-3 text-sm text-[#97a1c2]">Your upload progress will appear here in real time.</div>
          )}
        </motion.div>
      </div>

      {!isSignedIn ? (
        <div className="mt-4 rounded-2xl border border-sky-400/15 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">
          Explore the experience without logging in. <Link href="/login?next=%2Finstant-quote" className="font-medium text-white underline underline-offset-4">Sign in</Link> when you want synced uploads, saved quotes, and a smoother ordering flow.
        </div>
      ) : null}

      {uploadState.status === 'error' && uploadState.error ? (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-400/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{uploadState.error}</span>
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-400/15 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
    </motion.section>
  )
}
