import type { LucideIcon } from 'lucide-react'
import type { OrderStatus } from '@/lib/orders'

export type { OrderStatus } from '@/lib/orders'

export type AdminNavItem = {
  label: string
  href: string
  icon: LucideIcon
  section?: 'main' | 'secondary'
}

export type DashboardMetric = {
  label: string
  value: string
  change?: string
  subtext?: string
  tone: 'neutral' | 'positive' | 'warning'
}

export type QuoteStatus = 'pending' | 'approved' | 'rejected' | 'converted'

export type UserRole = 'admin' | 'customer-success'

export type AdminOrderItem = {
  id: string
  fileName: string
  fileUrl: string | null
  material: string
  color: string
  infill: number
  price: number
  estimatedTime: number
  weight: number | null
  status: OrderStatus
}

export type AdminOrder = {
  id: string
  groupId: string
  orderNumber: string
  fileUrl?: string
  fullName: string
  email?: string
  phone?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  pincode?: string
  deliveryCharge: number
  totalPrice: number
  material: string
  color: string
  status: OrderStatus
  createdAt: string
  dueDate?: string
  notes?: string | null
  itemCount: number
  items: AdminOrderItem[]
  paymentMethod?: string
  transactionId?: string
  paymentStatus?: string
  trackingId?: string
  deliveryPartner?: string
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
  customerId?: string
  name: string
  email: string
  phone?: string
  whatsappNumber?: string
  profession?: string
  referredBy?: string
   preferredDevice?: string
   preferredBrowser?: string
   preferredLanguage?: string
   city?: string
   state?: string
   pincode?: string
   fullAddress?: string
   companyName?: string
   signupMethod: 'Google' | 'Email' | 'GitHub'
  role: UserRole
  lastActive: string
  totalOrders?: number
  totalSpent?: number
  avgOrderValue?: number
  largestOrder?: number
  smallestOrder?: number
  firstOrderDate?: string
  lastOrderDate?: string
  orderFrequencyDays?: number
  lifetimeValueProjection?: number
  totalSiteVisits?: number
  totalTimeSpent?: string
  avgSessionDuration?: string
  favoritePage?: string
  mostQuotedMaterial?: string
  cartAbandonments?: number
  cartAbandonedValue?: number
  filesUploaded?: number
  quoteToOrderConversionRate?: string
  whatsappMessagesSent?: number
  supportTicketsRaised?: number
  referralsMade?: number
  engagementScore?: number
  joinedDate?: string
  status?: 'Active' | 'VIP' | 'Inactive' | 'Blacklisted' | 'New'
  tags?: string[]
  notes?: string
}

export type AdminMaterial = {
  id: string
  name: string
  price_per_gram: number
  density: number
  colors: string[]
  difficulty_factor: number
  stock: 'Healthy' | 'Low' | 'Paused'
  created_at?: string
  updated_at?: string
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
  orders?: number
}

export type DonutSlice = {
  label: string
  value: number
  color: string
}

export type PrinterStatus = {
  id: string
  name: string
  model?: string
  status: 'Printing' | 'Idle' | 'Maintenance' | 'Offline'
  job?: string
  customer?: string
  material?: string
  progress?: number
  layerCurrent?: number
  layerTotal?: number
  eta?: string
  tempNozzle?: number
  tempBed?: number
  speed?: number
  uvPower?: number
  layerTime?: number
  lastCompleted?: string
  idleSince?: string
  lastActive?: string
  note?: string
  uptime?: number
  jobsCompleted?: number
  buildVolume?: string
  maxSpeed?: string
  assignedMaterials?: string[]
}

export type SupportTicket = {
  id: string
  ticketId: string
  customer: string
  customerEmail?: string
  customerPhone?: string
  subject: string
  category: 'Print Quality' | 'Order Issue' | 'Billing' | 'Shipping' | 'Other'
  priority: 'Urgent' | 'High' | 'Normal' | 'Low'
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed'
  assignedTo?: string
  created: string
  lastUpdated: string
  description?: string
  attachments?: string[]
  relatedOrder?: string
}

export type PaymentData = {
  id: string
  transactionId: string
  orderId: string
  customer: string
  amount: number
  method: 'UPI' | 'Card' | 'Net Banking' | 'Cash on Delivery' | 'Razorpay'
  status: 'Paid' | 'Pending' | 'Failed' | 'Refunded'
  gateway: string
  date: string
  invoice?: string
}

export type NotificationItem = {
  id: string
  message: string
  time: string
  read: boolean
}

export type TeamMember = {
  name: string
  email: string
  role: UserRole
  status: 'Active' | 'Inactive'
}

export type Integration = {
  name: string
  status: 'Connected' | 'Not Connected'
  key?: string
  autoSync?: boolean
  disconnectable: boolean
}

export type BillingInfo = {
  plan: string
  price: string
  nextBillingDate: string
  paymentMethod: string
  features: string[]
}
