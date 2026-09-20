export type CustomOrderStatus = 'pending' | 'in_production' | 'ready' | 'delivered' | 'cancelled'
export type PaymentStatus = 'pending' | 'link_sent' | 'paid' | 'refunded'
export type SourceChannel = 'whatsapp' | 'instagram' | 'email' | 'phone' | 'in_person' | 'other'

export interface CustomOrderItem {
  id?: string
  order_id?: string
  description: string
  material: string
  color: string
  quantity: number
  unit_price: number
  image_url?: string | null
}

export interface CustomOrder {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  status: CustomOrderStatus
  payment_status: PaymentStatus
  total_amount: number
  source_channel: SourceChannel
  delivery_address: string | null
  admin_notes: string | null
  payment_link_id: string | null
  payment_link_url: string | null
  created_at: string
  updated_at: string
  items?: CustomOrderItem[]
}

export interface CreateCustomOrderInput {
  customer_name: string
  customer_phone: string
  customer_email?: string
  source_channel: SourceChannel
  delivery_address?: string
  admin_notes?: string
  items: Omit<CustomOrderItem, 'id' | 'order_id'>[]
}

export const CustomOrderStatusLabels: Record<CustomOrderStatus, string> = {
  pending: 'Pending',
  in_production: 'In Production',
  ready: 'Ready for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export const CustomOrderStatusColors: Record<CustomOrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  in_production: 'bg-blue-100 text-blue-700',
  ready: 'bg-purple-100 text-purple-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
}

export const PaymentStatusLabels: Record<PaymentStatus, string> = {
  pending: 'Unpaid',
  link_sent: 'Link Sent',
  paid: 'Paid',
  refunded: 'Refunded',
}

export const PaymentStatusColors: Record<PaymentStatus, string> = {
  pending: 'bg-gray-100 text-gray-700',
  link_sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  refunded: 'bg-red-100 text-red-700',
}
