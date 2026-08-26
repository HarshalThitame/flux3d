'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr, Bounds, ContactShadows, Environment, OrbitControls } from '@react-three/drei'
import { Box3, Vector3, type Object3D } from 'three'
import type { ShopProductHotspot } from '@/lib/shop/admin-types'

type HotspotEditorCanvasProps = {
  object: Object3D
  hotspots: ShopProductHotspot[]
  pinSize: number
  onSurfaceClick: (localPoint: Vector3) => void
}

export default function HotspotEditorCanvas({ object, hotspots, pinSize, onSurfaceClick }: HotspotEditorCanvasProps) {
  const [contextLost, setContextLost] = useState(false)
  const downPos = useRef<{ x: number; y: number } | null>(null)

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

  const handleCreated = useCallback((state: { gl: { domElement: HTMLCanvasElement } }) => {
    const el = state.gl.domElement
    el.addEventListener('webglcontextlost', (event) => {
      event.preventDefault()
      setContextLost(true)
    })
    el.addEventListener('webglcontextrestored', () => setContextLost(false))
  }, [])

  const handlePointerDown = useCallback((event: { clientX: number; clientY: number }) => {
    downPos.current = { x: event.clientX, y: event.clientY }
  }, [])

  const handlePointerUp = useCallback(
    (event: { clientX: number; clientY: number; point: Vector3; stopPropagation: () => void }) => {
      const start = downPos.current
      downPos.current = null
      if (!start) return
      const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y)
      if (distance > 5) return
      event.stopPropagation()
      onSurfaceClick(object.worldToLocal(event.point.clone()))
    },
    [object, onSurfaceClick]
  )

  if (contextLost) {
    return (
      <div className="flex h-80 items-center justify-center rounded-2xl bg-gray-50 text-sm text-[#6F7192]">
        3D preview unavailable
      </div>
    )
  }

  return (
    <div className="h-80 w-full" style={{ touchAction: 'none' }}>
      <Canvas
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

        <ambientLight intensity={0.75} />
        <directionalLight position={[5, 8, 5]} intensity={1.1} />
        <directionalLight position={[-5, 4, -5]} intensity={0.35} color="#C9A962" />

        <Environment files="/hdri/studio_small_03_1k.hdr" resolution={128} />

        <Bounds fit clip observe margin={1.2}>
          <primitive object={object} onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
            {hotspots.map((hotspot) => (
              <mesh key={hotspot.id} position={hotspot.position}>
                <sphereGeometry args={[pinSize, 16, 16]} />
                <meshStandardMaterial color="#C9A962" emissive="#C9A962" emissiveIntensity={0.45} />
              </mesh>
            ))}
          </primitive>
        </Bounds>

        <ContactShadows
          position={shadowConfig.position}
          opacity={0.35}
          scale={shadowConfig.scale}
          blur={2.5}
          far={shadowConfig.far}
          color="#1C1917"
        />

        <OrbitControls makeDefault enablePan={false} minDistance={3} maxDistance={16} />
      </Canvas>
    </div>
  )
}
