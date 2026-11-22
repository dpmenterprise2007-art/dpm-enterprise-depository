import pathlib, sqlite3, json
root = pathlib.Path(__file__).resolve().parents[1]
db = sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys=ON")
for path in [root/"db/schema.sql", root/"db/migrations/0002_enterprise_public_and_marketplace.sql", root/"db/migrations/0003_seed_marketplace_categories.sql"]:
    db.executescript(path.read_text(encoding="utf-8"))
tables = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
required = {"departments","department_memberships","work_assignments","marketplace_categories","marketplace_seller_applications","marketplace_vendor_applications","marketplace_products","marketplace_enquiries","public_enquiries","social_content_drafts","social_publish_attempts"}
missing = required-tables
assert not missing, f"Missing tables: {sorted(missing)}"
assert db.execute("SELECT COUNT(*) FROM marketplace_categories").fetchone()[0] >= 15, "Category seeds missing"
db.execute("INSERT INTO organizations(id,legal_name) VALUES('test-org','Test Company')")
db.execute("INSERT INTO users(id,organization_id,email,display_name,role,status) VALUES('test-user','test-org','test@example.com','Test User','owner','active')")
db.execute("INSERT INTO marketplace_seller_applications(id,business_name,contact_name,email,phone,business_type,status) VALUES('seller1','Seller Co','Test','seller@example.com','9999999999','Manufacturer','pending')")
db.execute("INSERT INTO marketplace_vendor_applications(id,business_name,contact_name,email,phone,vendor_type,status) VALUES('vendor1','Vendor Co','Test','vendor@example.com','9999999999','Supplier','pending')")
db.execute("INSERT INTO marketplace_products(id,seller_application_id,title,slug,status,seller_name) VALUES('product1','seller1','Test Product','test-product','approved','Seller Co')")
db.execute("INSERT INTO marketplace_enquiries(id,name,email,message) VALUES('enquiry1','Test','test@example.com','Test enquiry')")
db.execute("INSERT INTO public_enquiries(id,name,email,message) VALUES('public1','Test','test@example.com','Public enquiry')")
db.execute("INSERT INTO social_content_drafts(id,channel,caption) VALUES('social1','instagram','Test caption')")
assert db.execute("SELECT COUNT(*) FROM marketplace_products WHERE status='approved'").fetchone()[0] == 1
assert db.execute("PRAGMA foreign_key_check").fetchall() == []
print("PASS: migration, seeded categories, CRUD smoke checks, and foreign-key integrity")
