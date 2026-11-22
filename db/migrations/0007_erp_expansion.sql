-- Expanded operational ERP storage foundation (additive migration).
-- This migration adds the missing inventory, production, finance, HR, client portal,
-- project updates, documents, and notifications tables without modifying existing records.
CREATE TABLE IF NOT EXISTS inventory_items (
 id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id), sku TEXT,
 item_name TEXT NOT NULL, category TEXT, unit TEXT NOT NULL DEFAULT 'Nos', stock_qty REAL NOT NULL DEFAULT 0,
 reorder_level REAL NOT NULL DEFAULT 0, unit_cost REAL NOT NULL DEFAULT 0, warehouse TEXT, status TEXT NOT NULL DEFAULT 'active',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_inventory_org_item ON inventory_items(organization_id,item_name);
CREATE TABLE IF NOT EXISTS inventory_movements (
 id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id), item_id TEXT NOT NULL REFERENCES inventory_items(id),
 movement_type TEXT NOT NULL CHECK(movement_type IN ('in','out','adjustment')), quantity REAL NOT NULL,
 reference_type TEXT, reference_id TEXT, notes TEXT, actor_user_id TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_date ON inventory_movements(item_id,created_at);
CREATE TABLE IF NOT EXISTS production_orders (
 id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id), project_id TEXT, order_number TEXT NOT NULL,
 title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','materials_pending','in_progress','quality_check','completed','cancelled')),
 start_date TEXT, due_date TEXT, notes TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(organization_id,order_number)
);
CREATE TABLE IF NOT EXISTS production_job_cards (
 id TEXT PRIMARY KEY, production_order_id TEXT NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
 job_name TEXT NOT NULL, assigned_to TEXT, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_progress','blocked','completed')),
 quantity REAL NOT NULL DEFAULT 1, notes TEXT, started_at TEXT, completed_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS finance_invoices (
 id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id), project_id TEXT, client_name TEXT NOT NULL,
 invoice_number TEXT NOT NULL, invoice_date TEXT, due_date TEXT, subtotal REAL NOT NULL DEFAULT 0, gst_rate REAL NOT NULL DEFAULT 18,
 gst_amount REAL NOT NULL DEFAULT 0, total_amount REAL NOT NULL DEFAULT 0, amount_paid REAL NOT NULL DEFAULT 0,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','issued','part_paid','paid','overdue','cancelled')),
 notes TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(organization_id,invoice_number)
);
CREATE TABLE IF NOT EXISTS finance_transactions (
 id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id), transaction_type TEXT NOT NULL CHECK(transaction_type IN ('income','expense')),
 category TEXT, amount REAL NOT NULL, transaction_date TEXT NOT NULL, payment_mode TEXT, reference_no TEXT, notes TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_org_date ON finance_transactions(organization_id,transaction_date);
CREATE TABLE IF NOT EXISTS hr_employees (
 id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id), employee_code TEXT, full_name TEXT NOT NULL,
 email TEXT, phone TEXT, role_title TEXT, employment_status TEXT NOT NULL DEFAULT 'active' CHECK(employment_status IN ('active','inactive','on_leave')),
 joining_date TEXT, monthly_salary REAL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(organization_id,employee_code)
);
CREATE TABLE IF NOT EXISTS hr_attendance (
 id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id), employee_id TEXT NOT NULL REFERENCES hr_employees(id),
 attendance_date TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('present','absent','half_day','leave','holiday')), check_in TEXT, check_out TEXT, notes TEXT,
 UNIQUE(employee_id,attendance_date)
);
CREATE TABLE IF NOT EXISTS client_accounts (
 id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id), client_name TEXT NOT NULL,
 email TEXT NOT NULL UNIQUE, phone TEXT, password_hash TEXT, status TEXT NOT NULL DEFAULT 'invited' CHECK(status IN ('invited','active','suspended')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS client_project_updates (
 id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id), client_account_id TEXT NOT NULL REFERENCES client_accounts(id),
 project_id TEXT, update_title TEXT NOT NULL, update_body TEXT, progress_percent REAL, photo_keys_json TEXT DEFAULT '[]', visibility TEXT NOT NULL DEFAULT 'client',
 created_by TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_client_updates_client_created ON client_project_updates(client_account_id,created_at);
CREATE TABLE IF NOT EXISTS client_approvals (
 id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id), client_account_id TEXT NOT NULL REFERENCES client_accounts(id),
 project_id TEXT, approval_type TEXT NOT NULL, title TEXT NOT NULL, payload_json TEXT DEFAULT '{}',
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','revision_requested')),
 response_note TEXT, responded_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS document_metadata (
 id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id), storage_key TEXT NOT NULL,
 file_name TEXT NOT NULL, mime_type TEXT, file_size INTEGER, entity_type TEXT, entity_id TEXT, uploaded_by TEXT,
 visibility TEXT NOT NULL DEFAULT 'internal', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_documents_entity ON document_metadata(organization_id,entity_type,entity_id);
CREATE TABLE IF NOT EXISTS notifications (
 id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id), recipient_user_id TEXT, recipient_email TEXT,
 channel TEXT NOT NULL DEFAULT 'in_app' CHECK(channel IN ('in_app','email','sms','whatsapp')), title TEXT NOT NULL, message TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sent','failed','read')), scheduled_at TEXT, sent_at TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_queue ON notifications(status,scheduled_at);
