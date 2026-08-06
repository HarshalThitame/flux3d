const SCROLL_TARGET_EVENT = 'flux3d:scroll-target'

interface ScrollToTargetOptions {
  behavior?: ScrollBehavior
  updateHash?: boolean
}

function setHash(id: string) {
  if (!id) return
  try {
    window.history.replaceState(null, '', `#${id}`)
  } catch {
    // history API unavailable (rare); keep scrolling anyway
  }
}

function notifyTarget(id: string) {
  window.dispatchEvent(new CustomEvent(SCROLL_TARGET_EVENT, { detail: { id } }))
}

export function getScrollTargetEventName() {
  return SCROLL_TARGET_EVENT
}

function scrollToElement(id: string, element: HTMLElement, updateHash: boolean, behavior: ScrollBehavior) {
  if (updateHash) setHash(id)
  notifyTarget(id)
  element.scrollIntoView({ behavior, block: 'start' })
}

export function scrollToTarget(id: string, options: ScrollToTargetOptions = {}) {
  if (typeof window === 'undefined' || !id) return

  const { behavior = 'smooth', updateHash = true } = options

  const existing = document.getElementById(id)
  if (existing) {
    scrollToElement(id, existing, updateHash, behavior)
    return
  }

  // Target lives inside a lazy-mounted section that has not rendered yet.
  // Scroll down in chunks to trigger the IntersectionObserver mount, then
  // smooth-scroll once the element appears.
  let attempts = 0
  const maxAttempts = 30

  const tick = () => {
    const element = document.getElementById(id)
    if (element) {
      scrollToElement(id, element, updateHash, behavior)
      return
    }
    if (attempts++ >= maxAttempts) {
      return
    }

    const before = window.scrollY
    const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0)
    const step = Math.max(Math.round(window.innerHeight * 0.75), 400)

    if (window.scrollY >= maxScroll - 8) {
      return
    }

    window.scrollTo({ top: Math.min(window.scrollY + step, maxScroll), behavior: 'auto' })

    if (window.scrollY === before) {
      return
    }

    window.setTimeout(tick, 80)
  }

  // Landing sections defer render until the first user interaction. A click is
  // itself an interaction, so trigger a re-check right after the frame where
  // the deferred shell mounts.
  window.requestAnimationFrame(() => {
    const element = document.getElementById(id)
    if (element) {
      scrollToElement(id, element, updateHash, behavior)
      return
    }
    tick()
  })
}
