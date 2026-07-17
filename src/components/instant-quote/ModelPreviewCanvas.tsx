'use client'

import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Bounds, OrbitControls } from '@react-three/drei'
import type { Object3D } from 'three'

function ViewerModel({ object }: { object: Object3D }) {
  const clone = useMemo(() => object.clone(true), [object])

  return <primitive object={clone} />
}

export default function ModelPreviewCanvas({ object }: { object: Object3D }) {
  return (
    <Canvas className="!absolute !inset-0" camera={{ position: [140, 120, 140], fov: 34 }} dpr={[1, 1.7]}>
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
