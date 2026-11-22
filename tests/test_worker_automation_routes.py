import pathlib

root = pathlib.Path(__file__).resolve().parents[1]
worker = (root / "src/worker.ts").read_text(encoding="utf-8")
required_routes = [\n    "/api/admin/crm/organizations",\n    "/api/admin/crm/leads",\n    "PATCH /api/admin/crm/leads/:id",
    "/api/admin/automation/summary",
    "/api/admin/automation/agents",
    "/api/admin/automation/tasks",
    "/api/admin/automation/workflows",
    "/api/admin/automation/approvals",
]
for route in required_routes:
    assert route in worker, f"Missing automation route: {route}"
assert "adminOk(request,env)" in worker, "Automation admin routes must be protected"
assert "ADMIN_TOKEN" in worker, "Admin token gate missing"\nassert "organization_id is required" in worker, "CRM leads must be scoped to an organization"\nassert "Invalid lead stage" in worker, "CRM lead stage validation missing"\nassert "lead_created" in worker and "lead_updated" in worker, "CRM audit trail missing"
print("PASS: CRM and automation routes are present, protected, validated, and audited")
