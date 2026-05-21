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
export type AdminCustomerStatus = 'Active' | 'Suspended' | 'Unverified'

export type AdminOrderItem = {
  id: string
  fileName: string
  fileUrl: string | null
  material: string
  color: string
  infill: number
  layerHeight: number
  price: number
  pricePerUnit: number
  estimatedTime: number
  quantity: number
  supports: boolean
  postProcessingLevel: string | null
  postProcessingCharges: number
  weight: number
  difficultyFactor: number
  materialCost: number
  machineCost: number
  subtotal: number
  overheadPercentage: number
  overheadAmount: number
  marginPercentage: number
  marginAmount: number
  totalPriceBeforeDiscount: number
  cartDiscountAmount: number
  cartDiscountPercent: number
  couponDiscountAmount: number
  offerDiscountAmount: number
  offerName: string | null
  finalPrice: number
  deliveryCharge: number
  grandTotal: number
  status: OrderStatus
  cancelRequested: boolean
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
  landmark?: string
  deliveryCharge: number
  totalPrice: number
  totalPriceBeforeDiscount: number
  finalPrice: number
  grandTotal: number
  materialCost: number
  machineCost: number
  subtotal: number
  overheadPercentage: number
  overheadAmount: number
  marginPercentage: number
  marginAmount: number
  cartDiscountAmount: number
  cartDiscountPercent: number
  couponDiscountAmount: number
  offerDiscountAmount: number
  discountAmount?: number
  discountLabel?: string | null
  discountType?: string | null
  couponCode?: string | null
  offerName?: string | null
  discountSource?: 'offer' | 'coupon' | 'order' | null
  material: string
  color: string
  status: OrderStatus
  statusTimestamps?: Partial<Record<OrderStatus, string>>
  cancelRequested: boolean
  createdAt: string
  updatedAt?: string
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
  lastSeenAt?: string
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
  status?: AdminCustomerStatus | 'VIP' | 'Inactive' | 'Blacklisted' | 'New'
  tags?: string[]
  notes?: string
  manualCoupon?: string
  manualCredit?: number
  orders?: AdminCustomerOrder[]
  files?: AdminCustomerFile[]
  invoices?: AdminCustomerInvoice[]
}

export type AdminCustomerOrder = {
  id: string
  groupId: string
  orderNumber: string
  createdAt: string
  status: OrderStatus
  grandTotal: number
  itemCount: number
  materialSummary: string
}

export type AdminCustomerFile = {
  id: string
  fileName: string
  fileUrl: string | null
  size?: number
  uploadedAt: string
  downloadUrl: string
}

export type AdminCustomerInvoice = {
  id: string
  orderNumber: string
  createdAt: string
  grandTotal: number
  downloadUrl: string
}

export type AdminMaterial = {
  id: string
  name: string
  icon: string
  summary: string
  density: number
  price_per_gram: number
  machine_rate: number
  multiplier: number
  recommended_for: string
  properties: {
    strength?: string
    flexibility?: string
    tempResistance?: string
    difficulty?: string
  }
  colors: string[]
  difficulty_factor: number
  key_properties?: string[]
  best_for?: string[]
  difficulty_level?: 'Easy' | 'Medium' | 'Hard'
  heat_resistance?: 'Low' | 'Medium' | 'High'
  strength_rating?: 'Low' | 'Medium' | 'High'
  finish_quality?: 'Basic' | 'Good' | 'Excellent'
  sample_photo?: string
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

export type Offer = {
  id: string
  title: string
  description: string | null
  banner_url: string | null
  offer_type: 'percentage' | 'fixed_amount' | 'free_shipping' | 'buy_x_get_y'
  discount_value: number
  max_discount: number | null
  min_order_value: number
  starts_at: string
  ends_at: string
  is_active: boolean
  is_featured: boolean
  auto_apply: boolean
  coupon_code: string | null
  applicable_categories: string[] | null
  applicable_materials: string[] | null
  applicable_products: string[] | null
  usage_limit: number | null
  usage_per_user: number | null
  used_count: number
  badge_text: string | null
  badge_color: string
  sale_label: string | null
  theme_config: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type Coupon = {
  id: string
  code: string
  description: string | null
  discount_type: 'percentage' | 'fixed_amount' | 'free_shipping'
  discount_value: number
  max_discount: number | null
  min_order_value: number
  starts_at: string
  expires_at: string
  is_active: boolean
  usage_limit: number | null
  usage_per_user: number | null
  used_count: number
  applicable_categories: string[] | null
  applicable_materials: string[] | null
  applicable_products: string[] | null
  first_order_only: boolean
  created_at: string
  updated_at: string
}

export type Redemption = {
  id: string
  user_id: string | null
  order_id: string | null
  offer_id: string | null
  coupon_id: string | null
  discount_type: string
  discount_value: number
  discount_applied: number
  order_amount: number
  redeemed_at: string
}
