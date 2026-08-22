'use client'

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import Image from 'next/image'
import * as THREE from 'three'
import {
  TweenEngine,
  easeInOutExpo,
  easeInOutPower2,
  easeOutPower3,
} from '@/lib/liquid-glass/tween'

export interface CarouselProject {
  id: string
  src: string | null
  name: string
}

export interface LiquidGlassCarouselHandle {
  next(): void
  prev(): void
  goTo(index: number): void
}

export interface LiquidGlassCarouselProps {
  projects: CarouselProject[]
  onSelectProjectAction?: (index: number) => void
  onActiveIndexChangeAction?: (index: number) => void
  onEntryDoneAction?: (done: boolean) => void
  accentColor?: string
  backgroundColor?: string
  enableEntryAnimation?: boolean
  className?: string
  ariaLabel?: string
}

const REPEATS = 4

const fragmentShader = `
    #define PI 3.14159265
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTex;
    uniform vec2  uRes;
    uniform vec2  uCenter;
    uniform float uSizeX;
    uniform float uSizeY;
    uniform float uAspect;
    uniform float uZoom;
    uniform float uDispersion;
    uniform float uBlur;
    uniform float uGlow;
    uniform float uWhiteGlow;
    uniform float uNovaSize;
    uniform float uBlueRing;
    uniform float uRingRadius;
    uniform float uRingWidth;
    uniform float uShimmer;
    uniform float uShimmerFreq;
    uniform float uShimmerSpeed;
    uniform float uShimmerDepth;
    uniform float uTime;
    uniform float uRimStart;
    uniform float uRimTangential;
    uniform float uRimInward;
    uniform float uRimFreq1;
    uniform float uRimFreq2;
    uniform vec3  uBlueColor;
    uniform float uRimLine;
    uniform float uRimLinePos;
    uniform float uRimLineWidth;
    uniform float uShape;
    uniform float uSquareRound;
    uniform float uRotation;
    uniform int   uSamples;

    const int MAX_SAMPLES = 16;

    float sdRoundBox(vec2 p, vec2 b, float r) {
        vec2 q = abs(p) - b + r;
        return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
    }

    vec3 glassLens(vec2 center, float aspectCorrect, out float outA) {
        vec2 p = vUv - center;
        p.x *= aspectCorrect;
        float ca = cos(uRotation), sa = sin(uRotation);
        p = mat2(ca, -sa, sa, ca) * p;
        vec2 halfSize = vec2(uSizeX, uSizeY);
        float dist = length(p / halfSize);
        outA = 0.0;

        float maskND;
        if (uShape > 0.5) {
            float corner = min(uSizeX, uSizeY) * clamp(uSquareRound, 0.0, 1.0);
            float sd = sdRoundBox(p, halfSize, corner);
            maskND = 1.0 + sd / min(uSizeX, uSizeY);
        } else {
            maskND = dist;
        }

        if (maskND > 1.0) return vec3(0.0);

        float shapeND = clamp(maskND, 0.0, 1.0);
        float nd = clamp(dist, 0.0, 1.0);
        vec2 offset = vUv - center;
        vec2 radialDir = normalize(offset + 1e-6);
        vec2 tangentDir = vec2(-radialDir.y, radialDir.x);
        float angle = atan(p.y, p.x);

        float pull = uZoom * 0.30 * nd * nd;
        float rimStrength = smoothstep(uRimStart, 1.0, nd);
        float fluidWave = sin(angle * uRimFreq1) * 0.55 +
                          sin(angle * uRimFreq2) * 0.25;
        float rScreen = (uSizeX + uSizeY) * 0.5;

        vec2 rimOff = tangentDir * fluidWave * rimStrength *
                      rScreen * uRimTangential;
        vec2 rimPull = -radialDir * rimStrength * rScreen * uRimInward;
        vec2 baseUV = center + offset * (1.0 - pull) + rimOff + rimPull;

        float rimMask = smoothstep(0.55, 1.0, nd);
        vec2 dispDir = offset * uDispersion * 0.004 * rimMask;

        int count = uSamples;
        if (count < 2) count = 2;
        if (count > MAX_SAMPLES) count = MAX_SAMPLES;

        vec3 col = vec3(0.0);
        vec3 caW = vec3(0.0);

        for (int i = 0; i < MAX_SAMPLES; i++) {
            if (i >= count) break;

            float t = float(i) / float(count - 1);
            vec2 sUV = baseUV + dispDir * (t - 0.5);
            vec3 sampleColor = texture2D(uTex, sUV).rgb;

            vec3 weight = vec3(
                exp(-pow((t - 0.00) / 0.38, 2.0)),
                exp(-pow((t - 0.50) / 0.38, 2.0)),
                exp(-pow((t - 1.00) / 0.38, 2.0))
            );

            col += sampleColor * weight;
            caW += weight;
        }

        col /= max(caW, vec3(0.001));

        float blurFade = 1.0 - smoothstep(0.72, 0.98, nd);

        if (uBlur > 0.01 && blurFade > 0.01) {
            vec2 blurRad = vec2(uBlur) / uRes * blurFade;
            vec3 bcol = vec3(0.0);
            float totalWeight = 0.0;

            for (float a = 0.0; a < PI * 2.0; a += PI * 2.0 / 6.0) {
                for (float rr = 0.4; rr <= 1.001; rr += 0.3) {
                    vec2 o = vec2(cos(a), sin(a)) * blurRad * rr;
                    float weight = 1.0 - rr * 0.38;
                    bcol += texture2D(uTex, baseUV + o).rgb * weight;
                    totalWeight += weight;
                }
            }

            col = mix(bcol / totalWeight, col, rimMask);
        }

        col *= mix(0.91, 1.0, smoothstep(0.0, 0.38, shapeND));

        float r2 = shapeND * shapeND * 0.25;
        float gs = max(uNovaSize * uGlow * 0.003, 0.004);
        float nova = exp(-r2 / gs) + exp(-r2 / (gs * 7.0)) * 0.18;

        nova *= uWhiteGlow * (uGlow / 17.0) * 1.15;
        col += vec3(nova);

        float dC = shapeND * 0.5;
        float tR = clamp(uRingRadius, 0.1, 0.49);
        float rW = max(uRingWidth, 0.003);

        float ring = exp(-pow((dC - tR) / rW, 2.0));
        ring *= uBlueRing * (uGlow / 17.0) * 1.8;

        if (uShimmer > 0.5) {
            ring *= sin(angle * uShimmerFreq + uTime * uShimmerSpeed) *
                    uShimmerDepth + (1.0 - uShimmerDepth);
        }

        float aura = exp(-pow((dC - tR) / (rW * 6.0), 2.0)) *
                     0.28 * uBlueRing * (uGlow / 17.0);

        col += uBlueColor * (ring + aura);

        col += vec3(
            exp(
                -pow(
                    (dC - uRimLinePos) /
                    max(uRimLineWidth, 0.0001),
                    2.0
                )
            ) * uRimLine
        );

        outA = smoothstep(1.0, 0.93, maskND);

        return col;
    }

    void main() {
        vec3 outputColor = texture2D(uTex, vUv).rgb;
        float alpha = 0.0;
        vec3 lensColor = glassLens(uCenter, uAspect, alpha);
        outputColor = mix(outputColor, lensColor, alpha);
        gl_FragColor = vec4(outputColor, 1.0);
    }
`

const vertexShader = `
    varying vec2 vUv;

    void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
    }
`

interface EngineConfig {
  accentColor: string
  backgroundColor: string
  entryAnimation: boolean
  pixelRatio: number
  panelHeight: number
  gap: number
  glide: number
  wheelSensitivity: number
  snap: boolean
  snapDistance: number
  snapDelay: number
  speedShrink: number
  dispersion: number
  zoom: number
  blur: number
  glow: number
  ringStrength: number
  rimWave: number
}

const DEFAULT_CONFIG: EngineConfig = {
  accentColor: '#C9A962',
  backgroundColor: '#F9F7F4',
  entryAnimation: true,
  pixelRatio: 2,
  panelHeight: 450,
  gap: 12,
  glide: 0.075,
  wheelSensitivity: 1,
  snap: true,
  snapDistance: 60,
  snapDelay: 120,
  speedShrink: 60,
  dispersion: 11,
  zoom: 0,
  blur: 0,
  glow: 4.2,
  ringStrength: 6,
  rimWave: 0.6,
}

function detectWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

function prefersReducedMotion(): boolean {
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = document.createElement('img')
    image.crossOrigin = 'anonymous'
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    image.src = url
  })
}

async function loadProjectImage(src: string): Promise<HTMLImageElement> {
  try {
    return await loadImageElement(src)
  } catch {
    if (/^https?:\/\//i.test(src)) {
      const proxied = `/_next/image?url=${encodeURIComponent(src)}&w=1200&q=75`
      return loadImageElement(proxied)
    }
    throw new Error(`Unresolvable image source: ${src}`)
  }
}

function makePlaceholderTexture(accentColor: string, label: string): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 800
  const ctx = canvas.getContext('2d')

  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 1200, 800)
    gradient.addColorStop(0, '#efe9dc')
    gradient.addColorStop(1, '#d8cdb4')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.strokeStyle = `${accentColor}55`
    ctx.lineWidth = 3
    ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56)

    ctx.fillStyle = '#8a7a55'
    ctx.font = '600 64px Inter, Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label.slice(0, 32) || 'Flux3D', canvas.width / 2, canvas.height / 2)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function createCarousel(
  mount: HTMLElement,
  options: {
    projects: CarouselProject[]
    getConfig: () => EngineConfig
    reduceMotion: boolean
    tweens: TweenEngine
    onSelect: (sourceIndex: number) => void
    onActiveChange: (sourceIndex: number) => void
    onEntryDone: (done: boolean) => void
  }
) {
  const { projects, getConfig, reduceMotion, tweens, onSelect, onActiveChange, onEntryDone } = options

  let W = Math.max(1, mount.clientWidth)
  let H = Math.max(1, mount.clientHeight)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  const dpr = Math.min(window.devicePixelRatio || 1, getConfig().pixelRatio)
  renderer.setPixelRatio(dpr)
  renderer.setSize(W, H)
  renderer.setClearColor(new THREE.Color(getConfig().backgroundColor), 1)
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.touchAction = 'none'
  mount.style.touchAction = 'none'
  mount.appendChild(renderer.domElement)

  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy()
  const scratchColor = new THREE.Color()

  const panelHeightPx = () => {
    const config = getConfig()
    const byHeight = H * 0.48
    const byWidth = W * 0.78
    return Math.max(110, Math.min(config.panelHeight, byHeight, byWidth))
  }

  const gapPx = () => {
    const scale = panelHeightPx() / Math.max(1, getConfig().panelHeight)
    return Math.max(6, getConfig().gap * Math.min(1, scale))
  }

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -100, 100)
  camera.position.z = 10

  let userInteracted = false

  const sources = projects.map((project) => {
    const source = { texture: null as THREE.Texture | null, aspect: 1.5, bound: false }

    if (!project.src) {
      source.texture = makePlaceholderTexture(getConfig().accentColor, project.name)
      return source
    }

    loadProjectImage(project.src)
      .then((image) => {
        const texture = new THREE.Texture(image)
        texture.colorSpace = THREE.SRGBColorSpace
        texture.minFilter = THREE.LinearMipmapLinearFilter
        texture.magFilter = THREE.LinearFilter
        texture.generateMipmaps = true
        texture.anisotropy = maxAnisotropy
        texture.needsUpdate = true

        source.aspect =
          image.naturalWidth > 0 && image.naturalHeight > 0
            ? image.naturalWidth / image.naturalHeight
            : 1.5
        source.texture = texture
        recomputeTotal()
        if (!userInteracted) {
          scroll = centerForIndex(0)
          target = scroll
        }
      })
      .catch(() => {
        source.texture = makePlaceholderTexture(getConfig().accentColor, project.name)
      })

    return source
  })

  const slotWidth = (i: number) => sources[i].aspect * panelHeightPx() + gapPx()

  let offsets: number[] = []
  let totalWidth = 1

  function recomputeTotal() {
    offsets = []
    let sum = 0
    sources.forEach((_, index) => {
      offsets.push(sum)
      sum += slotWidth(index)
    })
    totalWidth = Math.max(sum, 1)
  }
  recomputeTotal()

  function centerForIndex(index: number) {
    const count = sources.length
    const loop = Math.floor(index / count)
    const sourceIndex = ((index % count) + count) % count
    return offsets[sourceIndex] + slotWidth(sourceIndex) / 2 - gapPx() / 2 + loop * totalWidth
  }

  function nearestIndex(value: number) {
    let best = 0
    let bestDistance = Infinity
    for (let i = 0; i < sources.length; i++) {
      const center = offsets[i] + slotWidth(i) / 2 - gapPx() / 2
      const loop = Math.round((value - center) / totalWidth)
      const distance = Math.abs(center + loop * totalWidth - value)
      if (distance < bestDistance) {
        bestDistance = distance
        best = i + loop * sources.length
      }
    }
    return best
  }

  function centerSourceIndex(value: number) {
    let best = 0
    let bestDistance = Infinity
    for (let i = 0; i < sources.length; i++) {
      const center = offsets[i] + slotWidth(i) / 2 - gapPx() / 2
      const loop = Math.round((value - center) / totalWidth)
      const distance = Math.abs(center + loop * totalWidth - value)
      if (distance < bestDistance) {
        bestDistance = distance
        best = i
      }
    }
    return best
  }

  const pool: {
    mesh: THREE.Mesh
    material: THREE.MeshBasicMaterial
    sourceIndex: number
    bound: boolean
  }[] = []
  for (let repeat = 0; repeat < REPEATS; repeat++) {
    for (let i = 0; i < sources.length; i++) {
      const material = new THREE.MeshBasicMaterial({ color: 14540253, transparent: true })
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material)
      mesh.visible = false
      scene.add(mesh)
      pool.push({ mesh, material, sourceIndex: i, bound: false })
    }
  }

  let scroll = centerForIndex(0)
  let target = scroll
  let previousScroll = scroll
  let scrollEnergy = 0
  let lastWheelAt = 0
  let snapArmed = false
  let lastCenter = -1
  let disposed = false

  const rt = new THREE.WebGLRenderTarget(W * dpr, H * dpr)
  const lensScene = new THREE.Scene()
  const lensCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

  const lensUniforms: Record<string, THREE.IUniform> = {
    uTex: { value: rt.texture },
    uRes: { value: new THREE.Vector2(W * dpr, H * dpr) },
    uCenter: { value: new THREE.Vector2(0.5, 0.5) },
    uSizeX: { value: 0.565 },
    uSizeY: { value: 1 },
    uShape: { value: 0 },
    uSquareRound: { value: 0 },
    uRotation: { value: 0 },
    uAspect: { value: W / H },
    uZoom: { value: 0 },
    uDispersion: { value: getConfig().dispersion },
    uBlur: { value: 0 },
    uGlow: { value: getConfig().glow },
    uWhiteGlow: { value: 0.24 },
    uNovaSize: { value: 12 },
    uBlueRing: { value: getConfig().ringStrength },
    uRingRadius: { value: 0.49 },
    uRingWidth: { value: 0.014 },
    uShimmer: { value: 1 },
    uShimmerFreq: { value: 12 },
    uShimmerSpeed: { value: 3.5 },
    uShimmerDepth: { value: 0.12 },
    uTime: { value: 0 },
    uRimStart: { value: 0.578 },
    uRimTangential: { value: getConfig().rimWave },
    uRimInward: { value: 0 },
    uRimFreq1: { value: 2 },
    uRimFreq2: { value: 1 },
    uBlueColor: { value: new THREE.Color(getConfig().accentColor) },
    uRimLine: { value: 1.4 },
    uRimLinePos: { value: 0.488 },
    uRimLineWidth: { value: 0.003 },
    uSamples: { value: 16 },
  }

  const lensMaterial = new THREE.ShaderMaterial({
    uniforms: lensUniforms,
    vertexShader,
    fragmentShader,
  })
  const lensQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), lensMaterial)
  lensScene.add(lensQuad)

  const entryEnabled = getConfig().entryAnimation && !reduceMotion
  const lensState = { fx: entryEnabled ? 0 : 1 }
  const entry: number[] = new Array(pool.length).fill(entryEnabled ? 0 : 1)
  const grow: number[] = new Array(pool.length).fill(entryEnabled ? 0 : 1)
  let entryActive = entryEnabled
  let entrySettled = false

  const lastCenterX: (number | undefined)[] = new Array(pool.length)
  let panelRects: {
    left: number
    right: number
    top: number
    bottom: number
    poolIndex: number
    sourceIndex: number
    centerX: number
  }[] = []
  let centeredPanel: { sourceIndex: number; poolIndex: number; centerX: number } | null = null

  function layout() {
    panelRects = []
    centeredPanel = null
    let centeredDistance = Infinity
    const half = W / 2
    const currentPanelHeight = panelHeightPx()
    const currentGap = gapPx()
    const buffer = currentPanelHeight
    const middleRepeat = Math.floor(REPEATS / 2)
    const inEntry = entryActive || entrySettled

    pool.forEach((item, poolIndex) => {
      const repeat = Math.floor(poolIndex / sources.length)
      const sourceIndex = item.sourceIndex
      const source = sources[sourceIndex]
      const centerInLoop = offsets[sourceIndex] + slotWidth(sourceIndex) / 2 - currentGap / 2
      let x = centerInLoop - scroll
      x = ((x % totalWidth) + totalWidth) % totalWidth
      x += (repeat - middleRepeat) * totalWidth
      if (x > half + totalWidth) x -= totalWidth * REPEATS
      const centerX = x

      if (!inEntry && (centerX < -half - buffer || centerX > half + buffer)) {
        item.mesh.visible = false
        lastCenterX[poolIndex] = undefined
        return
      }
      lastCenterX[poolIndex] = centerX

      const shrink = 1 - 0.25 * scrollEnergy
      const height = currentPanelHeight * shrink
      const width = source.aspect * currentPanelHeight * shrink

      if (source.texture && !item.bound) {
        item.material.map = source.texture
        item.material.color.set(16777215)
        item.material.needsUpdate = true
        item.bound = true
      }

      const y = 0
      let drawWidth = width
      let drawHeight = height
      let finalX = centerX
      let finalY = y

      if (inEntry) {
        const progress = entry[poolIndex]
        const growth = grow[poolIndex]
        const entryMin = Math.min(80, currentPanelHeight * 0.35)
        const currentHeight = entryMin + (drawHeight - entryMin) * growth
        drawHeight = currentHeight
        drawWidth = currentHeight * source.aspect

        if (repeat !== middleRepeat) {
          item.mesh.visible = false
          lastCenterX[poolIndex] = undefined
          return
        }

        const centeredSource = centerSourceIndex(scroll)
        let distanceIndex = sourceIndex - centeredSource
        if (distanceIndex > sources.length / 2) distanceIndex -= sources.length
        if (distanceIndex < -sources.length / 2) distanceIndex += sources.length

        const currentSlotHeight = (s: number) =>
          entryMin +
          (currentPanelHeight - entryMin) * grow[middleRepeat * sources.length + s]

        let offset = 0
        if (distanceIndex > 0) {
          for (let k = 0; k < distanceIndex; k++) {
            const a = (centeredSource + k) % sources.length
            const b = (centeredSource + k + 1) % sources.length
            offset +=
              (sources[a].aspect * currentSlotHeight(a) + sources[b].aspect * currentSlotHeight(b)) /
                2 +
              currentGap
          }
        } else if (distanceIndex < 0) {
          for (let k = 0; k < -distanceIndex; k++) {
            const a = (((centeredSource - k) % sources.length) + sources.length) % sources.length
            const b =
              (((centeredSource - k - 1) % sources.length) + sources.length) % sources.length
            offset -=
              (sources[a].aspect * currentSlotHeight(a) + sources[b].aspect * currentSlotHeight(b)) /
                2 +
              currentGap
          }
        }

        finalX = offset
        const below = -H * 0.9
        finalY = below + (y - below) * progress
      }

      item.mesh.visible = true
      item.mesh.position.set(finalX, finalY, 0)
      item.mesh.scale.set(drawWidth, drawHeight, 1)

      const screenX = centerX + W / 2
      const screenY = H / 2 - y
      panelRects.push({
        left: screenX - drawWidth / 2,
        right: screenX + drawWidth / 2,
        top: screenY - drawHeight / 2,
        bottom: screenY + drawHeight / 2,
        poolIndex,
        sourceIndex,
        centerX,
      })

      if (Math.abs(centerX) < centeredDistance) {
        centeredDistance = Math.abs(centerX)
        centeredPanel = { sourceIndex, poolIndex, centerX }
      }
    })
  }

  function finishEntryImmediately() {
    if (!entryEnabled || (!entryActive && !entrySettled)) return
    tweens.killTweensOf(entry)
    tweens.killTweensOf(grow)
    tweens.killTweensOf(lensState)
    entry.fill(1)
    grow.fill(1)
    lensState.fx = 1
    entryActive = false
    entrySettled = false
    onEntryDone(true)
  }

  function panelAt(x: number, y: number) {
    return (
      panelRects.find(
        (rect) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
      ) ?? null
    )
  }

  function localPointer(event: PointerEvent | MouseEvent) {
    const rect = renderer.domElement.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  let dragPointerId: number | null = null
  let dragOriginX = 0
  let dragOriginTarget = 0
  let dragMoved = false
  let suppressClick = false

  const canvas = renderer.domElement

  function onWheel(event: WheelEvent) {
    event.preventDefault()
    finishEntryImmediately()
    userInteracted = true
    target += (event.deltaY || event.deltaX) * getConfig().wheelSensitivity
    lastWheelAt = performance.now()
    snapArmed = true
  }

  function onPointerDown(event: PointerEvent) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    finishEntryImmediately()
    dragPointerId = event.pointerId
    dragOriginX = event.clientX
    dragOriginTarget = target
    dragMoved = false
    userInteracted = true
    canvas.style.cursor = 'grabbing'
    canvas.setPointerCapture?.(event.pointerId)
  }

  function onPointerMove(event: PointerEvent) {
    const point = localPointer(event)
    if (dragPointerId === event.pointerId) {
      const dx = event.clientX - dragOriginX
      if (Math.abs(dx) > 6) dragMoved = true
      target = dragOriginTarget - dx * getConfig().wheelSensitivity
      lastWheelAt = performance.now()
      snapArmed = true
      return
    }
    if (entryActive || entrySettled) return
    if (event.pointerType === 'mouse') {
      canvas.style.cursor = panelAt(point.x, point.y) ? 'pointer' : 'grab'
    }
  }

  function onPointerUp(event: PointerEvent) {
    if (dragPointerId !== event.pointerId) return
    canvas.releasePointerCapture?.(event.pointerId)
    dragPointerId = null
    canvas.style.cursor = 'grab'
    if (dragMoved) {
      suppressClick = true
      lastWheelAt = performance.now()
      snapArmed = true
    }
  }

  function onClick(event: MouseEvent) {
    if (suppressClick) {
      suppressClick = false
      return
    }
    const entryWasBlocking = entryActive || entrySettled
    finishEntryImmediately()
    if (entryWasBlocking) return
    const point = localPointer(event)
    const hit = panelAt(point.x, point.y)
    if (!hit) return
    if (centeredPanel && hit.poolIndex === centeredPanel.poolIndex) {
      onSelect(centeredPanel.sourceIndex)
      return
    }
    userInteracted = true
    target = centerForIndex(nearestIndex(scroll + hit.centerX))
  }

  canvas.addEventListener('wheel', onWheel, { passive: false })
  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointercancel', onPointerUp)
  canvas.addEventListener('click', onClick)

  function playEntry() {
    if (!entryEnabled) {
      onEntryDone(true)
      return
    }
    tweens.clear()
    entry.fill(0)
    grow.fill(0)
    lensState.fx = 0
    entryActive = true
    entrySettled = false
    onEntryDone(false)

    target = centerForIndex(nearestIndex(scroll))
    scroll = target
    layout()

    const visible = lastCenterX
      .map((x, index) => (x === undefined ? -1 : index))
      .filter((index) => index >= 0)
    const spread = 0.07 * Math.max(visible.length - 1, 1)
    let lastRiseEnd = 0
    visible.forEach((index) => {
      const at = Math.random() * spread
      lastRiseEnd = Math.max(lastRiseEnd, at + 1)
      tweens.to(entry, { [index]: 1 }, { duration: 1, ease: easeOutPower3, delay: 0.5 + at })
    })

    tweens.call(lastRiseEnd, () => {
      entryActive = false
      entrySettled = true
    })

    const center = centerSourceIndex(scroll)
    const middleRepeat = Math.floor(REPEATS / 2)
    const growList: { index: number; distanceRank: number }[] = []
    let maxRank = 0
    for (let i = 0; i < sources.length; i++) {
      let distance = i - center
      if (distance > sources.length / 2) distance -= sources.length
      if (distance < -sources.length / 2) distance += sources.length
      const distanceRank = Math.abs(distance)
      maxRank = Math.max(maxRank, distanceRank)
      growList.push({ index: middleRepeat * sources.length + i, distanceRank })
    }

    const growStart = lastRiseEnd + 0.25
    let growEnd = growStart
    tweens.to(lensState, { fx: 1 }, { duration: 1.4, ease: easeInOutPower2, delay: growStart })
    growList.forEach((item) => {
      const rank = maxRank - item.distanceRank
      const at = growStart + rank * 0.085
      growEnd = Math.max(growEnd, at + 2.15)
      tweens.to(grow, { [item.index]: 1 }, { duration: 2.15, ease: easeInOutExpo, delay: at })
    })

    tweens.call(growEnd, () => {
      entrySettled = false
      grow.fill(1)
      onEntryDone(true)
    })
  }

  let raf = 0
  let running = false
  let lastFrameTime = 0

  function renderFrame(now: number) {
    const values = getConfig()
    if (disposed) return

    const deltaSeconds = lastFrameTime > 0 ? Math.min((now - lastFrameTime) / 1000, 0.1) : 0
    lastFrameTime = now
    tweens.update(deltaSeconds)

    renderer.setClearColor(scratchColor.set(values.backgroundColor), 1)

    if (
      values.snap &&
      snapArmed &&
      !entryActive &&
      !entrySettled &&
      Math.abs(target - scroll) < values.snapDistance &&
      performance.now() - lastWheelAt > values.snapDelay
    ) {
      target = centerForIndex(nearestIndex(target))
      snapArmed = false
    }

    scroll += (target - scroll) * values.glide
    const centerIndex = centerSourceIndex(scroll)
    if (centerIndex !== lastCenter) {
      lastCenter = centerIndex
      onActiveChange(centerIndex)
    }

    const speed = scroll - previousScroll
    previousScroll = scroll
    const normalized = Math.min(1, Math.abs(speed) / Math.max(1, values.speedShrink))
    const energyEase = normalized > scrollEnergy ? 0.25 : 0.06
    scrollEnergy += (normalized - scrollEnergy) * energyEase

    layout()

    lensUniforms.uCenter.value.set(0.5, 0.5)
    lensUniforms.uSizeX.value = 0.565
    lensUniforms.uSizeY.value = 1
    lensUniforms.uRotation.value = (65 * Math.PI) / 180
    lensUniforms.uAspect.value = W / H
    lensUniforms.uTime.value = reduceMotion ? 0 : now * 0.001
    lensUniforms.uBlur.value = values.blur
    lensUniforms.uGlow.value = values.glow
    lensUniforms.uShimmer.value = reduceMotion ? 0 : 1
    ;(lensUniforms.uBlueColor.value as THREE.Color).set(values.accentColor)

    const fx = lensState.fx
    lensUniforms.uDispersion.value = values.dispersion * fx
    lensUniforms.uBlueRing.value = values.ringStrength * fx
    lensUniforms.uRimLine.value = 1.4 * fx
    lensUniforms.uZoom.value = values.zoom * fx
    lensUniforms.uRimTangential.value = values.rimWave * fx

    renderer.setRenderTarget(rt)
    renderer.render(scene, camera)
    renderer.setRenderTarget(null)
    renderer.render(lensScene, lensCamera)
  }

  function tick(now: number) {
    if (!running) return
    renderFrame(now)
    raf = requestAnimationFrame(tick)
  }

  function startLoop() {
    if (running || disposed) return
    running = true
    lastFrameTime = 0
    raf = requestAnimationFrame(tick)
  }

  function stopLoop() {
    running = false
    cancelAnimationFrame(raf)
  }

  function navigateTo(index: number) {
    if (entryActive || entrySettled) return
    userInteracted = true
    target = centerForIndex(index)
    snapArmed = false
  }

  const api = {
    next: () => navigateTo(nearestIndex(target) + 1),
    prev: () => navigateTo(nearestIndex(target) - 1),
    goTo: (index: number) => navigateTo(index),
  }

  function onResize() {
    W = Math.max(1, mount.clientWidth)
    H = Math.max(1, mount.clientHeight)
    renderer.setSize(W, H)
    camera.left = -W / 2
    camera.right = W / 2
    camera.top = H / 2
    camera.bottom = -H / 2
    camera.updateProjectionMatrix()
    rt.setSize(W * dpr, H * dpr)
    lensUniforms.uRes.value.set(W * dpr, H * dpr)
    recomputeTotal()
  }

  const resizeObserver = new ResizeObserver(onResize)
  resizeObserver.observe(mount)

  const intersectionObserver = new IntersectionObserver(
    ([visibleEntry]) => {
      if (visibleEntry?.isIntersecting) startLoop()
      else stopLoop()
    },
    { threshold: 0 }
  )
  intersectionObserver.observe(mount)

  const onContextLost = (event: Event) => {
    event.preventDefault()
    stopLoop()
  }
  const onContextRestored = () => {
    pool.forEach((item) => {
      item.bound = false
    })
    startLoop()
  }
  canvas.addEventListener('webglcontextlost', onContextLost, false)
  canvas.addEventListener('webglcontextrestored', onContextRestored, false)

  playEntry()

  return {
    api,
    destroy() {
      disposed = true
      stopLoop()
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
      canvas.removeEventListener('click', onClick)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      canvas.removeEventListener('webglcontextrestored', onContextRestored)
      tweens.clear()
      renderer.dispose()
      rt.dispose()
      lensQuad.geometry.dispose()
      lensMaterial.dispose()
      pool.forEach((item) => {
        item.mesh.geometry.dispose()
        item.material.dispose()
      })
      sources.forEach((source) => source.texture?.dispose())
      renderer.domElement.remove()
    },
  }
}

function CarouselFallback({ projects }: { projects: CarouselProject[] }) {
  return (
    <div className="flex h-full w-full items-center gap-4 overflow-x-auto px-6 pb-16 pt-24 [scroll-snap-type:x_mandatory]">
      {projects.map((project, index) => (
        <div
          key={project.id}
          className="relative h-[48%] shrink-0 overflow-hidden rounded-xl bg-[var(--lux-bg-muted)] [scroll-snap-align:center]"
          style={{ aspectRatio: '3 / 2' }}
        >
          {project.src ? (
            <Image src={project.src} alt={project.name} fill sizes="60vw" className="object-cover" />
          ) : null}
          <span className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-0.5 text-xs text-white">
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>
      ))}
    </div>
  )
}

const LiquidGlassCarousel = forwardRef<LiquidGlassCarouselHandle, LiquidGlassCarouselProps>(
  function LiquidGlassCarousel(props, ref) {
    const { projects, className, ariaLabel } = props

    const mountRef = useRef<HTMLDivElement>(null)
    const engineRef = useRef<ReturnType<typeof createCarousel> | null>(null)
    const tweensRef = useRef<TweenEngine | null>(null)
    const [webglSupported] = useState(detectWebGLSupport)
    const [engineError, setEngineError] = useState<string | null>(null)
    const [reduceMotion, setReduceMotion] = useState(prefersReducedMotion)

    const propsRef = useRef(props)

    useEffect(() => {
      propsRef.current = props
    })

    const projectKey = useMemo(
      () => projects.map((p) => `${p.id}|${p.src ?? ''}|${p.name}`).join('::'),
      [projects]
    )

    useEffect(() => {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)')
      const update = () => setReduceMotion(media.matches)
      update()
      media.addEventListener('change', update)
      return () => media.removeEventListener('change', update)
    }, [])

    useEffect(() => {
      if (!mountRef.current) return
      if (!tweensRef.current) tweensRef.current = new TweenEngine()
      const tweens = tweensRef.current
      setEngineError(null)

      const engineOptions = {
        projects,
        getConfig: (): EngineConfig => ({
          ...DEFAULT_CONFIG,
          accentColor: propsRef.current.accentColor ?? DEFAULT_CONFIG.accentColor,
          backgroundColor: propsRef.current.backgroundColor ?? DEFAULT_CONFIG.backgroundColor,
          entryAnimation: propsRef.current.enableEntryAnimation ?? DEFAULT_CONFIG.entryAnimation,
        }),
        reduceMotion,
        tweens,
        onSelect: (sourceIndex: number) => propsRef.current.onSelectProjectAction?.(sourceIndex),
        onActiveChange: (sourceIndex: number) =>
          propsRef.current.onActiveIndexChangeAction?.(sourceIndex),
        onEntryDone: (done: boolean) => propsRef.current.onEntryDoneAction?.(done),
      }

      try {
        engineRef.current = createCarousel(mountRef.current, engineOptions)
      } catch (error) {
        console.error('LiquidGlassCarousel failed to initialize:', error)
        engineRef.current = null
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time failure path must surface the fallback UI
        setEngineError('The carousel could not initialize its graphics engine.')
      }

      return () => {
        try {
          engineRef.current?.destroy()
        } catch (error) {
          console.error('LiquidGlassCarousel destroy failed:', error)
        }
        engineRef.current = null
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectKey])

    useImperativeHandle(
      ref,
      () => ({
        next: () => engineRef.current?.api.next(),
        prev: () => engineRef.current?.api.prev(),
        goTo: (index: number) => engineRef.current?.api.goTo(index),
      }),
      []
    )

    if (!webglSupported || engineError) {
      return (
        <div className={className}>
          {engineError && (
            <p role="status" className="px-6 pt-20 text-center text-sm text-[var(--lux-text-muted)]">
              {engineError}
            </p>
          )}
          <CarouselFallback projects={projects} />
        </div>
      )
    }

    return (
      <div
        ref={mountRef}
        className={className}
        aria-label={ariaLabel}
        role="region"
      />
    )
  }
)

export default LiquidGlassCarousel
