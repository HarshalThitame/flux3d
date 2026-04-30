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
      className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.015] px-6 py-14 text-center"
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
        <Inbox className="h-6 w-6 text-[#5a6580]" />
      </div>
      <div className="text-lg font-semibold text-white">{title}</div>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#7a82a0]">{description}</p>
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#FF5C1A] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          {ctaLabel}
        </Link>
      )}
    </motion.div>
  )
}
