'use client'

import { GLTFLoader, OBJLoader, STLLoader, ThreeMFLoader } from 'three-stdlib'
import { Box3, BufferGeometry, Color, Group, Matrix4, Mesh, MeshStandardMaterial, Object3D, Vector3 } from 'three'

const defaultMaterial = new MeshStandardMaterial({
  color: '#e7e5e4',
  roughness: 0.45,
  metalness: 0.05,
})

function getFileExtension(url: string) {
  try {
    const pathname = new URL(url).pathname
    const match = pathname.split('.').pop()
    return match ? match.toLowerCase() : ''
  } catch {
    const match = url.split('.').pop()
    return match ? match.toLowerCase().split('?')[0] : ''
  }
}

function objectFromGeometry(geometry: BufferGeometry) {
  geometry.center()
  const mesh = new Mesh(geometry, defaultMaterial.clone())
  const group = new Group()
  group.add(mesh)
  return group
}

function normalizeMeshMaterials(root: Object3D) {
  root.traverse((child) => {
    if (child instanceof Mesh) {
      child.material = Array.isArray(child.material)
        ? child.material
        : child.material ?? defaultMaterial.clone()
      child.castShadow = true
      child.receiveShadow = true
      if (child.geometry) {
        child.geometry.computeBoundingBox()
        child.geometry.computeVertexNormals()
      }
    }
  })
}

function fixOrientation(object: Object3D, extension: string) {
  // STL/OBJ/3MF often have Z-up coordinate systems; rotate to match Y-up presentation
  if (['stl', 'obj', '3mf'].includes(extension)) {
    object.rotation.x = -Math.PI / 2
  }
}

export type LoadedShopModel = {
  object: Object3D
  extension: string
  dimensions: { x: number; y: number; z: number }
}

export async function loadShopModel(modelUrl: string): Promise<LoadedShopModel> {
  const extension = getFileExtension(modelUrl)
  const response = await fetch(modelUrl)
  if (!response.ok) throw new Error(`Failed to fetch model: ${response.status} ${response.statusText}`)

  const arrayBuffer = await response.arrayBuffer()
  let object: Object3D

  if (extension === 'glb' || extension === 'gltf') {
    object = await new Promise<Object3D>((resolve, reject) => {
      new GLTFLoader().parse(
        arrayBuffer,
        '',
        (gltf) => {
          const scene = gltf.scene ?? new Group()
          normalizeMeshMaterials(scene)
          resolve(scene)
        },
        (error) => reject(error)
      )
    })
  } else if (extension === 'stl') {
    const geometry = new STLLoader().parse(arrayBuffer)
    object = objectFromGeometry(geometry)
    fixOrientation(object, extension)
  } else if (extension === 'obj') {
    const text = new TextDecoder().decode(arrayBuffer)
    object = new OBJLoader().parse(text)
    normalizeMeshMaterials(object)
    fixOrientation(object, extension)
  } else if (extension === '3mf') {
    object = new ThreeMFLoader().parse(arrayBuffer)
    normalizeMeshMaterials(object)
    fixOrientation(object, extension)
  } else {
    throw new Error('Unsupported model format. Please use GLB, GLTF, STL, OBJ, or 3MF.')
  }

  object.updateMatrixWorld(true)
  const box = new Box3().setFromObject(object)
  const size = new Vector3()
  box.getSize(size)

  return {
    object,
    extension,
    dimensions: { x: size.x, y: size.y, z: size.z },
  }
}

/**
 * Live-tint the model's base color for variant-driven 3D previews.
 * The first tint caches each material's original color so passing `null`
 * (or a falsy value) restores the untouched presentation.
 */
export function applyVariantTint(object: Object3D, tintColor: string | null | undefined) {
  const variant = tintColor ? new Color(tintColor.trim()) : null
  if (tintColor && variant?.getStyle() === 'rgb(0, 0, 0)' && !/^(#000|black|rgb\(0,\s*0,\s*0\))$/i.test(tintColor.trim())) {
    // THREE.Color falls back to black-ish on unparsable input in some paths;
    // bail out rather than painting the whole model black.
    return
  }
  object.traverse((child) => {
    if (!(child instanceof Mesh)) return
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    for (const material of materials) {
      const standard = material as MeshStandardMaterial
      if (!standard || !(standard as unknown as { isMeshStandardMaterial?: boolean }).isMeshStandardMaterial) continue
      if (standard.userData._fluxOriginalColor === undefined) {
        standard.userData._fluxOriginalColor = standard.color.getHex()
      }
      const original = new Color(standard.userData._fluxOriginalColor as number)
      if (variant) {
        standard.color.copy(original).multiply(variant)
      } else {
        standard.color.copy(original)
      }
    }
  })
}
