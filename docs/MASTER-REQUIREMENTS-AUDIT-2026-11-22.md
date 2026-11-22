# DPM Enterprise + DPM Nexus Unified OS — Master Requirements Audit
Updated: 2026-11-22
Branch: enterprise-complete-build

This is the consolidated requirements register from prior conversations. It is a scope document, not a claim that the listed modules are implemented.

## Product constraints
- Unified DPM Enterprise official website and DPM Nexus enterprise operating system in one ecosystem.
- Branding: DPM Nexus navy + DPM Enterprise dark yellow/gold. Keep the supplied official logo unchanged; no AI recreation, recoloring, or redesign. Social creatives should keep logo small in top-left, no more than 5% of canvas area.
- Full A-to-Z scope; do not artificially split into V1/V2/V3.
- User has requested no paid upgrades and a ₹0/free-tier-first deployment where feasible. Clearly identify unavoidable costs or provider limits before relying on them; do not silently add paid services.
- Mobile-first, responsive, production-grade UX; every module must have real data/API behavior, permissions, loading/error states, and auditability. No fake buttons or unsupported “live” claims.
- Site visit pricing policy: ₹5,000 + 18% GST = ₹5,900; AI/website/agent must not offer or promise free site visits.
- Production publishing, external communications/campaigns, financial actions, GST submissions, destructive actions, permissions/security changes and production code deployment require explicit authorized approval.

## Public website
- Recreate homepage, About, Contact, Services, Projects/Portfolio, Clients/credentials, Marketplace/public enquiry, login entry, SEO/local landing pages, newsletter/contact capture.
- Route-aware navigation (no broken static links); enquiry persistence and delivery/CRM routing.
- SEO: canonical HTTPS, sitemap, robots, metadata, descriptive alt text, optimized images, responsive/mobile, Core Web Vitals, local and pan-India service SEO.
- Public claims (project counts, awards, Startup India/MSME, clients) must be editable and evidence-backed; avoid unsupported claims.

## Core ERP / Business OS
- AI command center with global search, task inbox, assistant, alerts, approvals and reports.
- CRM: lead capture, source, deduplication, qualification/scoring, customer records, pipeline, follow-up schedules, activity history, reminders, site visit workflow.
- Sales: opportunities, sales stages, proposals, pricing, order/contract, revenue targets, handover to projects.
- BOQ/costing: line-item units/quantities, material/labor/overhead, vendor rates, margin controls, GST (18% where applicable), HSN, revisions, import/export and quote generation. Support CPWD-style BOQs and tender pricing; margin configurable (15% default where previously requested, but allow project-specific overrides).
- Tender intelligence: GeM, IREPS, government e-procurement sources; discovery/alerts, documents/NIT parsing, eligibility checklist, dates, EMD/ePBG, risk, bid/no-bid, line-item costing, clarifications, compliance and approval workflow. Never submit a bid without authorized approval.
- Projects/site execution: scope, site visit (paid rule), survey, drawings, task assignment, milestones, materials, labor, photos, change orders, QA, site reporting, handover, client visibility.
- Design & manufacturing: interior design, modular kitchens, wardrobes, custom furniture, drawing/material/specification versions, production stages, workshop tasks, quality, delivery and installation. Project-specific finish constraints must be honored (e.g., no-laminate requests).
- Procurement/vendors: vendor directory, onboarding, verification, RFQs, comparisons, approvals, POs, delivery tracking, vendor bills, ratings/quality.
- Inventory: stock items, units, locations, reservations, movements, reorder thresholds, project consumption, reconciliation.
- Finance: quotation-to-invoice, sales/purchase invoices, expenses, receivables/payables, cash/bank ledger, GST summaries, reconciliation, profitability, budgets. Accounting actions require approval; integrate/export to accountant-supported tools where practical.
- HR: employee directory, recruitment, roles, attendance, leave, payroll calculations, performance, field team, compliance. Sensitive payroll and HR access restricted.
- Documents/knowledge: secure R2-backed storage, metadata, templates, versioning, permissions, search, knowledge base, BOQ/contract/tender/finance files.
- Customer portal: quote/approval, project progress, documents, messages, change requests, payment milestones.
- Marketplace: buyers/sellers/vendors/products/categories, applications, enquiries, moderation, status and abuse controls.
- Analytics: KPIs, lead-to-order conversion, project margin, cash flow, tender pipeline, procurement savings, task/agent reliability, aging and forecasts.

## Marketing & communications
- Social content planner, copy + original high-quality image workflow, brand checks, calendar and analytics.
- User's stated 3-post schedule: 9 AM, 1 PM, 6 PM (also later routine clarification mentioned posting at 9 and wrapping online work at 5 PM; schedules should be configurable and not assume these are interchangeable).
- Verify final image quality before publish; use original supplied logo, unchanged, small top-left (max 5% image area).
- SEO/local landing page/content calendar and lead capture.
- Email inbox/thread monitoring, drafts, contact/vendor outreach, follow-ups and templates; no auto-send on sensitive/high-stakes messages without approval. Maintain thread context and avoid duplicate sends.
- WhatsApp/calling/SMS workflows only with supported provider and authorized credentials, opt-in/consent, compliance, logging and user approval where required; never pretend calls/messages happened if not connected.

## AI and automation
- Agent registry, roles, capabilities, instructions, task queue, schedules/event triggers, retries, task state, approvals, logs, pause/disable controls, observability and budgets.
- Agent builder/self-creation: create proposed agents from a specification, validate capabilities/permissions, save as draft, require owner approval before activation.
- Agents may research, draft, analyze, classify, summarize, prepare reports and run sandbox checks autonomously within granted scopes.
- Self-improvement/update pipeline: propose change -> isolated branch -> code/tests/security scans -> preview -> human approval -> controlled release -> monitor -> rollback. No autonomous production mutation.
- Tool/endpoint registry, integrations health, rate limits, secret vault bindings (never store or print raw secrets), least privilege and revocation.
- Automation must be idempotent where possible, respect rate limits, and record audit trail.

## Governance, security, reliability
- Authentication (Google OAuth when configured plus secure fallback), sessions, organization/users, RBAC, permission scopes, MFA-ready controls, audit logs.
- Protect public endpoints: validation, abuse/rate limiting, spam/honeypot, CORS allowlist, security headers.
- Admin APIs protected by bearer/identity auth; don't ship wildcard CORS for sensitive routes.
- Secrets via environment bindings, not source control.
- Database migrations and backups; backup/restore drills; monitoring, error reporting, uptime/health, logs, alerts.
- Approval inbox for send/publish, bid submissions, finance/GST, permissions, deletions, production deploys and external actions.
- Accessibility, mobile responsiveness, data export, retention controls, privacy notice and consent.
- API documentation, endpoint inventory, tests for migrations, routes, permissions, core workflows and integrations.

## Integrations / release
- Cloudflare Pages/Workers + D1 + R2 intended stack, subject to free-tier/limits and actual account configuration.
- Provider integrations should be optional adapters and tested; no fake integration status.
- Environment/deployment configuration must be validated; production secrets and D1 IDs are user-provided via secure dashboard/secret commands.
- CI: migrations, lint/type-check/build, route/API tests, security checks.
- Release checklist: all checks pass; migrations reviewed; secrets/config verified; backup; staging/preview; owner approval; deploy; smoke tests; rollback path.

## Known implementation status at audit
- Existing repo currently contains Next.js scaffold, Cloudflare Worker public marketplace/enquiry routes, migration files 0002-0004 and automation management endpoints on branch.
- Automation endpoints currently create/list/control draft agents/workflows, queue records, and review approvals. Task queue does not execute; workflows are not scheduled; AI model/provider is not connected.
- Public marketplace/enquiry routes are foundation only and need production security, rate limiting and CORS consistency.
- Frontend remains a scaffold, not complete module UI.
- Cloudflare D1 ID in wrangler.toml remains placeholder; production credentials, bindings, deployment and live verification are pending.
- CI must be checked for the newest commits; no new commit is considered verified until checks are actually observed.
