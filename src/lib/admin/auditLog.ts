'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { redactForAuditLog } from '@/lib/security/redact'
import { reportError } from '@/lib/error-handling'
import type { AdminAuditTargetType, Json } from '../../../types/database'

type LogAdminActionParams = {
  admin_id: string
  action: string
  target_type: AdminAuditTargetType
  target_id: string
  old_value?: unknown
  new_value?: unknown
}

function normalizeJson(value: unknown): Json | null {
  if (value === undefined || value === null) {
    return null
  }

  try {
    return JSON.parse(JSON.stringify(redactForAuditLog(value))) as Json
  } catch {
    return null
  }
}

export async function logAdminAction(params: LogAdminActionParams) {
  if (!params.admin_id || !params.action || !params.target_type || !params.target_id) return
  try {
    const supabase = createAdminClient()
    await supabase.from('admin_audit_logs').insert({
      admin_id: params.admin_id,
      action: params.action.slice(0, 128),
      target_type: params.target_type,
      target_id: params.target_id,
      old_value: normalizeJson(params.old_value),
      new_value: normalizeJson(params.new_value),
    })
  } catch (error) {
    // Never block the primary admin operation on an audit write failure.
    reportError(error, 'Admin audit log insertion failed', {
      module: 'admin',
      level: 'warn',
      tags: { action: params.action, adminId: params.admin_id },
    })
  }
}
