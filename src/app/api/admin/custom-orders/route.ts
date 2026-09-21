import { NextResponse } from 'next/server'
import { createAdminSupabaseClient, requireAdminUser } from '@/lib/admin/server'
import type { CreateCustomOrderInput } from '@/lib/custom-orders/types'
import { nanoid } from 'nanoid'

export const dynamic = 'force-dynamic'

function parsePositiveInteger(value: string | null, fallback: number, max?: number) {
  const next = Number(value)
  if (!Number.isInteger(next) || next <= 0) return fallback
  return max ? Math.min(next, max) : next
}

export async function GET(request: Request) {
  try {
    await requireAdminUser()
    const { searchParams } = new URL(request.url)
    const page = parsePositiveInteger(searchParams.get('page'), 1)
    const limit = parsePositiveInteger(searchParams.get('limit'), 20, 100)
    const status = searchParams.get('status')
    const paymentStatus = searchParams.get('payment_status')
    const search = searchParams.get('search')
    
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    const supabase = createAdminSupabaseClient()
    
    let query = supabase
      .from('custom_orders')
      .select('*, items:custom_order_items(*)', { count: 'exact' })
      
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (paymentStatus && paymentStatus !== 'all') {
      query = query.eq('payment_status', paymentStatus)
    }
    if (search) {
      query = query.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`)
    }
    
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)
      
    if (error) throw new Error(error.message)
    
    return NextResponse.json({
      orders: data ?? [],
      page,
      limit,
      total: count ?? 0,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser()
    const body = await request.json() as CreateCustomOrderInput
    const supabase = createAdminSupabaseClient()
    
    if (!body.customer_name || !body.customer_phone || !body.items || body.items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    const totalAmount = body.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0)
    
    // Auto-generate order number (CUST-XXXXXX)
    const orderNumber = `CUST-${nanoid(6).toUpperCase()}`
    
    const { data: order, error: orderError } = await supabase
      .from('custom_orders')
      .insert({
        order_number: orderNumber,
        customer_name: body.customer_name,
        customer_phone: body.customer_phone,
        customer_email: body.customer_email || null,
        source_channel: body.source_channel || 'other',
        delivery_address: body.delivery_address || null,
        admin_notes: body.admin_notes || null,
        status: 'pending',
        payment_status: 'pending',
        total_amount: totalAmount,
      })
      .select('*')
      .single()
      
    if (orderError) throw new Error(orderError.message)
    
    const itemsToInsert = body.items.map(item => ({
      order_id: order.id,
      description: item.description,
      material: item.material,
      color: item.color,
      quantity: item.quantity,
      unit_price: item.unit_price,
      image_url: item.image_url || null
    }))
    
    const { data: items, error: itemsError } = await supabase
      .from('custom_order_items')
      .insert(itemsToInsert)
      .select('*')
      
    if (itemsError) throw new Error(itemsError.message)
    
    return NextResponse.json({
      ...order,
      items
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
