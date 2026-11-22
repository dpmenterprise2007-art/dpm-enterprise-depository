-- DPM Enterprise marketplace, departmental authority, public enquiry and social content foundations.
-- Apply only after reviewing against the current D1 schema; this migration is additive.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS department_memberships (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  department_id TEXT NOT NULL REFERENCES departments(id),
  position_title TEXT NOT NULL,
  authority_level TEXT NOT NULL CHECK(authority_level IN ('head','manager','supervisor','employee','labour','site_in_charge')),
  permissions_json TEXT NOT NULL DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, department_id)
);

CREATE TABLE IF NOT EXISTS work_assignments (
  id TEXT PRIMARY KEY,
  department_id TEXT NOT NULL REFERENCES departments(id),
  assigned_by TEXT NOT NULL REFERENCES users(id),
  assigned_to TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  entity_type TEXT,
  entity_id TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high','urgent')),
  status TEXT NOT NULL DEFAULT 'assigned' CHECK(status IN ('assigned','accepted','in_progress','blocked','review','completed','cancelled')),
  due_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_work_assignments_assignee_status ON work_assignments(assigned_to,status);
CREATE INDEX IF NOT EXISTS idx_work_assignments_department_status ON work_assignments(department_id,status);

CREATE TABLE IF NOT EXISTS marketplace_categories (
  id TEXT PRIMARY PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id TEXT REFERENCES marketplace_categories(id),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS marketplace_seller_applications (
  id TEXT PRIMARY PRIMARY KEY,
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  business_type TEXT NOT NULL,
  gstin TEXT,
  documents_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','under_review','approved','rejected','suspended')),
  reviewer_id TEXT REFERENCES users(id),
  review_note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_seller_app_status ON marketplace_seller_applications(status);

CREATE TABLE IF NOT EXISTS marketplace_vendor_applications (
  id TEXT PRIMARY PRIMARY KEY,
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  vendor_type TEXT NOT NULL,
  gstin TEXT,
  documents_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','under_review','approved','rejected','suspended')),
  reviewer_id TEXT REFERENCES users(id),
  review_note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_vendor_app_status ON marketplace_vendor_applications(status);

CREATE TABLE IF NOT EXISTS marketplace_products (
  id TEXT PRIMARY PRIMARY KEY,
  seller_application_id TEXT REFERENCES marketplace_seller_applications(id),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT,
  description TEXT,
  category_id TEXT REFERENCES marketplace_categories(id),
  brand TEXT,
  sku TEXT,
  price REAL,
  currency TEXT NOT NULL DEFAULT 'INR',
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  images_json TEXT NOT NULL DEFAULT '[]',
  attributes_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending_review','approved','rejected','inactive')),
  seller_name TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_status_category ON marketplace_products(status,category_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_title ON marketplace_products(title);

CREATE TABLE IF NOT EXISTS marketplace_enquiries (
  id TEXT PRIMARY PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  product_id TEXT REFERENCES marketplace_products(id),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','quoted','closed','spam')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_marketplace_enquiries_status ON marketplace_enquiries(status);

CREATE TABLE IF NOT EXISTS public_enquiries (
  id TEXT PRIMARY PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  service TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','qualified','converted','closed','spam')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_public_enquiries_status ON public_enquiries(status);

CREATE TABLE IF NOT EXISTS social_content_drafts (
  id TEXT PRIMARY PRIMARY KEY,
  channel TEXT NOT NULL CHECK(channel IN ('facebook','instagram','linkedin','youtube','pinterest','google_business')),
  format TEXT NOT NULL DEFAULT 'post',
  campaign TEXT,
  title TEXT,
  caption TEXT NOT NULL,
  hashtags_json TEXT NOT NULL DEFAULT '[]',
  media_key TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','needs_review','approved','scheduled','published','failed','cancelled')),
  scheduled_at TEXT,
  published_at TEXT,
  platform_post_id TEXT,
  created_by TEXT REFERENCES users(id),
  approved_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_social_drafts_status_schedule ON social_content_drafts(status,scheduled_at);

CREATE TABLE IF NOT EXISTS social_publish_attempts (
  id TEXT PRIMARY PRIMARY KEY,
  draft_id TEXT NOT NULL REFERENCES social_content_drafts(id),
  platform TEXT NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL CHECK(status IN ('queued','success','failed')),
  platform_post_id TEXT,
  error_message TEXT,
  attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
