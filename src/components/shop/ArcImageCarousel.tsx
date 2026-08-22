'use client'

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  startTransition,
} from 'react'
import Image from 'next/image'
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type AnimationPlaybackControls,
} from 'framer-motion'

export interface ArcCarouselItem {
  id: string
  src: string | null
  alt?: string
  title: string
  subheadline?: string
}

export interface ArcImageCarouselHandle {
  next(): void
  prev(): void
  goTo(index: number): void
}

export interface ArcImageCarouselProps {
  items: ArcCarouselItem[]
  onSelectItemAction?: (index: number) => void
  onActiveIndexChangeAction?: (index: number) => void
  background?: string
  titleColor?: string
  subheadlineColor?: string
  cardRadius?: string
  cardShadow?: string
  activeScale?: number
  inactiveScale?: number
  inactiveOpacity?: number
  arcTopPadding?: number
  className?: string
  ariaLabel?: string
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function wrapAngleDeg(a: number) {
  let r = a % 360
  if (r < -180) r += 360
  if (r > 180) r -= 360
  return r
}

function shortestAngleDistanceDeg(a: number, b: number) {
  return Math.abs(wrapAngleDeg(a - b))
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

function softEmphasisFromDistance(distDeg: number, maxDeg: number) {
  const t = clamp(distDeg / maxDeg, 0, 1)
  return 1 - easeOutCubic(t)
}

function pickArcParams(width: number) {
  if (width <= 480) return { spanDeg: 155, radiusFactor: 0.88 }
  if (width <= 768) return { spanDeg: 205, radiusFactor: 0.78 }
  return { spanDeg: 245, radiusFactor: 0.72 }
}

function cardBaseWidth(width: number) {
  if (width <= 480) return clamp(width * 0.52, 160, 240)
  if (width <= 768) return clamp(width * 0.34, 180, 260)
  return clamp(width * 0.24, 190, 280)
}

const FOCAL_DEG = -90

function getActiveIndex(rotationDeg: number, baseAngles: number[]) {
  let best = 0
  let bestD = Number.POSITIVE_INFINITY
  for (let i = 0; i < baseAngles.length; i++) {
    const d = shortestAngleDistanceDeg(baseAngles[i] + rotationDeg, FOCAL_DEG)
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}

function rotationToBringIndexToFocal(index: number, baseAngles: number[]) {
  return FOCAL_DEG - (baseAngles[index] ?? 0)
}

interface ArcItemProps {
  item: ArcCarouselItem
  index: number
  rotation: ReturnType<typeof useMotionValue<number>>
  baseAngles: number[]
  width: number
  radius: number
  centerY: number
  cardW: number
  cardH: number
  cardRadius: string
  cardShadow: string
  activeScale: number
  inactiveScale: number
  inactiveOpacity: number
  isFocused: boolean
  onClick: () => void
}

function ArcItem(props: ArcItemProps) {
  const {
    item,
    index,
    rotation,
    baseAngles,
    width,
    radius,
    centerY,
    cardW,
    cardH,
    cardRadius,
    cardShadow,
    activeScale,
    inactiveScale,
    inactiveOpacity,
    isFocused,
    onClick,
  } = props

  const angleDeg = baseAngles[index] ?? FOCAL_DEG

  const x = useCallback(
    (rot: number) => {
      const theta = (Math.PI / 180) * (angleDeg + rot)
      return width / 2 + radius * Math.cos(theta) - cardW / 2
    },
    [angleDeg, width, radius, cardW]
  )

  const y = useCallback(
    (rot: number) => {
      const theta = (Math.PI / 180) * (angleDeg + rot)
      return centerY + radius * Math.sin(theta) - cardH / 2
    },
    [angleDeg, radius, centerY, cardH]
  )

  const rotateZ = useCallback(
    (rot: number) => angleDeg + rot + 90,
    [angleDeg]
  )

  const scale = useCallback(
    (rot: number) => {
      const dist = shortestAngleDistanceDeg(angleDeg + rot, FOCAL_DEG)
      return lerp(inactiveScale, activeScale, softEmphasisFromDistance(dist, 60))
    },
    [angleDeg, inactiveScale, activeScale]
  )

  const opacity = useCallback(
    (rot: number) => {
      const dist = shortestAngleDistanceDeg(angleDeg + rot, FOCAL_DEG)
      return lerp(inactiveOpacity, 1, softEmphasisFromDistance(dist, 80))
    },
    [angleDeg, inactiveOpacity]
  )

  const lift = useCallback(
    (rot: number) => {
      const dist = shortestAngleDistanceDeg(angleDeg + rot, FOCAL_DEG)
      return -18 * softEmphasisFromDistance(dist, 55)
    },
    [angleDeg]
  )

  const zIndex = useCallback(
    (rot: number) => {
      const dist = shortestAngleDistanceDeg(angleDeg + rot, FOCAL_DEG)
      return Math.round(10 + softEmphasisFromDistance(dist, 80) * 1000)
    },
    [angleDeg]
  )

  const xMv = useTransform(rotation, x)
  const yMv = useTransform(rotation, y)
  const rMv = useTransform(rotation, rotateZ)
  const sMv = useTransform(rotation, scale)
  const oMv = useTransform(rotation, opacity)
  const liftMv = useTransform(rotation, lift)
  const zMv = useTransform(rotation, zIndex)

  return (
    <motion.button
      type="button"
      aria-label={`Select ${item.title}`}
      aria-current={isFocused ? 'true' : undefined}
      onClick={onClick}
      onPointerDown={(event) => event.stopPropagation()}
      style={{
        position: 'absolute',
        left: xMv,
        top: yMv,
        width: cardW,
        height: cardH,
        border: 'none',
        padding: 0,
        margin: 0,
        background: 'transparent',
        cursor: 'pointer',
        zIndex: zMv,
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
        transformOrigin: '50% 50%',
        scale: sMv,
        rotate: rMv,
        opacity: oMv,
        y: liftMv,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: cardRadius,
          overflow: 'hidden',
          boxShadow: cardShadow,
          background: '#efe9dc',
          position: 'relative',
        }}
      >
        {item.src ? (
          <Image
            src={item.src}
            alt={item.alt ?? item.title}
            fill
            draggable={false}
            sizes={`${Math.round(cardW)}px`}
            style={{ objectFit: 'cover' }}
          />
        ) : null}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to top, rgba(23,19,16,0.28) 0%, rgba(23,19,16,0.12) 40%, rgba(23,19,16,0) 70%)',
            pointerEvents: 'none',
          }}
        />
      </div>
    </motion.button>
  )
}

const ArcImageCarousel = forwardRef<ArcImageCarouselHandle, ArcImageCarouselProps>(
  function ArcImageCarousel(props, ref) {
    const {
      items,
      onSelectItemAction,
      onActiveIndexChangeAction,
      background = 'transparent',
      titleColor = '#171310',
      subheadlineColor = '#8a7a55',
      cardRadius = '18px',
      cardShadow = '0 24px 48px -12px rgba(23,19,16,0.22)',
      activeScale = 1.18,
      inactiveScale = 0.86,
      inactiveOpacity = 0.62,
      arcTopPadding = 140,
      className,
      ariaLabel,
    } = props

    const reducedMotion = useReducedMotion()
    const rootRef = useRef<HTMLDivElement>(null)
    const [size, setSize] = useState({ width: 900, height: 620 })

    useEffect(() => {
      const el = rootRef.current
      if (!el || typeof ResizeObserver === 'undefined') return
      const observer = new ResizeObserver((entries) => {
        const rect = entries[0]?.contentRect
        if (!rect) return
        startTransition(() =>
          setSize({ width: Math.max(1, rect.width), height: Math.max(1, rect.height) })
        )
      })
      observer.observe(el)
      return () => observer.disconnect()
    }, [])

    const { spanDeg, radiusFactor } = useMemo(() => pickArcParams(size.width), [size.width])

    const baseAngles = useMemo(() => {
      const total = items.length
      if (total <= 1) return [FOCAL_DEG]
      const step = spanDeg / (total - 1)
      const mid = (total - 1) / 2
      return Array.from({ length: total }, (_, i) => FOCAL_DEG + (i - mid) * step)
    }, [items.length, spanDeg])

    const radius = useMemo(() => clamp(size.width * radiusFactor, 220, 720), [size.width, radiusFactor])
    const centerY = arcTopPadding + radius

    const cardW = useMemo(() => cardBaseWidth(size.width), [size.width])
    const cardH = Math.round(cardW * 1.25)

    const rotation = useMotionValue(0)
    const [activeIndex, setActiveIndex] = useState(() => getActiveIndex(rotation.get(), baseAngles))
    const activeIndexRef = useRef(activeIndex)

    useEffect(() => {
      const idx = clamp(activeIndex, 0, Math.max(0, items.length - 1))
      const target = rotationToBringIndexToFocal(idx, baseAngles)
      rotation.set(target)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [baseAngles])

    useEffect(() => {
      activeIndexRef.current = activeIndex
      onActiveIndexChangeAction?.(activeIndex)
    }, [activeIndex, onActiveIndexChangeAction])

    useMotionValueEvent(rotation, 'change', (value) => {
      const next = getActiveIndex(value, baseAngles)
      if (next !== activeIndexRef.current) {
        startTransition(() => setActiveIndex(next))
      }
    })

    const animRef = useRef<AnimationPlaybackControls | null>(null)
    const wheelSnapTimeoutRef = useRef<number | null>(null)

    const animateRotationTo = useCallback(
      (target: number) => {
        animRef.current?.stop()
        animRef.current = null
        if (reducedMotion) {
          rotation.set(target)
          return
        }
        animRef.current = animate(rotation, target, {
          type: 'spring',
          stiffness: 520,
          damping: 52,
          mass: 1,
        })
      },
      [reducedMotion, rotation]
    )

    const snapToNearest = useCallback(() => {
      if (items.length <= 1) return
      const idx = getActiveIndex(rotation.get(), baseAngles)
      animateRotationTo(rotationToBringIndexToFocal(idx, baseAngles))
    }, [items.length, rotation, baseAngles, animateRotationTo])

    const goToIndex = useCallback(
      (idx: number) => {
        if (items.length <= 1) return
        const next = clamp(idx, 0, items.length - 1)
        animateRotationTo(rotationToBringIndexToFocal(next, baseAngles))
      },
      [items.length, baseAngles, animateRotationTo]
    )

    useImperativeHandle(
      ref,
      () => ({
        next: () => goToIndex(activeIndexRef.current + 1),
        prev: () => goToIndex(activeIndexRef.current - 1),
        goTo: goToIndex,
      }),
      [goToIndex]
    )

    const pointerIdRef = useRef<number | null>(null)
    const isDraggingRef = useRef(false)
    const dragStartXRef = useRef(0)
    const dragStartRotRef = useRef(0)

    const onPointerDown = useCallback(
      (event: React.PointerEvent<HTMLDivElement>) => {
        if (items.length <= 1) return
        pointerIdRef.current = event.pointerId
        isDraggingRef.current = true
        dragStartXRef.current = event.clientX
        dragStartRotRef.current = rotation.get()
        animRef.current?.stop()
        animRef.current = null
        event.currentTarget.setPointerCapture(event.pointerId)
      },
      [items.length, rotation]
    )

    const onPointerMove = useCallback(
      (event: React.PointerEvent<HTMLDivElement>) => {
        if (!isDraggingRef.current) return
        if (pointerIdRef.current !== event.pointerId) return
        const dx = event.clientX - dragStartXRef.current
        rotation.set(dragStartRotRef.current + dx * 0.108)
      },
      [rotation]
    )

    const endPointer = useCallback(
      (event: React.PointerEvent<HTMLDivElement>) => {
        if (pointerIdRef.current !== event.pointerId) return
        isDraggingRef.current = false
        pointerIdRef.current = null
        try {
          event.currentTarget.releasePointerCapture(event.pointerId)
        } catch {}
        snapToNearest()
      },
      [snapToNearest]
    )

    const snapToNearestRef = useRef(snapToNearest)
    const rotationValueRef = useRef(rotation)

    useEffect(() => {
      snapToNearestRef.current = snapToNearest
      rotationValueRef.current = rotation
    })

    useEffect(() => {
      const el = rootRef.current
      if (!el) return
      const handler = (event: WheelEvent) => {
        if (items.length <= 1) return
        event.preventDefault()
        const delta =
          Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
        rotationValueRef.current.set(rotationValueRef.current.get() + delta * 0.06)
        if (wheelSnapTimeoutRef.current != null) window.clearTimeout(wheelSnapTimeoutRef.current)
        wheelSnapTimeoutRef.current = window.setTimeout(() => {
          snapToNearestRef.current()
        }, 140)
      }
      el.addEventListener('wheel', handler, { passive: false })
      return () => {
        el.removeEventListener('wheel', handler)
        if (wheelSnapTimeoutRef.current != null) window.clearTimeout(wheelSnapTimeoutRef.current)
      }
    }, [items.length])

    useEffect(() => () => animRef.current?.stop(), [])

    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (items.length <= 1) return
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault()
          const dir = event.key === 'ArrowLeft' ? -1 : 1
          goToIndex(activeIndexRef.current + dir)
        }
      },
      [items.length, goToIndex]
    )

    const activeItem = items[clamp(activeIndex, 0, Math.max(0, items.length - 1))]
    const isMobile = size.width <= 480

    const contentAreaTop = useMemo(() => {
      const topOfArc = centerY - radius
      const bottomOfArc = centerY + radius
      const safe = Math.min(bottomOfArc - cardH * 0.35, size.height * 0.6)
      const top = Math.max(topOfArc + radius * 0.58, safe) - 48
      return top + (isMobile ? 96 : 0)
    }, [centerY, radius, cardH, size.height, isMobile])

    return (
      <div
        ref={rootRef}
        className={className}
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onLostPointerCapture={endPointer}
        style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background, touchAction: 'pan-y', outline: 'none' }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: 'radial-gradient(900px 500px at 50% 0%, rgba(23,19,16,0.05), rgba(23,19,16,0) 60%)',
          }}
        />

        <div style={{ position: 'absolute', inset: 0 }}>
          {items.map((item, i) => (
            <ArcItem
              key={item.id}
              item={item}
              index={i}
              rotation={rotation}
              baseAngles={baseAngles}
              width={size.width}
              radius={radius}
              centerY={centerY}
              cardW={cardW}
              cardH={cardH}
              cardRadius={cardRadius}
              cardShadow={cardShadow}
              activeScale={activeScale}
              inactiveScale={inactiveScale}
              inactiveOpacity={inactiveOpacity}
              isFocused={i === activeIndex}
              onClick={() => {
                if (i === activeIndexRef.current) {
                  onSelectItemAction?.(i)
                  return
                }
                goToIndex(i)
              }}
            />
          ))}
        </div>

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: contentAreaTop,
            paddingInline: clamp(size.width * 0.06, 16, 48),
            pointerEvents: 'auto',
          }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={`${activeItem?.id ?? 'none'}-${activeIndex}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: reducedMotion ? 0 : 0.22, ease: [0.2, 0.8, 0.2, 1] }}
              style={{
                maxWidth: 780,
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                textAlign: 'center',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  type="button"
                  aria-label="Previous product"
                  disabled={items.length <= 1}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    goToIndex(activeIndexRef.current - 1)
                  }}
                  style={{
                    width: 42,
                    height: 42,
                    border: 'none',
                    background: 'transparent',
                    color: titleColor,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: items.length <= 1 ? 'default' : 'pointer',
                    padding: 0,
                  }}
                >
                  <svg aria-hidden viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>

                <div
                  style={{
                    color: titleColor,
                    fontFamily: 'var(--lux-font-display, inherit)',
                    fontSize: 24,
                    fontWeight: 600,
                    letterSpacing: '-0.01em',
                    lineHeight: 1.2,
                  }}
                >
                  {activeItem?.title ?? ''}
                </div>

                <button
                  type="button"
                  aria-label="Next product"
                  disabled={items.length <= 1}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    goToIndex(activeIndexRef.current + 1)
                  }}
                  style={{
                    width: 42,
                    height: 42,
                    border: 'none',
                    background: 'transparent',
                    color: titleColor,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: items.length <= 1 ? 'default' : 'pointer',
                    padding: 0,
                  }}
                >
                  <svg aria-hidden viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>

              {activeItem?.subheadline && (
                <div
                  style={{
                    color: subheadlineColor,
                    fontSize: 15,
                    fontWeight: 500,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {activeItem.subheadline}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {items.length > 1 && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: isMobile ? 80 : 18,
              display: 'flex',
              justifyContent: 'center',
              gap: 8,
              pointerEvents: 'none',
              opacity: 0.7,
            }}
          >
            {items.slice(0, 9).map((item, i) => (
              <div
                key={item.id}
                style={{
                  width: i === activeIndex ? 18 : 6,
                  height: 6,
                  borderRadius: 999,
                  background: i === activeIndex ? 'rgba(23,19,16,0.55)' : 'rgba(23,19,16,0.18)',
                  transition: reducedMotion ? 'none' : 'all 180ms ease',
                }}
              />
            ))}
          </div>
        )}
      </div>
    )
  }
)

export default ArcImageCarousel
