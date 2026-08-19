'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, type RootState } from '@react-three/fiber'
import { AdaptiveDpr, Bounds, ContactShadows, Environment, OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { Box3, Vector3, type Object3D } from 'three'

type ProductModelCanvasProps = {
  object: Object3D
  autoRotate?: boolean
  productName?: string
}

export default function ProductModelCanvas({ object, autoRotate = true }: ProductModelCanvasProps) {
  const [contextLost, setContextLost] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const controlsRef = useRef<OrbitControlsImpl>(null)

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
        <primitive object={object} />
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
    </div>
  )
}
