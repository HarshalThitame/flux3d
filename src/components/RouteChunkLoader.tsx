'use client'

import type { CSSProperties } from 'react'

export default function RouteChunkLoader({
  className = '',
  minHeight = '60vh',
  label = 'Loading section',
}: {
  className?: string
  minHeight?: string
  label?: string
}) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ minHeight } as CSSProperties}
      aria-busy="true"
      aria-label={label}
    >
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-current border-t-transparent opacity-50" />
    </div>
  )
}
