'use client'

import { AMFLoader, ColladaLoader, FBXLoader, GLTFLoader, OBJLoader, PLYLoader, STLLoader, ThreeMFLoader } from 'three-stdlib'
import {
  Box3,
  BufferGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three'
import type { ParsedModel } from '@/lib/quote/types'

const defaultMaterial = new MeshStandardMaterial({
  color: '#a5b4fc',
  roughness: 0.35,
  metalness: 0.08,
})

function getFileExtension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() ?? ''
}

function computeGeometryVolume(geometry: BufferGeometry) {
  const position = geometry.getAttribute('position')
  if (!position) {
    return 0
  }

  const index = geometry.getIndex()
  let volume = 0

  const readVertex = (vertexIndex: number) => {
    return new Vector3(
      position.getX(vertexIndex),
      position.getY(vertexIndex),
      position.getZ(vertexIndex)
    )
  }

  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      const a = readVertex(index.getX(i))
      const b = readVertex(index.getX(i + 1))
      const c = readVertex(index.getX(i + 2))
      volume += a.dot(b.clone().cross(c)) / 6
    }
  } else {
    for (let i = 0; i < position.count; i += 3) {
      const a = readVertex(i)
      const b = readVertex(i + 1)
      const c = readVertex(i + 2)
      volume += a.dot(b.clone().cross(c)) / 6
    }
  }

  return Math.abs(volume)
}

const PARSEABLE_EXTENSIONS = new Set(['stl', 'obj', '3mf', 'glb', 'gltf', 'fbx', 'ply', 'dae', 'amf'])
const UNPARSABLE_EXTENSIONS = new Set(['step', 'stp', 'iges', 'igs', 'brep', 'dwg', 'dxf'])

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

function gatherModelStats(root: Object3D) {
  root.updateMatrixWorld(true)
  const box = new Box3().setFromObject(root)
  const size = new Vector3()
  box.getSize(size)

  let volumeMm3 = 0
  let triangleCount = 0

  root.traverse((child) => {
    if (child instanceof Mesh && child.geometry) {
      const cloned = child.geometry.clone()
      cloned.applyMatrix4(child.matrixWorld as Matrix4)
      volumeMm3 += computeGeometryVolume(cloned)
      const position = cloned.getAttribute('position')
      if (position) {
        triangleCount += position.count / 3
      }
      cloned.dispose()
    }
  })

  return {
    dimensionsMm: {
      x: size.x,
      y: size.y,
      z: size.z,
    },
    volumeMm3,
    triangleCount: Math.round(triangleCount),
  }
}

function suggestMaterialByModel(dimensionsMm: { x: number; y: number; z: number }, volumeMm3: number) {
  const largestDimension = Math.max(dimensionsMm.x, dimensionsMm.y, dimensionsMm.z)
  const volumeCm3 = volumeMm3 / 1000

  if (largestDimension <= 65 && volumeCm3 <= 40) {
    return 'resin-4k'
  }

  if (largestDimension >= 180 || volumeCm3 >= 250) {
    return 'petg'
  }

  return 'pla-plus'
}

function objectFromGeometry(geometry: BufferGeometry) {
  geometry.center()
  const mesh = new Mesh(geometry, defaultMaterial.clone())
  const group = new Group()
  group.add(mesh)
  return group
}

function fixOrientation(object: Object3D, extension: string) {
  if (['stl', 'obj', '3mf', 'dae', 'fbx', 'amf'].includes(extension)) {
    object.rotation.x = -Math.PI / 2
  }
}

export async function parseModelFile(file: File): Promise<ParsedModel> {
  const extension = getFileExtension(file.name)
  const arrayBuffer = await file.arrayBuffer()

  if (UNPARSABLE_EXTENSIONS.has(extension)) {
    return {
      fileName: file.name,
      fileSize: file.size,
      extension,
      object: null as unknown as Object3D,
      dimensionsMm: { x: 0, y: 0, z: 0 },
      volumeMm3: 0,
      triangleCount: 0,
      suggestedMaterialId: 'pla',
      requiresReview: true,
    }
  }

  if (!PARSEABLE_EXTENSIONS.has(extension)) {
    throw new Error('Unsupported file format. Please upload STL, OBJ, 3MF, GLB, GLTF, FBX, PLY, DAE, AMF, STEP, IGES, BREP, DWG, or DXF.')
  }

  let object: Object3D

  if (extension === 'stl') {
    const geometry = new STLLoader().parse(arrayBuffer)
    object = objectFromGeometry(geometry)
  } else if (extension === 'obj') {
    const text = new TextDecoder().decode(arrayBuffer)
    object = new OBJLoader().parse(text)
  } else if (extension === '3mf') {
    object = new ThreeMFLoader().parse(arrayBuffer)
  } else if (extension === 'glb' || extension === 'gltf') {
    const gltf = await new Promise<{ scene: Object3D }>((resolve, reject) => {
      new GLTFLoader().parse(
        arrayBuffer,
        '',
        (gltf) => resolve(gltf),
        reject
      )
    })
    object = gltf.scene ?? new Group()
    normalizeMeshMaterials(object)
  } else if (extension === 'fbx') {
    const text = new TextDecoder().decode(arrayBuffer)
    object = new FBXLoader().parse(text, '')
    normalizeMeshMaterials(object)
  } else if (extension === 'ply') {
    const geometry = new PLYLoader().parse(arrayBuffer)
    object = objectFromGeometry(geometry)
  } else if (extension === 'dae') {
    const text = new TextDecoder().decode(arrayBuffer)
    const collada = new ColladaLoader().parse(text, '')
    object = collada.scene ?? new Group()
    normalizeMeshMaterials(object)
  } else if (extension === 'amf') {
    object = new AMFLoader().parse(arrayBuffer)
    normalizeMeshMaterials(object)
  } else {
    throw new Error('Unsupported file format. Please upload STL, OBJ, 3MF, GLB, GLTF, FBX, PLY, DAE, or AMF.')
  }

  fixOrientation(object, extension)
  normalizeMeshMaterials(object)
  const { dimensionsMm, volumeMm3, triangleCount } = gatherModelStats(object)

  return {
    fileName: file.name,
    fileSize: file.size,
    extension,
    object,
    dimensionsMm,
    volumeMm3,
    triangleCount,
    suggestedMaterialId: suggestMaterialByModel(dimensionsMm, volumeMm3),
    requiresReview: false,
  }
}

