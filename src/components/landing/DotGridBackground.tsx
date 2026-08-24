'use client'

import { useEffect, useRef } from 'react'

interface Dot {
  bx: number
  by: number
  inclination: number
  ascension: number
  phase: number
  speedMult: number
}

interface DotGridBackgroundProps {
  dotColor?: string
  dotSize?: number
  dotSpacing?: number
  orbitSpeed?: number
  impactRadius?: number
  scaleOnHover?: number
  enableRevolve?: boolean
  className?: string
}

function smoothstep(t: number) {
  const c = Math.max(0, Math.min(1, t))
  return c * c * (3 - 2 * c)
}

function parseColor(raw: string): { r: number; g: number; b: number } {
  let h = raw.trim().replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h.slice(0, 6), 16)
  if (Number.isNaN(n)) return { r: 109, g: 40, b: 217 }
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export default function DotGridBackground({
  dotColor = '#6d28d9',
  dotSize = 3,
  dotSpacing = 28,
  orbitSpeed = 1.5,
  impactRadius = 100,
  scaleOnHover = 1.8,
  enableRevolve = true,
  className,
}: DotGridBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)

  const cfgRef = useRef({
    dotColor,
    dotSize,
    dotSpacing,
    orbitSpeed,
    impactRadius,
    scaleOnHover,
    enableRevolve,
  })

  useEffect(() => {
    cfgRef.current.dotColor = dotColor
    cfgRef.current.dotSize = dotSize
    cfgRef.current.dotSpacing = dotSpacing
    cfgRef.current.orbitSpeed = orbitSpeed
    cfgRef.current.impactRadius = impactRadius
    cfgRef.current.scaleOnHover = scaleOnHover
    cfgRef.current.enableRevolve = enableRevolve
  }, [dotColor, dotSize, dotSpacing, orbitSpeed, impactRadius, scaleOnHover, enableRevolve])

  useEffect(() => {
    const canvas = canvasRef.current
    const host = hostRef.current
    if (!canvas || !host) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    let W = 0
    let H = 0
    const mouse = { x: -9999, y: -9999 }
    let hovering = false
    let leaveTs = 0
    let prevTs = 0
    let raf = 0
    let globalAngle = 0

    const dotsRef: { current: Dot[] } = { current: [] }
    const spacingSnapRef = { current: dotSpacing }

    function buildDots() {
      const sp = cfgRef.current.dotSpacing
      spacingSnapRef.current = sp
      dotsRef.current = []
      const cols = Math.ceil(W / sp) + 2
      const rows = Math.ceil(H / sp) + 2
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          dotsRef.current.push({
            bx: c * sp,
            by: r * sp,
            inclination: Math.random() * Math.PI,
            ascension: Math.random() * Math.PI * 2,
            phase: Math.random() * Math.PI * 2,
            speedMult: 0.7 + Math.random() * 0.6,
          })
        }
      }
    }

    function resize() {
      const rect = host!.getBoundingClientRect()
      W = rect.width
      H = rect.height
      canvas!.width = W * dpr
      canvas!.height = H * dpr
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      buildDots()
    }

    const ro = new ResizeObserver(resize)
    ro.observe(host)
    resize()

    // The canvas layer is pointer-events-none, so track the cursor on the
    // parent container (e.g. the hero section) so interaction works through
    // content rendered above this layer.
    const target = (host.parentElement as HTMLElement | null) ?? host

    function updateMouse(clientX: number, clientY: number) {
      const rect = host!.getBoundingClientRect()
      mouse.x = clientX - rect.left
      mouse.y = clientY - rect.top
    }

    function onMouseMove(e: MouseEvent) {
      updateMouse(e.clientX, e.clientY)
    }
    function onTouchMove(e: TouchEvent) {
      if (e.touches.length > 0) updateMouse(e.touches[0].clientX, e.touches[0].clientY)
    }
    function onMouseEnter(e: MouseEvent) {
      updateMouse(e.clientX, e.clientY)
      hovering = true
    }
    function onLeave() {
      mouse.x = -9999
      mouse.y = -9999
      hovering = false
      leaveTs = performance.now()
    }

    target.addEventListener('mousemove', onMouseMove)
    target.addEventListener('mouseenter', onMouseEnter)
    target.addEventListener('mouseleave', onLeave)
    target.addEventListener('touchmove', onTouchMove, { passive: true })
    target.addEventListener('touchend', onLeave)

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    function render(cfg: typeof cfgRef.current) {
      ctx!.clearRect(0, 0, W, H)
      const rgb = parseColor(cfg.dotColor)
      const mx = mouse.x
      const my = mouse.y
      const now = performance.now()
      const timeSinceLeave = hovering ? 0 : Math.max(0, now - leaveTs) / 1e3
      const decay = hovering ? 1 : smoothstep(Math.max(0, 1 - timeSinceLeave * 1.5))

      for (const d of dotsRef.current) {
        const dx = d.bx - mx
        const dy = d.by - my
        const dist = Math.sqrt(dx * dx + dy * dy)
        const inRange = dist < cfg.impactRadius && dist > 0

        let x = d.bx
        let y = d.by
        let scale = 1
        let alpha = 0.3

        if (inRange) {
          const t = dist / cfg.impactRadius
          const inf = smoothstep(1 - t) * decay

          if (cfg.enableRevolve) {
            const orbitR = (1 - t) * cfg.dotSpacing * 0.7 * inf
            const theta = globalAngle * d.speedMult + d.phase

            const cosA = Math.cos(d.ascension)
            const sinA = Math.sin(d.ascension)
            const cosI = Math.cos(d.inclination)
            const sinI = Math.sin(d.inclination)
            const lx = Math.cos(theta)
            const ly = Math.sin(theta) * cosI
            const lz = Math.sin(theta) * sinI

            const ox = (lx * cosA - ly * sinA) * orbitR
            const oy = (lx * sinA + ly * cosA) * orbitR
            x = d.bx + ox
            y = d.by + oy

            const depthScale = 0.75 + 0.25 * ((lz + 1) * 0.5)
            scale = (1 + (cfg.scaleOnHover - 1) * inf) * depthScale
            alpha = (0.3 + 0.7 * inf) * depthScale
          } else {
            scale = 1 + (cfg.scaleOnHover - 1) * inf
            alpha = 0.3 + 0.7 * inf
          }
        }

        const r = (cfg.dotSize / 2) * scale
        ctx!.beginPath()
        ctx!.arc(x, y, r, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`
        ctx!.fill()
      }
    }

    function loop(ts: number) {
      raf = requestAnimationFrame(loop)
      const dt = Math.min((ts - (prevTs || ts)) / 1e3, 0.05)
      prevTs = ts
      const cfg = cfgRef.current
      if (spacingSnapRef.current !== cfg.dotSpacing) buildDots()
      globalAngle += cfg.orbitSpeed * dt
      render(cfg)
    }

    if (reducedMotion) {
      render(cfgRef.current)
    } else {
      raf = requestAnimationFrame(loop)
    }

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      target.removeEventListener('mousemove', onMouseMove)
      target.removeEventListener('mouseenter', onMouseEnter)
      target.removeEventListener('mouseleave', onLeave)
      target.removeEventListener('touchmove', onTouchMove)
      target.removeEventListener('touchend', onLeave)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div ref={hostRef} className={className} aria-hidden>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  )
}
