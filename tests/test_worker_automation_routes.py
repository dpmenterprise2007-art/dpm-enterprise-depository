import pathlib

root = pathlib.Path(__file__).resolve().parents[1]
worker = (root / "src/worker.ts").read_text(encoding="utf-8")
required_routes = [
    "/api/admin/crm/organizations",
    "/api/admin/crm/leads",
    "PATCH /api/admin/crm/leads/:id",
    "/api/admin/automation/summary",
    "/api/admin/automation/agents",
    "/api/admin/automation/tasks",
    "/api/admin/automation/workflows",
    "/api/admin/automation/approvals",
    "/api/admin/ai/modules",
]
for route in required_routes:
    assert route in worker, f"Missing automation route: {route}"
assert "adminOk(request,env)" in worker, "Automation admin routes must be protected"
assert "ADMIN_TOKEN" in worker, "Admin token gate missing"
assert "organization_id is required" in worker, "CRM leads must be scoped to an organization"
assert "Invalid lead stage" in worker, "CRM lead stage validation missing"
assert "lead_created" in worker and "lead_updated" in worker, "CRM audit trail missing"
assert "async scheduled(" in worker, "Scheduled task executor hook missing"
assert "crm_followup_scan" in worker, "CRM follow-up scan task missing"
assert "health_check" in worker, "Health check task missing"
assert "allow-listed" in worker, "Safe execution allow-list messaging missing"
assert "output_json=?" in worker, "Task output must be persisted"
assert "ai_module_catalog" in worker, "AI module catalog lookup missing"
assert "task_prompt" in worker, "Specialized AI prompt routing missing"
print("PASS: CRM and automation routes are present, protected, validated, and audited")

# Public live landing page and status API smoke assertions
assert 'DPM Enterprise OS' in worker, "Public homepage branding missing"
assert '/api/public/platform-status' in worker, "Public platform status endpoint missing"
assert 'Send a project enquiry' in worker, "Public enquiry form missing"
assert "fetch('/api/public/enquiry'" in worker, "Public enquiry form must call the enquiry endpoint"
assert 'Autonomous Build & ERP' in worker, "Public status must disclose incomplete autonomous ERP features"
print("PASS: public homepage, status endpoint, and enquiry form markers exist")

# CRM functionality assertions for search, source filtering, and activity history.
assert 'search=clean(url.searchParams.get("search"),160)' in worker, "CRM lead search query missing"
assert 'source=clean(url.searchParams.get("source"),100)' in worker, "CRM source filter missing"
assert 'activityMatch=url.pathname.match' in worker, "CRM lead activity endpoint missing"
assert '/activity' in worker, "CRM activity endpoint path missing"
assert 'company_name LIKE ? OR contact_name LIKE ? OR email LIKE ? OR phone LIKE ?' in worker, "CRM multi-field search missing"
print("PASS: CRM search, source filter, and lead activity endpoint markers exist")
