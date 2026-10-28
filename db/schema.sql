-- PostgreSQL starter schema. Review with the business and implement migrations before production.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TYPE lead_status AS ENUM ('new','assigned','contacted','qualified','quote_requested','quote_sent','won','lost','spam');
CREATE TYPE payment_status AS ENUM ('initiated','pending_verification','paid','failed','refunded','reconciliation_required');
CREATE TYPE user_role AS ENUM ('super_admin','sales_manager','sales_executive','finance','hr_manager','content_editor','read_only');
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'read_only',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  billing_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  tax_identifier TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  seo_title TEXT,
  seo_description TEXT,
  published BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category_id UUID REFERENCES product_categories(id),
  brand TEXT,
  description TEXT,
  specifications JSONB NOT NULL DEFAULT '{}'::jsonb,
  image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  datasheet_url TEXT,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  availability_status TEXT NOT NULL DEFAULT 'enquire',
  seo_title TEXT,
  seo_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES customers(id),
  name TEXT NOT NULL,
  company_name TEXT,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  category TEXT NOT NULL,
  requirements TEXT,
  source TEXT NOT NULL DEFAULT 'website',
  consent_at TIMESTAMPTZ,
  status lead_status NOT NULL DEFAULT 'new',
  owner_user_id UUID REFERENCES app_users(id),
  estimated_value NUMERIC(14,2),
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS enquiries_status_created_idx ON enquiries(status, created_at DESC);
CREATE INDEX IF NOT EXISTS enquiries_owner_idx ON enquiries(owner_user_id, status);
CREATE TABLE IF NOT EXISTS enquiry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id UUID NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  requested_product_name TEXT,
  quantity NUMERIC(14,3),
  unit TEXT,
  specification_note TEXT
);
CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT NOT NULL UNIQUE,
  enquiry_id UUID REFERENCES enquiries(id),
  customer_id UUID REFERENCES customers(id),
  status TEXT NOT NULL DEFAULT 'draft',
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  valid_until DATE,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES app_users(id),
  approved_by UUID REFERENCES app_users(id),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  quotation_id UUID REFERENCES quotations(id),
  customer_id UUID REFERENCES customers(id),
  status TEXT NOT NULL DEFAULT 'confirmed',
  fulfilment_status TEXT NOT NULL DEFAULT 'pending',
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  external_source TEXT,
  external_order_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(external_source, external_order_id)
);
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_reference TEXT NOT NULL UNIQUE,
  order_id UUID REFERENCES orders(id),
  quotation_id UUID REFERENCES quotations(id),
  provider TEXT NOT NULL,
  provider_payment_id TEXT,
  status payment_status NOT NULL DEFAULT 'initiated',
  amount NUMERIC(14,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  verified_at TIMESTAMPTZ,
  reconciled_at TIMESTAMPTZ,
  provider_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_payment_id)
);
CREATE TABLE IF NOT EXISTS job_openings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  department TEXT,
  location TEXT,
  employment_type TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES job_openings(id),
  candidate_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  resume_object_key TEXT NOT NULL,
  consent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'received',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS integration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS integration_events_retry_idx ON integration_events(status, next_attempt_at);
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES app_users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- Official customer-facing payment instructions. Populate only with finance-approved values.
CREATE TABLE IF NOT EXISTS public_payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_holder TEXT NOT NULL DEFAULT 'Fair Power Age Private Limited',
  bank_name TEXT,
  account_number TEXT,
  ifsc_code TEXT,
  branch_name TEXT,
  upi_id TEXT,
  payment_instructions TEXT,
  updated_by UUID REFERENCES app_users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
