export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ProfileStatus = 'active' | 'suspended' | 'unverified'
export type DeviceType = 'mobile' | 'desktop' | 'tablet'
export type EmailType = 'order_confirmation' | 'cancellation' | 'promotion' | 'otp' | 'password_reset' | 'welcome'
export type EmailEventStatus = 'sent' | 'delivered' | 'opened' | 'bounced'
export type AdminAuditTargetType = 'order' | 'user' | 'material' | 'coupon' | 'setting'

export type ProfileRow = {
  id: string
  email: string
  full_name: string | null
  phone_number: string | null
  avatar_url: string | null
  status: ProfileStatus
  email_verified: boolean | null
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

export type EmailEventRow = {
  id: string
  user_id: string | null
  email_type: EmailType
  status: EmailEventStatus
  sent_at: string | null
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

export type ReferralRow = {
  id: string
  referrer_user_id: string
  referred_user_id: string
  referral_code: string
  reward_given: boolean | null
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
      email_events: {
        Row: EmailEventRow
        Insert: Omit<Partial<EmailEventRow>, 'id'> & Pick<EmailEventRow, 'email_type'>
        Update: Partial<EmailEventRow>
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
      referrals: {
        Row: ReferralRow
        Insert: Omit<Partial<ReferralRow>, 'id'> & Pick<ReferralRow, 'referrer_user_id' | 'referred_user_id' | 'referral_code'>
        Update: Partial<ReferralRow>
      }
    }
  }
}
