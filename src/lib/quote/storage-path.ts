export function normalizeOwnedStoragePath(value: string, ownerId: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    throw new Error('File path is missing.')
  }

  if (trimmed.startsWith('/') || trimmed.includes('://') || trimmed.includes('\\')) {
    throw new Error('Invalid file path.')
  }

  if (trimmed.includes('..')) {
    throw new Error('Invalid file path.')
  }

  if (!trimmed.startsWith(`${ownerId}/`)) {
    throw new Error('File path does not belong to the current account.')
  }

  return trimmed
}
