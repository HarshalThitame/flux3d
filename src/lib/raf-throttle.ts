export type RafThrottledCallback = (() => void) & {
  cancel: () => void
}

export function createRafThrottledCallback(callback: () => void): RafThrottledCallback {
  let frame = 0

  const throttled = (() => {
    if (frame) return

    frame = window.requestAnimationFrame(() => {
      frame = 0
      callback()
    })
  }) as RafThrottledCallback

  throttled.cancel = () => {
    if (!frame) return
    window.cancelAnimationFrame(frame)
    frame = 0
  }

  return throttled
}
