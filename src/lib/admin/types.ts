import type { LucideIcon } from 'lucide-react'

export type AdminNavItem = {
  label: string
  href: string
  icon: LucideIcon
}

export type DashboardMetric = {
  label: string
  value: string
  change: string
  tone: 'neutral' | 'positive' | 'warning'
}

export type OrderStatus =
  | 'pending'
  | 'reviewed'
  | 'approved'
  | 'printing'
  | 'completed'
  | 'rejected'

export type QuoteStatus = 'pending' | 'approved' | 'rejected' | 'converted'

export type UserRole = 'admin' | 'operator' | 'customer-success'

export type AdminOrder = {
  id: string
  orderNumber: string | null
  fileUrl?: string
  fullName: string
  phone?: string
  addressLine1?: string
  city?: string
  state?: string
  pincode?: string
  deliveryCharge?: number
  totalPrice: number
  material: string
  status: OrderStatus
  createdAt: string
  notes: string | null
}

export type AdminQuote = {
  id: string
  quote_id: string | null
  name: string
  email: string
  config: { materialId?: string; layerHeight?: number; infill?: number } | null
  estimate: { total?: number } | null
  status: QuoteStatus
  createdAt: string
}

export type AdminUser = {
  id: string
  name: string
  email: string
  signupMethod: 'Google' | 'Email' | 'GitHub'
  role: UserRole
  lastActive: string
}

export type AdminMaterial = {
  id: string
  name: string
  price_per_gram: number
  density: number
  colors: string[]
  stock: 'Healthy' | 'Low' | 'Paused'
  created_at?: string
}

export type AdminFile = {
  id: string
  name: string
  user: string
  uploadedAt: string
  size: string
}

export type ActivityItem = {
  id: string
  title: string
  meta: string
  type: 'order' | 'quote' | 'user' | 'material'
  time: string
}

export type TrendPoint = {
  label: string
  value: number
}

export type DonutSlice = {
  label: string
  value: number
  color: string
}
