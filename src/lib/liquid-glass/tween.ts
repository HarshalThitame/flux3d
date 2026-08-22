export type EaseFunction = (linearProgress: number) => number

const easeOutPower =
  (exponent: number): EaseFunction =>
  (t) =>
    1 - Math.pow(1 - t, exponent)

export const easeLinear: EaseFunction = (t) => t
export const easeOutPower1 = easeOutPower(2)
export const easeOutPower2 = easeOutPower(3)
export const easeOutPower3 = easeOutPower(4)
export const easeOutPower4 = easeOutPower(5)
export const easeInOutPower2: EaseFunction = (t) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
export const easeInOutExpo: EaseFunction = (t) => {
  if (t <= 0) return 0
  if (t >= 1) return 1
  return t < 0.5
    ? Math.pow(2, 20 * t - 10) / 2
    : (2 - Math.pow(2, -20 * t + 10)) / 2
}

export type Tweenable = Record<string, number>
export type TweenTarget = Tweenable | number[]

export interface TweenOptions {
  duration: number
  delay?: number
  ease?: EaseFunction
  onUpdate?: () => void
  onComplete?: () => void
}

export interface TweenHandle {
  kill(): void
}

interface ActiveTween {
  target: Tweenable
  keys: string[]
  from: Record<string, number>
  to: Record<string, number>
  dueAt: number
  startedAt: number | null
  duration: number
  ease: EaseFunction
  onUpdate?: () => void
  onComplete?: () => void
  killed: boolean
}

interface ScheduledCall {
  dueAt: number
  fn: () => void
  killed: boolean
}

/**
 * Minimal deterministic tween engine driven externally by a rAF loop.
 * Replaces the GSAP subset used by the liquid glass carousel
 * (`gsap.to` with numeric props + delays, `killTweensOf`, overwrite).
 * Delays and durations are in seconds.
 */
export class TweenEngine {
  private clock = 0
  private active: ActiveTween[] = []
  private calls: ScheduledCall[] = []

  call(delaySeconds: number, fn: () => void): TweenHandle {
    const scheduled: ScheduledCall = {
      dueAt: this.clock + Math.max(delaySeconds, 0),
      fn,
      killed: false,
    }
    this.calls.push(scheduled)
    return {
      kill: () => {
        scheduled.killed = true
      },
    }
  }

  to(target: TweenTarget, props: Record<string, number>, options: TweenOptions): TweenHandle {
    const values = target as Tweenable
    const keys = Object.keys(props)
    if (keys.length === 0 || (options.duration <= 0 && !options.delay)) {
      for (const key of keys) values[key] = props[key]
      options.onUpdate?.()
      options.onComplete?.()
      return { kill: () => {} }
    }

    this.killTweensOf(target as Tweenable, keys)

    const tween: ActiveTween = {
      target: values,
      keys,
      from: {},
      to: { ...props },
      dueAt: this.clock + Math.max(options.delay ?? 0, 0),
      startedAt: null,
      duration: Math.max(options.duration, 1 / 1000),
      ease: options.ease ?? easeOutPower2,
      onUpdate: options.onUpdate,
      onComplete: options.onComplete,
      killed: false,
    }
    this.active.push(tween)

    return {
      kill: () => {
        tween.killed = true
      },
    }
  }

  killTweensOf(target: Tweenable | number[], keys?: string[]): void {
    this.active = this.active.filter((tween) => {
      const conflicts =
        tween.target === (target as Tweenable) &&
        (keys === undefined || tween.keys.some((key) => keys.includes(key)))
      if (conflicts) {
        tween.killed = true
        return false
      }
      return !tween.killed
    })
  }

  update(deltaSeconds: number): void {
    this.clock += Math.max(deltaSeconds, 0)

    let callIndex = 0
    while (callIndex < this.calls.length) {
      const scheduled = this.calls[callIndex]
      if (scheduled.killed) {
        this.calls.splice(callIndex, 1)
        continue
      }
      if (this.clock >= scheduled.dueAt) {
        this.calls.splice(callIndex, 1)
        scheduled.fn()
        continue
      }
      callIndex += 1
    }

    let i = 0
    while (i < this.active.length) {
      const tween = this.active[i]
      if (tween.killed) {
        this.active.splice(i, 1)
        continue
      }
      if (this.clock < tween.dueAt) {
        i += 1
        continue
      }
      if (tween.startedAt === null) {
        tween.startedAt = tween.dueAt
        for (const key of tween.keys) tween.from[key] = tween.target[key]
      }

      const linear = Math.min((this.clock - tween.dueAt) / tween.duration, 1)
      const eased = tween.ease(linear)
      for (const key of tween.keys) {
        tween.target[key] = tween.from[key] + (tween.to[key] - tween.from[key]) * eased
      }
      tween.onUpdate?.()

      if (linear >= 1) {
        this.active.splice(i, 1)
        tween.onComplete?.()
        continue
      }
      i += 1
    }
  }

  clear(): void {
    this.active = []
    this.calls = []
  }

  get activeCount(): number {
    return this.active.length + this.calls.length
  }
}
