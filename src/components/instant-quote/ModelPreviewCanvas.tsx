'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, type RootState } from '@react-three/fiber'
import { AdaptiveDpr, Bounds, ContactShadows, Environment, OrbitControls } from '@react-three/drei'
import {
  Box3,
  BoxGeometry,
  DoubleSide,
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  Plane,
  Vector3,
} from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { getMaterialShaderProps } from '@/lib/quote/material-shaders'

export type ModelPreviewCanvasProps = {
  object: Object3D
  materialId?: string
  colorName?: string
  displayMode?: 'solid' | 'wireframe' | 'xray'
  showBuildVolume?: boolean
  clippingZPercent?: number
  cameraPreset?: 'iso' | 'top' | 'front' | 'side' | null
  onPresetApplied?: () => void
}

function BuildVolumeCage() {
  const cageMesh = useMemo(() => {
    // Standard 3D printer build volume (220mm x 220mm x 250mm)
    const geometry = new BoxGeometry(220, 250, 220)
    const edges = new EdgesGeometry(geometry)
    const material = new LineBasicMaterial({ color: '#38bdf8', opacity: 0.35, transparent: true })
    const lineSegments = new LineSegments(edges, material)
    lineSegments.position.set(0, 70, 0)
    return lineSegments
  }, [])

  return <primitive object={cageMesh} />
}

function ViewerModel({
  object,
  materialId,
  colorName,
  displayMode = 'solid',
  clippingZPercent = 100,
}: {
  object: Object3D
  materialId?: string
  colorName?: string
  displayMode?: 'solid' | 'wireframe' | 'xray'
  clippingZPercent?: number
}) {
  const pbr = useMemo(() => getMaterialShaderProps(materialId, colorName), [materialId, colorName])

  const { clone, clippingPlanes } = useMemo(() => {
    const cloned = object.clone(true)
    cloned.updateMatrixWorld(true)

    const box = new Box3().setFromObject(cloned)
    const size = new Vector3()
    box.getSize(size)

    let planes: Plane[] = []
    if (clippingZPercent < 100) {
      const minZ = box.min.z
      const maxZ = box.max.z
      const cutZ = minZ + (maxZ - minZ) * (clippingZPercent / 100)
      // Normal points towards positive Z; plane constant is distance from origin
      planes = [new Plane(new Vector3(0, 0, -1), cutZ)]
    }

    cloned.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = true
        child.receiveShadow = true

        if (displayMode === 'wireframe') {
          child.material = new MeshStandardMaterial({
            color: pbr.color,
            wireframe: true,
            side: DoubleSide,
            clippingPlanes: planes,
          })
        } else if (displayMode === 'xray') {
          child.material = new MeshPhysicalMaterial({
            color: pbr.color,
            transparent: true,
            opacity: 0.35,
            roughness: 0.1,
            metalness: 0.1,
            depthWrite: false,
            side: DoubleSide,
            clippingPlanes: planes,
          })
        } else {
          // Solid PBR Shading
          child.material = new MeshPhysicalMaterial({
            color: pbr.color,
            roughness: pbr.roughness,
            metalness: pbr.metalness,
            clearcoat: pbr.clearcoat ?? 0,
            clearcoatRoughness: pbr.clearcoatRoughness ?? 0.1,
            transmission: pbr.transmission ?? 0,
            ior: pbr.ior ?? 1.5,
            side: DoubleSide,
            clippingPlanes: planes,
          })
        }
      }
    })

    return { clone: cloned, clippingPlanes: planes }
  }, [object, pbr, displayMode, clippingZPercent])

  return <primitive object={clone} />
}

export default function ModelPreviewCanvas({
  object,
  materialId,
  colorName,
  displayMode = 'solid',
  showBuildVolume = false,
  clippingZPercent = 100,
  cameraPreset,
  onPresetApplied,
}: ModelPreviewCanvasProps) {
  const [contextLost, setContextLost] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const controlsRef = useRef<OrbitControlsImpl>(null)

  const handleCreated = useCallback((state: RootState) => {
    const renderer = state.gl
    renderer.localClippingEnabled = true
    renderer.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault()
      setContextLost(true)
    })
    renderer.domElement.addEventListener('webglcontextrestored', () => {
      setContextLost(false)
    })
  }, [])

  useEffect(() => {
    if (!controlsRef.current || !cameraPreset) return

    const controls = controlsRef.current
    if (cameraPreset === 'iso') {
      controls.object.position.set(140, 120, 140)
    } else if (cameraPreset === 'top') {
      controls.object.position.set(0, 220, 0.001)
    } else if (cameraPreset === 'front') {
      controls.object.position.set(0, 0, 220)
    } else if (cameraPreset === 'side') {
      controls.object.position.set(220, 0, 0)
    }

    controls.target.set(0, 0, 0)
    controls.update()

    if (onPresetApplied) {
      onPresetApplied()
    }
  }, [cameraPreset, onPresetApplied])

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
      frameloop="demand"
      onCreated={handleCreated}
      gl={{
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false,
        localClippingEnabled: true,
      }}
    >
      <AdaptiveDpr pixelated />
      <color attach="background" args={['#070a12']} />
      
      {/* Studio Environment & Lighting */}
      <Environment preset="city" />
      <ambientLight intensity={0.65} />
      <directionalLight position={[120, 150, 80]} intensity={1.2} castShadow />
      <directionalLight position={[-100, -60, -80]} intensity={0.35} />
      
      {/* Grid & Shadows */}
      <gridHelper args={[280, 28, '#38bdf8', '#1e293b']} position={[0, -55, 0]} />
      <ContactShadows position={[0, -54.9, 0]} opacity={0.6} scale={200} blur={2.2} far={40} />

      {/* Build Plate Cage Envelope */}
      {showBuildVolume && <BuildVolumeCage />}

      <Bounds fit clip observe margin={1.3}>
        <ViewerModel
          object={object}
          materialId={materialId}
          colorName={colorName}
          displayMode={displayMode}
          clippingZPercent={clippingZPercent}
        />
      </Bounds>

      <OrbitControls ref={controlsRef} makeDefault enablePan enableZoom enableRotate />
    </Canvas>
  )
}
