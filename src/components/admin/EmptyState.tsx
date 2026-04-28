import Link from 'next/link'

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
    <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.025] p-10 text-center">
      <div className="text-xl font-semibold text-white">{title}</div>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[#9aa3c3]">{description}</p>
      {ctaLabel && ctaHref ? (
        <Link
          href={ctaHref}
          className="mt-6 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-medium text-[#0a1122]"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  )
}
