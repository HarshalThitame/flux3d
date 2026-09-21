import { NextResponse } from 'next/server'
import { createAdminSupabaseClient, requireAdminUser } from '@/lib/admin/server'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ orderId: string }>
}

export async function GET(request: Request, props: Props) {
  try {
    await requireAdminUser()
    const { orderId } = await props.params
    const supabase = createAdminSupabaseClient()
    
    const { data: order, error } = await supabase
      .from('custom_orders')
      .select('*, items:custom_order_items(*)')
      .eq('id', orderId)
      .single()
      
    if (error) throw new Error(error.message)
    
    return NextResponse.json(order)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function PATCH(request: Request, props: Props) {
  try {
    await requireAdminUser()
    const { orderId } = await props.params
    const body = await request.json()
    const supabase = createAdminSupabaseClient()
    
    const updates: any = {}
    if (body.status !== undefined) updates.status = body.status
    if (body.payment_status !== undefined) updates.payment_status = body.payment_status
    if (body.admin_notes !== undefined) updates.admin_notes = body.admin_notes
    if (body.delivery_address !== undefined) updates.delivery_address = body.delivery_address
    
    const { data: order, error } = await supabase
      .from('custom_orders')
      .update(updates)
      .eq('id', orderId)
      .select('*, items:custom_order_items(*)')
      .single()
      
    if (error) throw new Error(error.message)
    
    return NextResponse.json(order)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
