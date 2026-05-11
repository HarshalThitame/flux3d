import { Inbox } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function EmptyState({
  title,
  description,
  ctaLabel,
  ctaHref,
}: {
  title: string
  description: string
  ctaLabel?: string
  ctaHref?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-14 text-center"
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50">
        <Inbox className="h-6 w-6 text-[#6F7192]" />
      </div>
      <div className="text-lg font-semibold text-[#0F1B3D]">{title}</div>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#6F7192]">{description}</p>
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#7C5CFF] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          {ctaLabel}
        </Link>
      )}
    </motion.div>
  )
}
