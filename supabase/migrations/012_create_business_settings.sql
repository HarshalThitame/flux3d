CREATE TABLE IF NOT EXISTS business_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 1. Basic Business Information
  business_name text,
  legal_business_name text,
  brand_name text,
  tagline text,
  business_description text,
  gst_number text,
  pan_number text,
  cin_number text,
  msme_number text,
  business_type text DEFAULT 'Individual',

  -- 2. Contact Information
  primary_email text,
  support_email text,
  sales_email text,
  billing_email text,
  primary_phone text,
  whatsapp_number text,
  alternate_phone text,
  toll_free_number text,

  -- 3. Address Information
  address_line_1 text,
  address_line_2 text,
  landmark text,
  city text,
  state text,
  country text DEFAULT 'India',
  postal_code text,
  billing_same_as_office boolean DEFAULT true,
  billing_address_line_1 text,
  billing_address_line_2 text,
  billing_city text,
  billing_state text,
  billing_country text,
  billing_postal_code text,

  -- 4. Social Media Links
  instagram_url text,
  facebook_url text,
  linkedin_url text,
  twitter_url text,
  youtube_url text,
  threads_url text,
  pinterest_url text,
  github_url text,
  website_url text,

  -- 5. Branding Settings
  logo_url text,
  dark_logo_url text,
  favicon_url text,
  invoice_logo_url text,
  email_logo_url text,
  primary_color text DEFAULT '#FF5C1A',
  secondary_color text DEFAULT '#39BDF8',

  -- 6. Invoice & Quotation Details
  invoice_prefix text DEFAULT 'INV-',
  quotation_prefix text DEFAULT 'QTN-',
  invoice_start_number integer DEFAULT 1001,
  quotation_start_number integer DEFAULT 1001,
  currency text DEFAULT 'INR',
  currency_symbol text DEFAULT '₹',
  tax_percentage numeric(5,2) DEFAULT 0,
  sac_hsn_code text,
  payment_terms text,
  bank_account_name text,
  bank_name text,
  account_number text,
  ifsc_code text,
  upi_id text,
  upi_qr_code_url text,

  -- 7. WhatsApp & Communication Settings
  whatsapp_order_number text,
  whatsapp_support_number text,
  default_whatsapp_template text,
  auto_reply_message text,
  business_hours text,
  support_availability_message text,

  -- 8. SEO & Metadata
  meta_title text,
  meta_description text,
  meta_keywords text,
  og_image_url text,
  twitter_image_url text,
  canonical_url text,
  robots_index boolean DEFAULT true,

  -- 9. Email Configuration (Optional)
  smtp_host text,
  smtp_port integer,
  smtp_username text,
  smtp_password text,
  smtp_sender_name text,
  smtp_sender_email text,

  -- 10. Legal & Policies
  privacy_policy_url text,
  terms_url text,
  refund_policy_url text,
  shipping_policy_url text,

  -- 11. Business Operational Settings
  working_days text,
  working_hours text,
  holiday_message text,
  emergency_contact text,
  order_processing_time text,
  delivery_charge_threshold numeric(10,2) DEFAULT 499,
  default_delivery_charge numeric(10,2) DEFAULT 50,
  pickup_available boolean DEFAULT false,
  cod_available boolean DEFAULT false,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Single-row constraint: allow only one active row
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_settings_single_row ON business_settings ((deleted_at IS NULL)) WHERE deleted_at IS NULL;

-- Seed default row
INSERT INTO business_settings (business_name, brand_name) VALUES ('My Business', 'Brand')
ON CONFLICT DO NOTHING;
