import pathlib, sqlite3, json
root = pathlib.Path(__file__).resolve().parents[1]
db = sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys=ON")
for path in [root/"db/schema.sql", root/"db/migrations/0002_enterprise_public_and_marketplace.sql", root/"db/migrations/0003_seed_marketplace_categories.sql", root/"db/migrations/0004_automation_core.sql", root/"db/migrations/0005_projects_quotations.sql"]:
    db.executescript(path.read_text(encoding="utf-8"))
tables = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
required = {"departments","department_memberships","work_assignments","marketplace_categories","marketplace_seller_applications","marketplace_vendor_applications","marketplace_products","marketplace_enquiries","public_enquiries","social_content_drafts","social_publish_attempts","automation_agents","automation_tasks","automation_approvals","automation_audit_log","automation_workflows","projects","quotations","quotation_items"}
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
db.execute("INSERT INTO automation_agents(id,name,agent_type,status) VALUES('agent-test','Test Agent','test','draft')")
db.execute("INSERT INTO automation_tasks(id,agent_id,task_type,payload_json) VALUES('task-test','agent-test','test_task','{}')")
db.execute("INSERT INTO automation_approvals(id,task_id,action_type,details_json) VALUES('approval-test','task-test','publish','{}')")
db.execute("INSERT INTO automation_audit_log(id,actor,action,entity_type,entity_id) VALUES('audit-test','tester','created','task','task-test')")
db.execute("INSERT INTO automation_workflows(id,name,trigger_type,steps_json) VALUES('workflow-test','Test workflow','manual','[]')")
assert db.execute("PRAGMA foreign_key_check").fetchall() == []
print("PASS: migrations 0002-0004, marketplace CRUD, automation schema, and foreign-key integrity")

# Project and quotation schema integration smoke checks
db.execute("INSERT INTO projects(id,organization_id,name,status) VALUES('project-test','test-org','Test Project','planning')")
db.execute("INSERT INTO quotations(id,organization_id,project_id,quotation_number,client_name,subtotal,discount_amount,taxable_amount,gst_rate,gst_amount,total_amount) VALUES('quote-test','test-org','project-test','Q-TEST-001','Test Client',1000,0,1000,18,180,1180)")
db.execute("INSERT INTO quotation_items(id,quotation_id,description,unit,quantity,rate,amount,gst_rate) VALUES('quote-item-test','quote-test','Test item','Nos',2,500,1000,18)")
assert db.execute("SELECT total_amount FROM quotations WHERE id='quote-test'").fetchone()[0] == 1180
