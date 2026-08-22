'use client'

import { useSyncExternalStore } from 'react'

const noopSubscribe = () => () => {}

/**
 * Returns true only after the component has mounted on the client.
 *
 * Hydration-safe mount detection: the server snapshot is `false` and the
 * first client (hydration) render also returns `false`, so markup stays
 * identical across the SSR/hydration boundary. Unlike a
 * setState-in-effect flag this does not cause cascading renders.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  )
}
