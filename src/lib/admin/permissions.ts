'use server'

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export type AdminPermission =
  | 'orders.view'
  | 'orders.update'
  | 'payments.view'
  | 'payments.override'
  | 'refunds.create'
  | 'refunds.approve'
  | 'finance.settings'
  | 'quotes.approve'
  | 'printers.manage'
  | 'manufacturing.manage'
  | 'admin.users'
  | 'audit.view'

export type AdminPermissionCheck = {
  user: { id: string; email: string }
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
  isAdmin: boolean
  isFinance: boolean
  isOrderManager: boolean
  isPrinterManager: boolean
  isQcManager: boolean
}

export async function getAdminPermissionCheck(): Promise<
  AdminPermissionCheck | { response: NextResponse }
> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    if (error.code === 'refresh_token_not_found') {
      return { response: NextResponse.json({ error: 'Session expired' }, { status: 401 }) }
    }
    return { response: NextResponse.json({ error: error.message }, { status: 401 }) }
  }

  const user = data.user
  if (!user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin, is_finance, is_order_manager, is_printer_manager, is_qc_manager')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    return { response: NextResponse.json({ error: profileError.message }, { status: 500 }) }
  }

  const isAdmin = Boolean(profile?.is_admin)
  const isFinance = Boolean(profile?.is_finance)
  const isOrderManager = Boolean(profile?.is_order_manager)
  const isPrinterManager = Boolean(profile?.is_printer_manager)
  const isQcManager = Boolean(profile?.is_qc_manager)

  if (!isAdmin && !isFinance && !isOrderManager && !isPrinterManager && !isQcManager) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return {
    user: { id: user.id, email: user.email ?? '' },
    supabase,
    isAdmin,
    isFinance,
    isOrderManager,
    isPrinterManager,
    isQcManager,
  }
}

export async function hasPermission(check: AdminPermissionCheck, permission: AdminPermission): Promise<boolean> {
  if (check.isAdmin) return true

  switch (permission) {
    case 'orders.view':
    case 'payments.view':
    case 'audit.view':
      return true
    case 'orders.update':
      return check.isOrderManager
    case 'payments.override':
    case 'refunds.create':
    case 'refunds.approve':
    case 'finance.settings':
      return check.isFinance
    case 'quotes.approve':
      return check.isOrderManager || check.isFinance
    case 'printers.manage':
      return check.isPrinterManager
    case 'manufacturing.manage':
      return check.isQcManager
    case 'admin.users':
      return check.isAdmin
    default:
      return false
  }
}

export async function requirePermission(check: AdminPermissionCheck, permission: AdminPermission) {
  if (!hasPermission(check, permission)) {
    return NextResponse.json(
      { error: `Forbidden: permission ${permission} required.` },
      { status: 403 }
    )
  }
  return null
}

export async function requireAdminPermission(permission: AdminPermission) {
  const check = await getAdminPermissionCheck()
  if ('response' in check) return check
  const denied = await requirePermission(check, permission)
  if (denied) return { response: denied }
  return check
}

export async function requireAnyAdminPermission(permissions: AdminPermission[]) {
  const check = await getAdminPermissionCheck()
  if ('response' in check) return check
  const hasAny = await Promise.all(permissions.map((permission) => hasPermission(check, permission))).then(
    (results) => results.some(Boolean)
  )
  if (!hasAny) {
    return {
      response: NextResponse.json(
        { error: `Forbidden: one of ${permissions.join(', ')} required.` },
        { status: 403 }
      ),
    }
  }
  return check
}
