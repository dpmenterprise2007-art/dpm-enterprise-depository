# DPM Enterprise Autonomous AI Build & Release System

## Objective
Move DPM Enterprise from AI-assisted operations toward a controlled autonomous engineering and operations platform. This document defines the implementation contract; it is not a claim that the engine is already live.

## Core engines
1. **Build Orchestrator** — accepts feature/bug goals, checks repository and platform context, creates a scoped build plan and work item.
2. **Code Builder** — edits isolated branches, generates code and migrations, and records every changed file.
3. **Test & Repair Engine** — runs type checks, lint, unit/integration tests, build, and bounded repair cycles. Stop and report when repair budget is exhausted.
4. **Release Engine** — stages successful builds, runs smoke tests, publishes only within configured release policy, and records deployment evidence.
5. **Rollback & Recovery** — detects failed health checks, pauses release, and restores the last known good version where supported.
6. **Business Agents** — AI agents for research/data hunting, sales/CRM, BOQ, tender intelligence, project execution, procurement, finance, HR, marketing, compliance, support and analytics. Each agent must use tool allowlists and tenant/org scoping.

## Autonomous build lifecycle
Request -> scope/plan -> branch/workspace -> code/migration -> tests -> bounded repair -> staging -> smoke checks -> policy decision -> release -> health verification -> audit log.

## Release policy
- Auto-release only low-risk, reversible changes that pass all CI, security, and smoke checks.
- Human approval required for auth/permissions, secrets, payments, financial records, destructive migrations, irreversible external actions, and production data changes.
- Never expose or print credentials in logs, prompts, UI, or build artifacts.
- No arbitrary shell/code execution from user-supplied prompts in the production Worker.
- Use least-privilege GitHub token stored as a secret; token must not be available to client/browser.
- AI generated output is untrusted; scan and validate it.
- Release and rollback are idempotent and auditable; record actor, agent, request, commit, tests, approval, deployment result and health checks.

## Required build queue entities
Build requests: id, organization_id, requester, goal, priority, risk_level, status, created_at, updated_at.
Build plans: request_id, plan_json, approval_state, created_at.
Build runs: request_id, branch, commit_sha, status, repair_attempts, test_report, deployment_id, release_url, rollback_ref, started_at, completed_at.
Build artifacts: run_id, path, digest, classification.
Audit events: run_id, actor, action, detail_json, created_at.

## Status states
queued, planning, awaiting_approval, building, testing, repairing, staging, releasing, verifying, succeeded, failed, cancelled, rolled_back.

## UI
Create an AI Build & Release Center with:
- New build request / feature goal
- Pending build queue and live status
- Plan and risk review
- Branch/commit links
- CI checks and failure diagnostics
- Bounded repair attempts
- Staging preview
- Approve/reject controls for protected changes
- Release history, health checks, rollback action
- Audit trail and clear cost/usage visibility

## Integration roadmap
Phase A: Secure build queue, request/plan APIs, audit records and dashboard; no production code execution.
Phase B: GitHub branch/PR automation using a server-side least-privilege token; CI test status collection.
Phase C: isolated code-builder workspace and artifact handling; run tests in CI, not in the live Worker.
Phase D: staging deployment, smoke tests, release policy, protected approvals.
Phase E: controlled low-risk auto-release, health monitoring, rollback, notifications.
Phase F: business-agent workflows with data connectors, evidence, scoring, CRM writeback, approval-gated outreach/actions.

## Definition of done
The system is only called autonomous-build-live when it demonstrably accepts a request, creates a scoped branch, commits generated changes, runs CI, presents evidence, stages, follows release policy, deploys, verifies health, and records rollback capability. Dashboard mockups, prompt catalogs, or deployment of the existing application do not satisfy this definition.
