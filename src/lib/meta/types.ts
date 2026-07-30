export type MetaEventName =
  | 'ViewContent'
  | 'AddToCart'
  | 'AddToWishlist'
  | 'InitiateCheckout'
  | 'AddPaymentInfo'
  | 'Purchase'
  | 'Search'
  | 'PageView'
  | 'Contact'

export type MetaCapiUserData = {
  em?: string[]
  ph?: string[]
  external_id?: string[]
  client_ip_address?: string
  client_user_agent?: string
  fbc?: string
  fbp?: string
  subscription_id?: string
}

export type MetaCapiCustomData = {
  content_name?: string
  content_category?: string
  content_ids?: string[]
  content_type?: 'product' | 'product_group'
  contents?: MetaCapiContent[]
  num_items?: number
  value?: number
  currency?: 'INR'
  predicted_ltv?: number
  order_id?: string
  search_string?: string
  status?: string
}

export type MetaCapiContent = {
  id: string
  quantity: number
  item_price?: number
  title?: string
  category?: string
}

export type MetaCapiEvent = {
  event_name: MetaEventName
  event_time: number
  event_id: string
  event_source_url?: string
  action_source: 'website' | 'email' | 'phone_call' | 'chat' | 'physical_store' | 'system_generated'
  user_data: MetaCapiUserData
  custom_data?: MetaCapiCustomData
  data_processing_options?: string[]
  data_processing_options_country?: number
  data_processing_options_state?: number
}

export type MetaCapiRequest = {
  data: MetaCapiEvent[]
  test_event_code?: string
  partner_agent?: 'flux3d'
}

export type MetaCapiResponse = {
  events_received: number
  messages?: Array<{ message: string }>
  fbtrace_id: string
}

export type MetaBatchRequestEntry = {
  method: 'UPDATE' | 'DELETE' | 'CREATE'
  retailer_id: string
  data?: MetaCatalogItemData
}

export type MetaBatchRequest = {
  allow_upsert?: boolean
  requests: MetaBatchRequestEntry[]
}

export type MetaCatalogItemData = {
  title: string
  description?: string
  availability?: 'in stock' | 'out of stock' | 'preorder' | 'available for order' | 'discontinued'
  condition?: 'new' | 'refurbished' | 'used'
  price: string
  sale_price?: string
  sale_price_effective_date?: string
  link: string
  image_link?: string
  brand?: string
  google_product_category?: string
  fb_product_category?: string
  item_group_id?: string
  currency: 'INR'
  inventory?: number
  visibility?: 'published' | 'staging'
  additional_image_link?: string[]
  short_description?: string
  custom_label_0?: string
  custom_label_1?: string
  custom_label_2?: string
  custom_label_3?: string
  custom_label_4?: string
  age_group?: string
  color?: string
  gender?: string
  material?: string
  pattern?: string
  size?: string
}

export type MetaBatchResponse = {
  handles: string[]
  validation_status: { handles: Array<{ handle: string; errors?: Array<{ message: string }> }> }
}

export type ProductSyncAction = {
  productId: string
  skuCode: string
  action: 'upsert' | 'delete'
  success: boolean
  error?: string
  metaHandle?: string
}

export type ProductSyncResult = {
  total: number
  succeeded: number
  failed: number
  actions: ProductSyncAction[]
  durationMs: number
}
