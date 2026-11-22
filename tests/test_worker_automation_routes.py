import pathlib

root = pathlib.Path(__file__).resolve().parents[1]
worker = (root / "src/worker.ts").read_text(encoding="utf-8")
required_routes = [
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
print("PASS: automation routes are present and guarded by ADMIN_TOKEN")
