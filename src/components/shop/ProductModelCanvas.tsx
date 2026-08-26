'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, type RootState } from '@react-three/fiber'
import { AdaptiveDpr, Bounds, ContactShadows, Environment, Html, OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { Box3, Group, Vector3, type Object3D } from 'three'
import type { ShopProductHotspot } from '@/lib/shop/admin-types'

type ProductModelCanvasProps = {
  object: Object3D
  autoRotate?: boolean
  productName?: string
  hotspots?: ShopProductHotspot[]
  pinSize?: number
}

/** Cinematic rise-in: eases the model from a lower, slightly smaller pose to rest. */
function EntranceGroup({ children }: { children: React.ReactNode }) {
  const ref = useRef<Group>(null)
  const progress = useRef(0)

  useFrame((_, delta) => {
    if (!ref.current || progress.current >= 1) return
    progress.current = Math.min(1, progress.current + delta / 0.9)
    const t = 1 - Math.pow(1 - progress.current, 3)
    const scale = 0.92 + 0.08 * t
    ref.current.scale.setScalar(scale)
    ref.current.position.y = (1 - t) * -0.35
    ref.current.rotation.y = (1 - t) * 0.35
  })

  return <group ref={ref}>{children}</group>
}

function HotspotPin({
  hotspot,
  size,
  active,
  onSelect,
}: {
  hotspot: ShopProductHotspot
  size: number
  active: boolean
  onSelect: () => void
}) {
  return (
    <mesh position={hotspot.position} onClick={(event) => { event.stopPropagation(); onSelect() }}>
      <sphereGeometry args={[size, 20, 20]} />
      <meshStandardMaterial color="#C9A962" emissive="#C9A962" emissiveIntensity={active ? 0.85 : 0.45} />
      <Html center distanceFactor={8} zIndexRange={[10, 0]}>
        <button
          type="button"
          aria-label={hotspot.label}
          onClick={(event) => { event.stopPropagation(); onSelect() }}
          className={`grid h-6 w-6 -translate-y-1/2 cursor-pointer place-items-center rounded-full border text-[10px] font-bold shadow-lg transition ${
            active ? 'scale-110 border-[#C9A962] bg-[#C9A962] text-white' : 'border-white/70 bg-[#C9A962]/90 text-white hover:bg-[#C9A962]'
          }`}
        >
          ●
        </button>
      </Html>
    </mesh>
  )
}

export default function ProductModelCanvas({
  object,
  autoRotate = true,
  hotspots,
  pinSize,
}: ProductModelCanvasProps) {
  const [contextLost, setContextLost] = useState(false)
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const controlsRef = useRef<OrbitControlsImpl>(null)

  const computedPinSize = useMemo(() => {
    if (pinSize) return pinSize
    const box = new Box3().setFromObject(object)
    const size = box.getSize(new Vector3())
    return (Math.max(size.x, size.y, size.z) || 1) * 0.025
  }, [object, pinSize])

  const shadowConfig = useMemo(() => {
    const box = new Box3().setFromObject(object)
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    const maxDim = Math.max(size.x, size.y, size.z) || 1
    return {
      position: [center.x, box.min.y - maxDim * 0.02, center.z] as [number, number, number],
      scale: maxDim * 2,
      far: maxDim * 0.6,
    }
  }, [object])

  const handleCreated = useCallback((state: RootState) => {
    const renderer = state.gl
    renderer.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault()
      setContextLost(true)
    })
    renderer.domElement.addEventListener('webglcontextrestored', () => {
      setContextLost(false)
    })
  }, [])

  useEffect(() => {
    if (!controlsRef.current || !autoRotate) return
    controlsRef.current.autoRotate = true
    controlsRef.current.autoRotateSpeed = 1.2
  }, [autoRotate])

  useEffect(() => {
    if (!contextLost) return
    const timer = setInterval(() => {
      if (canvasRef.current) {
        const gl = canvasRef.current.getContext('webgl2') || canvasRef.current.getContext('webgl')
        if (gl) {
          setContextLost(false)
          clearInterval(timer)
        }
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [contextLost])

  const [prevObject, setPrevObject] = useState(object)
  if (prevObject !== object) {
    setPrevObject(object)
    setActiveHotspot(null)
  }

  if (contextLost) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-[inherit] bg-[var(--shop-bg-muted)]">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-pulse rounded-full bg-[var(--shop-border-medium)]" />
          <p className="text-sm text-[var(--shop-text-muted)]">3D preview unavailable</p>
        </div>
      </div>
    )
  }

  const activeSpot = hotspots?.find((hotspot) => hotspot.id === activeHotspot) ?? null

  return (
    <div className="!absolute !inset-0" style={{ touchAction: 'none' }}>
      <Canvas
        ref={canvasRef}
        className="!absolute !inset-0"
        camera={{ position: [0, 0, 8], fov: 38 }}
        dpr={[1, 1.5]}
        frameloop="demand"
        onCreated={handleCreated}
        gl={{
          powerPreference: 'high-performance',
          failIfMajorPerformanceCaveat: false,
          antialias: true,
          alpha: true,
        }}
      >
      <AdaptiveDpr pixelated />
      <color attach="background" args={['#FAF9F5']} />

      {/* Soft studio lighting for luxury presentation */}
      <ambientLight intensity={0.75} />
      <directionalLight position={[5, 8, 5]} intensity={1.1} castShadow />
      <directionalLight position={[-5, 4, -5]} intensity={0.35} color="#C9A962" />
      <pointLight position={[0, 4, 0]} intensity={0.25} color="#FFFFFF" />

      <Environment files="/hdri/studio_small_03_1k.hdr" resolution={128} />

      <Bounds fit clip observe margin={1.2}>
        <EntranceGroup>
          <primitive object={object}>
            {hotspots?.map((hotspot) => (
              <HotspotPin
                key={hotspot.id}
                hotspot={hotspot}
                size={computedPinSize}
                active={hotspot.id === activeHotspot}
                onSelect={() => setActiveHotspot((current) => (current === hotspot.id ? null : hotspot.id))}
              />
            ))}
          </primitive>
        </EntranceGroup>
      </Bounds>

      <ContactShadows
        position={shadowConfig.position}
        opacity={0.35}
        scale={shadowConfig.scale}
        blur={2.5}
        far={shadowConfig.far}
        color="#1C1917"
      />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan={false}
        enableZoom={true}
        enableRotate={true}
        minDistance={3}
        maxDistance={16}
        autoRotate={autoRotate}
        autoRotateSpeed={1.2}
      />
      </Canvas>

      {activeSpot && (
        <div className="pointer-events-none absolute inset-x-4 bottom-16 z-10 flex justify-center md:bottom-14">
          <div className="max-w-xs rounded-2xl border border-[var(--shop-border-gold)] bg-white/90 px-4 py-3 shadow-[var(--shop-shadow-md)] backdrop-blur-md">
            <p className="font-[var(--shop-font-heading)] text-sm font-semibold text-[var(--shop-text-primary)]">
              {activeSpot.label}
            </p>
            {activeSpot.description && (
              <p className="mt-1 text-xs leading-relaxed text-[var(--shop-text-secondary)]">{activeSpot.description}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
