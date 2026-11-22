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
print("PASS: CRM and automation routes are present, protected, validated, and audited")
