export type ReviewStatus = 'pending_review' | 'approved' | 'rejected'
export type OrderType = 'shop' | 'custom' | 'custom_order'
export type ReviewLinkStatus = 'sent' | 'opened' | 'submitted'

export interface ReviewLink {
  id: string
  order_id: string
  order_type: OrderType
  token: string
  sent_at?: string
  opened_at?: string
  used_at?: string
  expires_at: string
  channel_sent?: string
}

export interface Review {
  id: string
  order_id: string
  order_type: OrderType
  rating: number
  raw_customer_input?: string
  review_text: string
  customer_display_name?: string
  customer_avatar_seed?: string
  consent_display: boolean
  status: ReviewStatus
  featured: boolean
  moderated_by?: string
  moderated_at?: string
  submitted_at: string
}

export interface CreateReviewInput {
  rating: number
  raw_customer_input?: string
  review_text: string
  customer_display_name?: string
  consent_display: boolean
}
