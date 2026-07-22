'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, type RootState } from '@react-three/fiber'
import { AdaptiveDpr, Bounds, OrbitControls } from '@react-three/drei'
import type { Object3D } from 'three'

function ViewerModel({ object }: { object: Object3D }) {
  const clone = useMemo(() => object.clone(true), [object])

  return <primitive object={clone} />
}

export default function ModelPreviewCanvas({ object }: { object: Object3D }) {
  const [contextLost, setContextLost] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

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
    if (contextLost) {
      const timer = setInterval(() => {
        if (canvasRef.current) {
          const canvas = canvasRef.current
          const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
          if (gl) {
            setContextLost(false)
            clearInterval(timer)
          }
        }
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [contextLost])

  if (contextLost) {
    return (
      <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-[#070a12]">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-pulse rounded-full bg-white/10" />
          <p className="text-sm text-white/60">3D preview unavailable</p>
          <p className="mt-1 text-xs text-white/30">WebGL context was lost. Reload the page to restore.</p>
        </div>
      </div>
    )
  }

  return (
    <Canvas
      ref={canvasRef}
      className="!absolute !inset-0"
      camera={{ position: [140, 120, 140], fov: 34 }}
      dpr={[1, 1.5]}
      onCreated={handleCreated}
      gl={{ powerPreference: 'high-performance', failIfMajorPerformanceCaveat: false }}
    >
      <AdaptiveDpr pixelated />
      <color attach="background" args={['#070a12']} />
      <ambientLight intensity={0.95} />
      <directionalLight position={[120, 120, 80]} intensity={1.15} />
      <directionalLight position={[-80, -50, -60]} intensity={0.4} />
      <gridHelper args={[280, 28, '#67e8f9', '#172554']} position={[0, -55, 0]} />
      <Bounds fit clip observe margin={1.3}>
        <ViewerModel object={object} />
      </Bounds>
      <OrbitControls makeDefault enablePan enableZoom enableRotate />
    </Canvas>
  )
}
