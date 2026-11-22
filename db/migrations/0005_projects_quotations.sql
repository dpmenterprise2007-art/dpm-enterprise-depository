PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS projects (
 id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id), name TEXT NOT NULL,
 client_name TEXT, project_type TEXT, site_address TEXT, status TEXT NOT NULL DEFAULT 'planning'
 CHECK(status IN ('planning','design','quotation','approved','execution','on_hold','completed','cancelled')),
 budget_amount REAL, start_date TEXT, target_completion_date TEXT, notes TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS quotations (
 id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id), project_id TEXT REFERENCES projects(id),
 quotation_number TEXT NOT NULL, client_name TEXT NOT NULL, client_email TEXT, client_phone TEXT,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sent','accepted','rejected','expired','cancelled')),
 subtotal REAL NOT NULL DEFAULT 0, discount_amount REAL NOT NULL DEFAULT 0, taxable_amount REAL NOT NULL DEFAULT 0,
 gst_rate REAL NOT NULL DEFAULT 18, gst_amount REAL NOT NULL DEFAULT 0, total_amount REAL NOT NULL DEFAULT 0,
 valid_until TEXT, notes TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(organization_id,quotation_number)
);
CREATE TABLE IF NOT EXISTS quotation_items (
 id TEXT PRIMARY KEY, quotation_id TEXT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
 description TEXT NOT NULL, unit TEXT NOT NULL DEFAULT 'Nos', quantity REAL NOT NULL DEFAULT 1,
 rate REAL NOT NULL DEFAULT 0, amount REAL NOT NULL DEFAULT 0, hsn_code TEXT, gst_rate REAL NOT NULL DEFAULT 18,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_projects_org_status ON projects(organization_id,status);
CREATE INDEX IF NOT EXISTS idx_quotations_org_created ON quotations(organization_id,created_at);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation ON quotation_items(quotation_id);
