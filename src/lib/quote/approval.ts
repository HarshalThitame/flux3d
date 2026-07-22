import { createAdminSupabaseClient } from '@/lib/admin/server'

async function assertIsAdmin(userId: string) {
  const supabase = createAdminSupabaseClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle()

  if (!profile?.is_admin) {
    throw new Error('Only admin users can approve quotes.')
  }
}

export async function isQuoteApproved(orderId: string): Promise<boolean> {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('quote_versions')
    .select('id')
    .eq('order_id', orderId)
    .eq('status', 'approved')
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[quote-approval] Failed to check quote approval:', error)
    return false
  }

  return Boolean(data)
}

export async function approveQuoteVersion(
  orderId: string,
  approvedByAdminId: string
) {
  await assertIsAdmin(approvedByAdminId)

  const supabase = createAdminSupabaseClient()
  const { data: latest } = await supabase
    .from('quote_versions')
    .select('id')
    .eq('order_id', orderId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!latest) {
    throw new Error('No quote version found for this order.')
  }

  const { error } = await supabase
    .from('quote_versions')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: approvedByAdminId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', latest.id)

  if (error) throw new Error(error.message)

  await supabase
    .from('orders')
    .update({ status: 'confirmed', updated_at: new Date().toISOString() })
    .eq('id', orderId)
}
