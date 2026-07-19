export function isAdminDebugModeEnabled(): boolean {
  return (process.env.ADMIN_DEBUG_MODE ?? '').trim().toLowerCase() === 'true'
}

export function requireDebugMode(): boolean {
  return isAdminDebugModeEnabled()
}
