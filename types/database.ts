export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ProfileStatus = 'active' | 'suspended' | 'unverified'
export type DeviceType = 'mobile' | 'desktop' | 'tablet'

// ============================================================================
// Email Types (expanded for enterprise transactional lifecycle)
// ============================================================================
export type EmailType =
  | 'welcome'
  | 'email_verification'
  | 'password_reset'
  | 'password_changed'
  | 'account_link_confirmation'
  | 'order_placed_customer'
  | 'order_placed_admin'
  | 'model_validation_pass'
  | 'model_validation_fail'
  | 'production_started'
  | 'order_shipped'
  | 'delivery_confirmation'
  | 'review_reminder'
  | 'payment_receipt'
  | 'payment_failed'
  | 'refund_issued'
  | 'contact_notification'
  | 'stock_alert'
  | 'back_in_stock'
  | 'ticket_acknowledgment'

export type EmailLogStatus =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'bounced'
  | 'failed'
  | 'complained'
  | 'dropped'

export type EmailEventType =
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'bounced'
  | 'failed'
  | 'complained'
  | 'clicked'
  | 'delivery_delayed'

export type BounceType = 'hard' | 'soft'

// Legacy alias for backward compatibility in any remaining references
export type EmailEventStatus = EmailLogStatus

export type EmailTemplateCategory = 'transactional' | 'marketing' | 'support' | 'admin' | 'system'
export type EmailQueueStatus = 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'cancelled'
export type AutomationTargetAudience = 'customer' | 'admin' | 'both'

export type AdminAuditTargetType =
  | 'order'
  | 'user'
  | 'material'
  | 'coupon'
  | 'setting'
  | 'payment'
  | 'refund'
  | 'printer'
  | 'quote'
  | 'manufacturing'
  | 'admin_user'
  | 'whatsapp_knowledge'
  | 'link_request'
  | 'shipping_rule'

// ============================================================================
// Profile (added email bounce flags)
// ============================================================================
export type ProfileRow = {
  id: string
  email: string
  full_name: string | null
  phone_number: string | null
  avatar_url: string | null
  status: ProfileStatus
  email_verified: boolean | null
  email_bounced: boolean | null
  email_bounced_at: string | null
  last_sign_in_at: string | null
  is_admin: boolean | null
  admin_notes: string | null
  suspended_at: string | null
  suspended_reason: string | null
  total_orders: number | null
  total_spend: number | null
  referral_code: string | null
  created_at: string | null
  updated_at: string | null
}

export type AddressRow = {
  id: string
  user_id: string
  full_name: string
  phone: string
  address_line_1: string
  address_line_2: string | null
  city: string
  state: string
  pincode: string
  country: string
  landmark: string | null
  is_default: boolean | null
  created_at: string | null
  updated_at: string | null
}

export type AdminCustomerNoteRow = {
  id: string
  user_id: string
  admin_id: string
  note: string
  created_at: string | null
}

export type PageVisitRow = {
  id: string
  user_id: string | null
  session_id: string
  page_url: string
  page_name: string | null
  referrer_url: string | null
  visited_at: string | null
}

export type UserSessionRow = {
  id: string
  user_id: string | null
  session_id: string
  ip_address: string | null
  device_type: DeviceType | null
  browser: string | null
  os: string | null
  country: string | null
  city: string | null
  started_at: string | null
  ended_at: string | null
  duration_seconds: number | null
}

export type SearchLogRow = {
  id: string
  user_id: string | null
  search_term: string | null
  filters_applied: Json | null
  results_count: number | null
  searched_at: string | null
}

export type FeatureUsageRow = {
  id: string
  user_id: string | null
  feature_name: string
  metadata: Json | null
  used_at: string | null
}

// ============================================================================
// Email Logs (master record per dispatched email)
// ============================================================================
export type EmailLogRow = {
  id: string
  user_id: string | null
  recipient: string
  order_id: string | null
  order_type: 'custom' | 'shop' | null
  email_type: EmailType
  subject: string
  template_name: string
  provider: 'resend'
  provider_message_id: string | null
  resend_id: string | null
  status: EmailLogStatus
  queued_at: string | null
  sent_at: string | null
  delivered_at: string | null
  opened_at: string | null
  failed_at: string | null
  bounced_at: string | null
  error_message: string | null
  bounce_type: BounceType | null
  retry_count: number | null
  original_log_id: string | null
  template_id: string | null
  variables_used: Json | null
  queue_id: string | null
  created_at: string | null
  updated_at: string | null
}

// ============================================================================
// Email Events (immutable webhook audit trail)
// ============================================================================
export type EmailEventRow = {
  id: string
  email_log_id: string
  event_type: EmailEventType
  provider: 'resend'
  provider_event_id: string | null
  raw_payload: Json
  recipient: string | null
  ip_address: string | null
  user_agent: string | null
  geo_location: Json | null
  provider_timestamp: string | null
  created_at: string | null
}

export type EmailTemplateRow = {
  id: string
  name: string
  email_type: string
  category: EmailTemplateCategory
  subject: string
  html_body: string
  plain_text: string | null
  variables: Json
  is_enabled: boolean
  is_system: boolean
  description: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string | null
  updated_at: string | null
}

export type EmailTemplateVersionRow = {
  id: string
  template_id: string
  version_number: number
  subject: string | null
  html_body: string | null
  plain_text: string | null
  variables: Json | null
  editor_id: string | null
  created_at: string | null
}

export type EmailAutomationRuleRow = {
  id: string
  event_name: string
  template_id: string
  target_audience: AutomationTargetAudience
  delay_minutes: number
  is_enabled: boolean
  conditions: Json | null
  priority: number
  created_at: string | null
  updated_at: string | null
}

export type EmailQueueRow = {
  id: string
  log_id: string | null
  template_id: string
  recipient: string
  variables: Json
  status: EmailQueueStatus
  priority: number
  scheduled_at: string | null
  retry_count: number
  max_retries: number
  error_message: string | null
  created_at: string | null
  updated_at: string | null
}

export type EmailBrandingRow = {
  id: string
  logo_url: string | null
  company_name: string | null
  address: string | null
  gst_number: string | null
  support_email: string | null
  support_phone: string | null
  primary_color: string | null
  secondary_color: string | null
  accent_color: string | null
  footer_text: string | null
  social_icons: Json | null
  dark_mode_css: string | null
  header_html: string | null
  footer_html: string | null
  updated_at: string | null
}

export type EmailSettingsRow = {
  id: string
  emails_enabled: boolean
  maintenance_mode: boolean
  pause_all_emails: boolean
  retry_failed: boolean
  max_retries: number
  sender_name: string | null
  sender_email: string | null
  reply_to: string | null
  bcc: string | null
  cc: string | null
  footer: string | null
  timezone: string | null
  updated_at: string | null
}

export type ErrorLogRow = {
  id: string
  user_id: string | null
  page_url: string | null
  error_message: string
  stack_trace: string | null
  device_info: Json | null
  occurred_at: string | null
}

export type AdminAuditLogRow = {
  id: string
  admin_id: string
  action: string
  target_type: AdminAuditTargetType
  target_id: string
  old_value: Json | null
  new_value: Json | null
  performed_at: string | null
}

export type WhatsAppRagAnswerAuditRow = {
  id: string
  webhook_event_id: string | null
  sender: string | null
  user_id: string | null
  question_text: string
  retrieval_mode: 'database' | 'seed' | 'none'
  retrieval_confidence: number | null
  retrieval_sources: Json | null
  response_kind: 'model' | 'fallback' | 'error'
  response_text: string | null
  response_metadata: Json | null
  fallback_reason: string | null
  model_name: string | null
  prompt_version: string | null
  latency_ms: number | null
  retrieval_latency_ms: number | null
  generation_latency_ms: number | null
  session_history_length: number | null
  structured_data_matches: number | null
  created_at: string | null
}

export type WhatsAppSessionRow = {
  phone_number: string
  messages: Json
  last_active: string | null
}

export type ReferralRow = {
  id: string
  referrer_user_id: string
  referred_user_id: string
  referral_code: string
  reward_given: boolean | null
  created_at: string | null
}

export type StockMovementReasonType =
  | 'order_placed'
  | 'order_cancelled'
  | 'order_returned'
  | 'reservation_expired'
  | 'manual_adjust'
  | 'restock'
  | 'release'
  | 'system'

export type StockMovementRow = {
  id: string
  sku_id: string
  product_id: string
  quantity_delta: number
  previous_quantity: number
  new_quantity: number
  reason_type: StockMovementReasonType
  reference_id: string | null
  actor_id: string | null
  note: string | null
  created_at: string
}

export type StockAlertType = 'low_stock' | 'out_of_stock'
export type StockAlertStatus = 'open' | 'acknowledged' | 'resolved'
export type StockAlertSeverity = 'info' | 'warning' | 'critical'

export type StockAlertRow = {
  id: string
  sku_id: string
  product_id: string
  alert_type: StockAlertType
  severity: StockAlertSeverity
  message: string
  status: StockAlertStatus
  stock_at_alert: number
  notified_at: string | null
  acknowledged_at: string | null
  resolved_at: string | null
  created_at: string
}

// ============================================================================
// Database registry (Supabase shape)
// ============================================================================
export type ShelfCategoryRow = {
  id: string
  name: string
  slug: string
  description: string | null
  icon_emoji: string | null
  banner_image_url: string | null
  parent_category_id: string | null
  display_order: number | null
  is_active: boolean | null
  created_at: string | null
}

export type ShelfProductRow = {
  id: string
  name: string
  slug: string
  description: string | null
  long_description: string | null
  category_id: string | null
  tags: string[] | null
  occasion_tags: string[] | null
  thumbnail_url: string | null
  image_urls: string[] | null
  model_url: string | null
  base_price: number | null
  is_customizable: boolean | null
  customization_label: string | null
  is_featured: boolean | null
  is_active: boolean | null
  is_archived: boolean | null
  meta_title: string | null
  meta_description: string | null
  created_at: string | null
  updated_at: string | null
}

export type ShelfSkuRow = {
  id: string
  product_id: string
  sku_code: string
  variant_combination: Json
  price: number
  compare_at_price: number | null
  stock_quantity: number
  low_stock_threshold: number | null
  weight_grams: number | null
  variant_image_url: string | null
  is_available: boolean | null
  pre_order_eta: string | null
  created_at: string | null
  updated_at: string | null
}

export type ShelfOrderRow = {
  id: string
  order_number: string
  /** auth.users id — null for guest (unauthenticated) checkout orders. */
  user_id: string | null
  items: Json
  subtotal: number
  discount_amount: number | null
  coupon_code: string | null
  shipping_charge: number | null
  total_amount: number
  shipping_address: Json
  payment_method: string | null
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  payment_id: string | null
  order_status: 'placed' | 'confirmed' | 'packed' | 'shipped' | 'delivered' | 'cancelled' | 'return_requested' | 'returned'
  tracking_number: string | null
  courier_name: string | null
  tracking_url: string | null
  estimated_delivery: string | null
  order_source: string
  admin_notes: string | null
  cancellation_reason: string | null
  placed_at: string | null
  updated_at: string | null
  delivered_at: string | null
  guest_session_id: string | null
  claim_candidate_user_id: string | null
  guest_access_token_hash: string | null
  guest_contact: Json | null
  guest_data_anonymized_at: string | null
}

export type ShelfReviewReminderRow = {
  id: string
  order_id: string
  user_id: string
  reminder_number: number
  sent_at: string | null
}

export type ShelfReviewRow = {
  id: string
  product_id: string
  user_id: string
  order_id: string
  rating: number
  title: string | null
  body: string | null
  image_urls: string[] | null
  is_verified_purchase: boolean | null
  is_approved: boolean | null
  admin_reply: string | null
  admin_replied_at: string | null
  created_at: string | null
  updated_at: string | null
}

export type ShelfReviewVoteRow = {
  id: string
  review_id: string
  user_id: string
  is_helpful: boolean
  created_at: string | null
}

export type ShelfCouponRow = {
  id: string
  code: string
  discount_type: 'flat' | 'percent'
  discount_value: number
  min_order_value: number | null
  max_uses: number | null
  used_count: number | null
  valid_from: string
  valid_until: string
  is_active: boolean | null
  created_at: string | null
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: Partial<Omit<ProfileRow, 'id'>> & Pick<ProfileRow, 'id' | 'email'>
        Update: Partial<ProfileRow>
      }
      addresses: {
        Row: AddressRow
        Insert: Omit<Partial<AddressRow>, 'id'> & Pick<AddressRow, 'user_id' | 'full_name' | 'phone' | 'address_line_1' | 'city' | 'state' | 'pincode'>
        Update: Partial<AddressRow>
      }
      admin_customer_notes: {
        Row: AdminCustomerNoteRow
        Insert: Omit<Partial<AdminCustomerNoteRow>, 'id'> & Pick<AdminCustomerNoteRow, 'user_id' | 'admin_id' | 'note'>
        Update: Partial<AdminCustomerNoteRow>
      }
      page_visits: {
        Row: PageVisitRow
        Insert: Omit<Partial<PageVisitRow>, 'id'> & Pick<PageVisitRow, 'session_id' | 'page_url'>
        Update: Partial<PageVisitRow>
      }
      user_sessions: {
        Row: UserSessionRow
        Insert: Omit<Partial<UserSessionRow>, 'id'> & Pick<UserSessionRow, 'session_id'>
        Update: Partial<UserSessionRow>
      }
      search_logs: {
        Row: SearchLogRow
        Insert: Omit<Partial<SearchLogRow>, 'id'>
        Update: Partial<SearchLogRow>
      }
      feature_usage: {
        Row: FeatureUsageRow
        Insert: Omit<Partial<FeatureUsageRow>, 'id'> & Pick<FeatureUsageRow, 'feature_name'>
        Update: Partial<FeatureUsageRow>
      }
      email_logs: {
        Row: EmailLogRow
        Insert: Omit<Partial<EmailLogRow>, 'id'> & Pick<EmailLogRow, 'recipient' | 'email_type' | 'subject' | 'template_name'>
        Update: Partial<EmailLogRow>
      }
      email_events: {
        Row: EmailEventRow
        Insert: Omit<Partial<EmailEventRow>, 'id'> & Pick<EmailEventRow, 'email_log_id' | 'event_type' | 'raw_payload'>
        Update: Partial<EmailEventRow>
      }
      email_templates: {
        Row: EmailTemplateRow
        Insert: Omit<Partial<EmailTemplateRow>, 'id'> & Pick<EmailTemplateRow, 'name' | 'email_type' | 'category' | 'subject' | 'html_body'>
        Update: Partial<EmailTemplateRow>
      }
      email_template_versions: {
        Row: EmailTemplateVersionRow
        Insert: Omit<Partial<EmailTemplateVersionRow>, 'id'> & Pick<EmailTemplateVersionRow, 'template_id' | 'version_number'>
        Update: Partial<EmailTemplateVersionRow>
      }
      email_automation_rules: {
        Row: EmailAutomationRuleRow
        Insert: Omit<Partial<EmailAutomationRuleRow>, 'id'> & Pick<EmailAutomationRuleRow, 'event_name' | 'template_id' | 'target_audience'>
        Update: Partial<EmailAutomationRuleRow>
      }
      email_queue: {
        Row: EmailQueueRow
        Insert: Omit<Partial<EmailQueueRow>, 'id'> & Pick<EmailQueueRow, 'template_id' | 'recipient' | 'status'>
        Update: Partial<EmailQueueRow>
      }
      email_branding: {
        Row: EmailBrandingRow
        Insert: Omit<Partial<EmailBrandingRow>, 'id'> & Pick<EmailBrandingRow, never>
        Update: Partial<EmailBrandingRow>
      }
      email_settings: {
        Row: EmailSettingsRow
        Insert: Omit<Partial<EmailSettingsRow>, 'id'> & Pick<EmailSettingsRow, never>
        Update: Partial<EmailSettingsRow>
      }
      error_logs: {
        Row: ErrorLogRow
        Insert: Omit<Partial<ErrorLogRow>, 'id'> & Pick<ErrorLogRow, 'error_message'>
        Update: Partial<ErrorLogRow>
      }
      admin_audit_logs: {
        Row: AdminAuditLogRow
        Insert: Omit<Partial<AdminAuditLogRow>, 'id'> & Pick<AdminAuditLogRow, 'admin_id' | 'action' | 'target_type' | 'target_id'>
        Update: Partial<AdminAuditLogRow>
      }
      whatsapp_rag_answer_audits: {
        Row: WhatsAppRagAnswerAuditRow
        Insert: Omit<Partial<WhatsAppRagAnswerAuditRow>, 'id'> & Pick<WhatsAppRagAnswerAuditRow, 'question_text' | 'retrieval_mode' | 'response_kind'>
        Update: Partial<WhatsAppRagAnswerAuditRow>
      }
      whatsapp_sessions: {
        Row: WhatsAppSessionRow
        Insert: Pick<WhatsAppSessionRow, 'phone_number'> & Partial<Omit<WhatsAppSessionRow, 'phone_number'>>
        Update: Partial<WhatsAppSessionRow>
      }
      referrals: {
        Row: ReferralRow
        Insert: Omit<Partial<ReferralRow>, 'id'> & Pick<ReferralRow, 'referrer_user_id' | 'referred_user_id' | 'referral_code'>
        Update: Partial<ReferralRow>
      }
      stock_movements: {
        Row: StockMovementRow
        Insert: Omit<Partial<StockMovementRow>, 'id'> & Pick<StockMovementRow, 'sku_id' | 'product_id' | 'quantity_delta'>
        Update: Partial<StockMovementRow>
      }
      stock_alerts: {
        Row: StockAlertRow
        Insert: Omit<Partial<StockAlertRow>, 'id'> & Pick<StockAlertRow, 'sku_id' | 'product_id' | 'alert_type' | 'message'>
        Update: Partial<StockAlertRow>
      }
      shelf_categories: {
        Row: ShelfCategoryRow
        Insert: Omit<Partial<ShelfCategoryRow>, 'id'> & Pick<ShelfCategoryRow, 'name' | 'slug'>
        Update: Partial<ShelfCategoryRow>
      }
      shelf_products: {
        Row: ShelfProductRow
        Insert: Omit<Partial<ShelfProductRow>, 'id'> & Pick<ShelfProductRow, 'name' | 'slug' | 'base_price'>
        Update: Partial<ShelfProductRow>
      }
      shelf_skus: {
        Row: ShelfSkuRow
        Insert: Omit<Partial<ShelfSkuRow>, 'id'> & Pick<ShelfSkuRow, 'product_id' | 'sku_code' | 'price'>
        Update: Partial<ShelfSkuRow>
      }
      shelf_orders: {
        Row: ShelfOrderRow
        Insert: Omit<Partial<ShelfOrderRow>, 'id'> & Pick<ShelfOrderRow, 'order_number' | 'items' | 'subtotal' | 'total_amount' | 'shipping_address' | 'payment_status' | 'order_status'>
        Update: Partial<ShelfOrderRow>
      }
      shelf_reviews: {
        Row: ShelfReviewRow
        Insert: Omit<Partial<ShelfReviewRow>, 'id'> & Pick<ShelfReviewRow, 'product_id' | 'user_id' | 'order_id' | 'rating'>
        Update: Partial<ShelfReviewRow>
      }
      shelf_coupons: {
        Row: ShelfCouponRow
        Insert: Omit<Partial<ShelfCouponRow>, 'id'> & Pick<ShelfCouponRow, 'code' | 'discount_type' | 'discount_value' | 'valid_from' | 'valid_until'>
        Update: Partial<ShelfCouponRow>
      }
      shelf_review_votes: {
        Row: ShelfReviewVoteRow
        Insert: Omit<Partial<ShelfReviewVoteRow>, 'id'> & Pick<ShelfReviewVoteRow, 'review_id' | 'user_id' | 'is_helpful'>
        Update: Partial<ShelfReviewVoteRow>
      }
      shelf_review_reminders: {
        Row: ShelfReviewReminderRow
        Insert: Omit<Partial<ShelfReviewReminderRow>, 'id'> & Pick<ShelfReviewReminderRow, 'order_id' | 'user_id' | 'reminder_number'>
        Update: Partial<ShelfReviewReminderRow>
      }
    }
  }
}
