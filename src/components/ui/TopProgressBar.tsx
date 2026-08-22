'use client'

import { useEffect, useState } from 'react'
import { useLoadingStore } from '@/stores/loadingStore'

const EXIT_MS = 320

export default function TopProgressBar() {
  const isLoading = useLoadingStore((state) => state.isLoading)

  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isLoading) {
      setVisible(true)
      setExiting(false)
    } else if (visible) {
      setExiting(true)
      const t = setTimeout(() => setVisible(false), EXIT_MS)
      return () => clearTimeout(t)
    }
  }, [isLoading, visible])
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!visible) {
    return null
  }

  return (
    <div
      className={`top-progress-bar ${exiting ? 'top-progress-bar-exit' : 'top-progress-bar-enter'}`}
      role="progressbar"
      aria-label="Loading"
      aria-busy={!exiting}
    >
      <div className="top-progress-bar-track">
        <div className="top-progress-bar-fill" />
      </div>
    </div>
  )
}