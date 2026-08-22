import { describe, expect, it, vi } from 'vitest'
import {
  TweenEngine,
  easeInOutExpo,
  easeInOutPower2,
  easeOutPower2,
  easeOutPower3,
} from '../tween'

describe('TweenEngine', () => {
  it('animates a numeric property to its target value', () => {
    const engine = new TweenEngine()
    const state = { value: 0 }

    engine.to(state, { value: 10 }, { duration: 1, ease: easeOutPower2 })
    engine.update(0.5)
    expect(state.value).toBeCloseTo(10 * 0.875, 5)
    engine.update(0.5)
    expect(state.value).toBe(10)
  })

  it('respects delay before starting', () => {
    const engine = new TweenEngine()
    const state = { value: 1 }

    engine.to(state, { value: 2 }, { duration: 1, delay: 2 })
    engine.update(1.9)
    expect(state.value).toBe(1)
    engine.update(0.1)
    expect(state.value).toBe(1)
    engine.update(1)
    expect(state.value).toBeGreaterThan(1)
  })

  it('fires onUpdate each frame and onComplete exactly once', () => {
    const engine = new TweenEngine()
    const state = { value: 0 }
    const onUpdate = vi.fn()
    const onComplete = vi.fn()

    engine.to(state, { value: 4 }, { duration: 1, onUpdate, onComplete })
    engine.update(0.25)
    engine.update(0.25)
    engine.update(0.25)
    engine.update(0.25)
    engine.update(0.25)

    expect(onUpdate).toHaveBeenCalledTimes(4)
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(state.value).toBe(4)
  })

  it('killTweensOf stops matching tweens without calling onComplete', () => {
    const engine = new TweenEngine()
    const state = { a: 0, b: 0 }
    const onCompleteA = vi.fn()

    engine.to(state, { a: 10 }, { duration: 1, onComplete: onCompleteA })
    engine.to(state, { b: 20 }, { duration: 1 })

    engine.killTweensOf(state, ['a'])
    engine.update(2)

    expect(state.a).toBe(0)
    expect(state.b).toBe(20)
    expect(onCompleteA).not.toHaveBeenCalled()
  })

  it('handle kill prevents further progress', () => {
    const engine = new TweenEngine()
    const state = { value: 0 }
    const handle = engine.to(state, { value: 10 }, { duration: 1 })

    handle.kill()
    engine.update(5)

    expect(state.value).toBe(0)
    expect(engine.activeCount).toBe(0)
  })

  it('call() schedules callbacks at absolute delays in order', () => {
    const engine = new TweenEngine()
    const order: string[] = []

    engine.call(1, () => order.push('first'))
    engine.call(2, () => order.push('second'))
    engine.call(1.5, () => order.push('middle'))

    engine.update(1)
    expect(order).toEqual(['first'])
    engine.update(0.5)
    expect(order).toEqual(['first', 'middle'])
    engine.update(0.5)
    expect(order).toEqual(['first', 'middle', 'second'])
  })

  it('clear() removes everything', () => {
    const engine = new TweenEngine()
    const state = { value: 0 }

    engine.to(state, { value: 10 }, { duration: 1 })
    engine.call(1, () => {})
    engine.clear()
    engine.update(10)

    expect(engine.activeCount).toBe(0)
    expect(state.value).toBe(0)
  })

  it('applies zero-duration changes immediately when no delay is set', () => {
    const engine = new TweenEngine()
    const state = { value: 0 }

    engine.to(state, { value: 7 }, { duration: 0 })
    expect(state.value).toBe(7)
  })

  it('easings map 0 to 0 and 1 to 1', () => {
    for (const ease of [easeOutPower3, easeInOutPower2, easeInOutExpo]) {
      expect(ease(0)).toBe(0)
      expect(ease(1)).toBe(1)
      expect(ease(0.5)).toBeGreaterThanOrEqual(0)
      expect(ease(0.5)).toBeLessThanOrEqual(1)
    }
  })
})
