-- DPM Enterprise OS automation foundation: agents, tasks, approvals, workflows and audit.
CREATE TABLE IF NOT EXISTS automation_agents (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, agent_type TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
 config_json TEXT NOT NULL DEFAULT '{}', status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','paused','disabled')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_automation_agents_status ON automation_agents(status);
CREATE TABLE IF NOT EXISTS automation_tasks (
 id TEXT PRIMARY KEY, agent_id TEXT, task_type TEXT NOT NULL, payload_json TEXT NOT NULL DEFAULT '{}',
 status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','awaiting_approval','completed','failed','cancelled')),
 attempts INTEGER NOT NULL DEFAULT 0, max_attempts INTEGER NOT NULL DEFAULT 3, scheduled_at TEXT, started_at TEXT, completed_at TEXT, last_error TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(agent_id) REFERENCES automation_agents(id)
);
CREATE INDEX IF NOT EXISTS idx_automation_tasks_status_schedule ON automation_tasks(status,scheduled_at,created_at);
CREATE INDEX IF NOT EXISTS idx_automation_tasks_agent ON automation_tasks(agent_id);
CREATE TABLE IF NOT EXISTS automation_approvals (
 id TEXT PRIMARY KEY, task_id TEXT, action_type TEXT NOT NULL, details_json TEXT NOT NULL DEFAULT '{}',
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','expired')),
 requested_by TEXT NOT NULL DEFAULT 'system', reviewed_by TEXT, review_note TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, reviewed_at TEXT,
 FOREIGN KEY(task_id) REFERENCES automation_tasks(id)
);
CREATE INDEX IF NOT EXISTS idx_automation_approvals_status ON automation_approvals(status,created_at);
CREATE TABLE IF NOT EXISTS automation_audit_log (
 id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT, details_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_automation_audit_created ON automation_audit_log(created_at);
CREATE TABLE IF NOT EXISTS automation_workflows (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
 trigger_type TEXT NOT NULL DEFAULT 'manual' CHECK(trigger_type IN ('manual','schedule','event')),
 trigger_config_json TEXT NOT NULL DEFAULT '{}', steps_json TEXT NOT NULL DEFAULT '[]',
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','paused','disabled')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_automation_workflows_status ON automation_workflows(status);
