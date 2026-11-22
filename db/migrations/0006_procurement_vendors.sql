PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS vendors (
 id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id), vendor_name TEXT NOT NULL,
 contact_name TEXT, email TEXT, phone TEXT, gstin TEXT, vendor_category TEXT, address TEXT,
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','blocked')),
 notes TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS purchase_orders (
 id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id), vendor_id TEXT NOT NULL REFERENCES vendors(id),
 po_number TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sent','confirmed','partially_received','received','cancelled')),
 subtotal REAL NOT NULL DEFAULT 0, gst_rate REAL NOT NULL DEFAULT 18, gst_amount REAL NOT NULL DEFAULT 0, total_amount REAL NOT NULL DEFAULT 0,
 expected_delivery TEXT, notes TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(organization_id,po_number)
);
CREATE TABLE IF NOT EXISTS purchase_order_items (
 id TEXT PRIMARY KEY, purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
 description TEXT NOT NULL, unit TEXT NOT NULL DEFAULT 'Nos', quantity REAL NOT NULL DEFAULT 1,
 rate REAL NOT NULL DEFAULT 0, amount REAL NOT NULL DEFAULT 0, hsn_code TEXT, gst_rate REAL NOT NULL DEFAULT 18,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_vendors_org_status ON vendors(organization_id,status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_org_created ON purchase_orders(organization_id,created_at);
CREATE INDEX IF NOT EXISTS idx_po_items_po ON purchase_order_items(purchase_order_id);
