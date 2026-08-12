import { fileTypeFromBuffer } from 'file-type'

export const MODEL_EXTENSIONS = new Set([
  'stl', 'obj', '3mf', 'step', 'iges', 'igs', 'brep',
  'glb', 'gltf', 'fbx', 'ply', 'dae', 'amf', 'vrl', 'dxf', 'dwg',
])
export const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp'])

const MODEL_MIME_TYPES = new Set([
  'model/stl',
  'application/sla',
  'application/octet-stream',
  'text/plain',
  'model/3mf',
  'image/vnd.dwg',
  'application/acad',
  'model/gltf-binary',
  'model/gltf+json',
  'application/fbx',
  'application/x-ply',
  'application/xml',
])

// Extensions where the extension alone is sufficient validation (magic bytes
// are unreliable, absent, or the format is complex to detect programmatically).
const EXTENSION_TRUSTED_FORMATS = new Set([
  'step', 'iges', 'igs', 'brep', 'dwg', 'dxf',
  'glb', 'gltf', 'fbx', 'ply', 'dae', 'amf', 'vrl',
])

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
])

export type FileValidationResult = {
  valid: boolean
  error?: string
  extension: string
  mimeType: string | undefined
}

function getExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? ''
}

function safeFileName(fileName: string): string {
  const extension = getExtension(fileName)
  const base = fileName.slice(0, Math.max(0, fileName.length - extension.length - 1))
  const sanitized = base.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 40)
  return `${sanitized}-${Date.now()}.${extension}`
}

export async function validateModelFile(file: File): Promise<FileValidationResult> {
  const extension = getExtension(file.name)
  if (!MODEL_EXTENSIONS.has(extension)) {
    return { valid: false, error: 'Unsupported model file format.', extension, mimeType: file.type }
  }

  if (file.size > 100 * 1024 * 1024) {
    return { valid: false, error: 'File is too large. Maximum allowed size is 100MB.', extension, mimeType: file.type }
  }

  // For extension-trusted formats, accept based on extension + size alone
  // (magic bytes are unreliable or absent for these formats)
  if (EXTENSION_TRUSTED_FORMATS.has(extension)) {
    return { valid: true, extension, mimeType: file.type }
  }

  const arrayBuffer = await file.arrayBuffer()
  const detected = await fileTypeFromBuffer(new Uint8Array(arrayBuffer))
  const mimeType = detected?.mime ?? file.type

  if (extension === 'svg') {
    return { valid: false, error: 'SVG uploads are not allowed.', extension, mimeType }
  }

  if (extension === 'stl') {
    // Binary STL starts with 80 bytes header; ASCII STL starts with "solid"
    const text = new TextDecoder().decode(arrayBuffer.slice(0, 80))
    if (text.toLowerCase().startsWith('solid')) return { valid: true, extension, mimeType }
  }

  if (extension === 'obj') {
    const text = new TextDecoder().decode(arrayBuffer.slice(0, 200))
    if (/^(v\s|#|o\s|mtllib|usemtl|f\s)/m.test(text)) return { valid: true, extension, mimeType }
  }

  if (extension === '3mf') {
    // 3MF files are ZIP archives
    const text = new TextDecoder().decode(arrayBuffer.slice(0, 4))
    if (text === 'PK\x03\x04') return { valid: true, extension, mimeType }
  }

  return { valid: true, extension, mimeType }
}

export async function validateImageFile(file: File): Promise<FileValidationResult> {
  const extension = getExtension(file.name)
  if (!IMAGE_EXTENSIONS.has(extension)) {
    return { valid: false, error: 'Unsupported image format.', extension, mimeType: file.type }
  }

  if (extension === 'svg') {
    return { valid: false, error: 'SVG uploads are not allowed.', extension, mimeType: file.type }
  }

  if (file.size > 5 * 1024 * 1024) {
    return { valid: false, error: 'Image is too large. Maximum allowed size is 5MB.', extension, mimeType: file.type }
  }

  const arrayBuffer = await file.arrayBuffer()
  const detected = await fileTypeFromBuffer(new Uint8Array(arrayBuffer))
  const mimeType = detected?.mime ?? file.type

  if (!IMAGE_MIME_TYPES.has(mimeType)) {
    return { valid: false, error: 'Invalid image file type.', extension, mimeType }
  }

  return { valid: true, extension, mimeType }
}

export { getExtension, safeFileName }

export function buildStoragePath(userId: string, quoteId: string, fileName: string): string {
  return `${userId}/${quoteId}/${safeFileName(fileName)}`
}
