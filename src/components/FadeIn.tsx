'use client'

import type { CSSProperties, ReactNode } from 'react'

type FadeInProps = {
  children: ReactNode
  className?: string
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'
}

const OFFSETS = {
  up: { x: '0px', y: '24px' },
  down: { x: '0px', y: '-24px' },
  left: { x: '24px', y: '0px' },
  right: { x: '-24px', y: '0px' },
  none: { x: '0px', y: '0px' },
}

export default function FadeIn({
  children,
  className,
  delay = 0,
  direction = 'up',
}: FadeInProps) {
  const offset = OFFSETS[direction]

  return (
    <div
      className={`fade-in-section ${className ?? ''}`}
      style={{
        '--fade-delay': `${delay}s`,
        '--fade-x': offset.x,
        '--fade-y': offset.y,
      } as CSSProperties}
    >
      {children}
    </div>
  )
}
