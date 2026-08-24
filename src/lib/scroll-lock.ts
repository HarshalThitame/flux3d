let lockCount = 0

/**
 * Reference-counted body scroll lock.
 *
 * Multiple overlays (navbar menu, cart drawer, modals) can be open at once;
 * each acquires the lock on mount/open and releases it on unmount/close.
 * The previous save/restore-per-component approach could leave
 * `body { overflow: hidden }` stuck when two locks interleaved, because each
 * cleanup restored its own snapshot (which was often already 'hidden').
 */
export function lockBodyScroll() {
  if (typeof document === 'undefined') return
  if (lockCount === 0) {
    document.body.style.overflow = 'hidden'
  }
  lockCount += 1
}

export function unlockBodyScroll() {
  if (typeof document === 'undefined' || lockCount === 0) return
  lockCount -= 1
  if (lockCount === 0) {
    document.body.style.overflow = ''
  }
}
