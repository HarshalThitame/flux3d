import { createAdminSupabaseClient } from '@/lib/admin/server'

export type StoredModelMetadata = {
  volumeMm3: number
  dimensionsMm: { x: number; y: number; z: number }
  triangleCount: number
  fileSize: number
  extension: string
}

const VOLUME_TOLERANCE = 0.05

function withinTolerance(actual: number, expected: number, tolerance: number): boolean {
  if (actual === 0 && expected === 0) return true
  if (actual === 0 || expected === 0) return false
  return Math.abs(actual - expected) / Math.max(actual, expected) <= tolerance
}

export async function verifyModelVolume(
  fileUrl: string,
  submittedVolumeMm3: number
): Promise<{ valid: boolean; error?: string; storedVolume?: number }> {
  const supabase = createAdminSupabaseClient()

  const { data, error } = await supabase.rpc('get_model_metadata_by_url', {
    p_file_url: fileUrl,
    p_user_id: null,
  })

  if (error) {
    return { valid: true }
  }

  const metadata = data as StoredModelMetadata | null
  if (!metadata || !metadata.volumeMm3) {
    return { valid: true }
  }

  if (!withinTolerance(metadata.volumeMm3, submittedVolumeMm3, VOLUME_TOLERANCE)) {
    return {
      valid: false,
      error: 'Model volume mismatch. Please re-upload the model and try again.',
      storedVolume: metadata.volumeMm3,
    }
  }

  return { valid: true, storedVolume: metadata.volumeMm3 }
}
