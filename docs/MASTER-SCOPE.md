# DPM Enterprise OS — Complete Master Scope

Status: **Scope baseline / implementation not yet complete or deployed**.
Platform direction: Cloudflare-first, free-tier-first, owned code in GitHub. No Lovable or paid builder dependency.
Company defaults: India, INR, GST, Asia/Kolkata.

## 0. AI Control Plane (cross-module)
- AI command center; natural-language requests and contextual assistants
- Multi-agent routing with defined tools, permissions, budgets, and task boundaries
- Workflow builder: trigger → conditions → steps → approval gates → retries → timeout → audit
- Self-creation mode: AI may draft new pages, forms, workflows, reports, scripts, templates, and module proposals in a sandbox branch; create tests; produce a preview and change diff; request human approval; deploy only after authorized approval and passing checks
- Self-improvement loop: user feedback, task outcomes, error analytics, suggested optimizations, versioned prompt/tool configurations
- Agent registry, task queue, run history, trace logs, token/API usage, limits, cancellation, kill switch
- No autonomous access to secrets or unrestricted production writes; approvals for finance, legal, HR, client communications, purchases, public publishing, destructive changes, and production deployments
- AI fallback: core system remains usable without an external model; graceful degraded mode and provider configuration

## 1. Website & Digital Presence
- Public company website/CMS, pages, services, portfolio, case studies, gallery, SEO, sitemap, robots, analytics, contact forms, lead capture, blog/news
- Page builder blocks/templates, drafts, revision history, preview, scheduled publishing, approvals
- Landing-page and campaign creation assistant; SEO/content audit; accessibility and performance checks

## 2. Client Portal & Customer Experience
- Secure client accounts, invitations, recovery, MFA options, profiles, consent/preferences
- Client dashboard, projects, timelines, milestones, site updates, photo/video, tasks
- Design/drawing/3D/material choices, revision compare, approval/rejection/comments
- Quotations, contracts, change orders, invoices, GST, receipts, payment schedule and balance
- Messages, meetings, notifications, support tickets, complaint escalation
- Documents, warranties, handover checklist, maintenance requests, feedback/reviews
- Client data isolation, export, account disable/retention controls

## 3. CRM, Sales & Marketing
- Leads, contacts, companies, sources, deduplication, scoring, segmentation, pipeline
- Sales activities, calls, email, WhatsApp integration where configured, reminders, follow-ups
- Proposals, estimates, quotation revisions, negotiation, conversion and lost reasons
- Campaigns, mailing lists/consent, content calendar, social channel integrations
- AI lead research/qualification, outreach drafts, follow-up suggestions, meeting summaries
- Sales dashboards, forecasts, conversion analysis, target tracking

## 4. Vendor & Supplier Management
- Vendor discovery, onboarding, KYC/document checklist, GST/PAN verification workflow
- Vendor categories, contacts, locations, products/services, rates, catalogs
- Vendor approvals, rating, performance, risk/expiry alerts, blacklisting with reason
- RFQ creation, supplier invitations, bid comparison, negotiation history, vendor contracts
- Vendor portal, quotation submission, PO visibility, delivery updates, invoice submission
- Compliance and document expiry monitoring

## 5. Purchase, Procurement & Inventory
- Purchase requisitions, approvals, RFQ, comparative statements, purchase orders
- Budget checks, split/partial orders, delivery tracking, GRN, inspection, returns
- Inventory, warehouses, stock levels, reservations, transfers, consumption, reorder rules
- Materials, furniture, fittings, hardware, finishes, tools, asset register
- Procurement planning from BOQ/project milestones; vendor price history and variance
- Three-way matching (PO–GRN–invoice), exception queue, approval audit

## 6. Projects, Site & Execution
- Project setup, scope, WBS, roles, budget, schedule, milestones, dependencies
- BOQ, quantity/rate/measurement, variations, cost control, margin and forecast
- Site visits, checklists, site reports, photos, daily progress, issues, risks, safety
- Task assignment, calendar, timesheets, subcontractors, materials consumption
- Design revisions, approvals, quality checks, snag/punch list, handover
- Project closeout, warranty and lessons learned

## 7. BOQ, Estimation, Tender & GeM
- BOQ templates, item master, HSN/SAC, units, quantities, wastage, rate analysis
- Costing: materials, labor, transport, overhead, contingency, margins, GST
- Tender discovery and qualification checklist, bid calendar, eligibility, EMD/ePBG tracking
- Document vault, compliance matrix, bid/no-bid review, submission checklist
- Tender-specific pricing review, risk notes, approval and final bid record
- No automated bid submission without human approval

## 8. Finance, Accounting & Tax
- Chart of accounts, vouchers, journals, ledgers, trial balance
- Receivables, payables, cash/bank, expenses, reimbursements, petty cash
- Invoices, credit/debit notes, receipts, payment reconciliation
- GST tax configuration, input tax credit tracking, return-preparation exports/checklists
- TDS tracking, vendor/customer tax details, e-invoice/e-waybill integration when eligible and configured
- Budgets, project profitability, cash flow, P&L, balance sheet, aging
- Accountant review, lock periods, audit trail; no unsupported filing claims

## 9. HR, Payroll & Workforce
- Employee directory, onboarding/offboarding, roles, contracts, documents
- Attendance, shifts, leave, holidays, timesheets, field/site attendance options
- Payroll components, deductions, reimbursements, payslips, payroll approvals
- Recruitment, candidate pipeline, interview scheduling, offer/onboarding
- Performance, training, policy acknowledgements
- PF/ESIC/PT/TDS compliance calendars and reports, subject to applicability and professional review

## 10. Legal, Governance & Compliance
- Corporate documents, board/shareholder records, resolutions, registers
- ROC/MCA/GST/labor/contract/license calendar and reminders
- Agreements, notices, claims, disputes, case chronology, legal tasks
- Document templates, review/approval/version control
- Compliance checklist and evidence vault; alert when requirements change
- Legal/tax outputs flagged for authorized professional review

## 11. Documents & Knowledge
- Central document vault, folders/tags, project/client/vendor linkage
- Versioning, access control, preview/download, retention, audit
- OCR/search, metadata extraction, AI summaries, Q&A with source references
- Templates, e-sign integrations where available, expiry alerts

## 12. Communications & Collaboration
- Email integration, shared inbox, classification, draft replies, approval-to-send
- Calendar, meetings, agenda, notes, tasks, reminders
- Internal chat/comments, mentions, activity feed
- WhatsApp/SMS/push integrations only when credentials/providers are configured
- Communication log attached to client/vendor/project records

## 13. Marketing & Content Studio
- Brand asset library and brand guardrails
- Content ideation, copy, captions, scripts, image briefs, video/reel storyboards
- Campaign calendar, approvals, scheduling, publishing integrations
- SEO audit, keywords, page metadata, local pages, analytics
- Original logo protection: supplied logo remains unchanged, no AI recreation/recoloring

## 14. Service, Support & Warranty
- Ticketing, priority, SLA, assignment, escalation, internal notes
- Client service requests, defects, warranty claims, maintenance schedule
- Resolution evidence, customer satisfaction, reopen workflow

## 15. Admin, Identity & Security
- Organizations, users, roles, granular permissions, invitations, MFA, sessions
- Client/vendor access scopes, least privilege, tenant isolation
- Audit logs, security alerts, rate limits, CSRF/XSS protections, secure headers
- Secrets management, encrypted sensitive fields, backup/restore and recovery drills
- Data export/deletion workflows, retention policy, incident response
- Admin feature flags, configuration, maintenance mode, kill switches

## 16. Analytics & Reporting
- Executive dashboard, sales funnel, project health, cash flow, profitability
- Procurement spend, vendor scorecards, inventory, HR and compliance indicators
- Custom report builder, filters, scheduled reports, export CSV/PDF
- Data lineage and metric definitions; no fabricated metrics

## 17. Automation & Integration Hub
- Event triggers, schedules, webhooks, queues, retries, idempotency
- Workflow templates, approvals, error handling, dead-letter queue, run replay
- Gmail/Outlook, calendar, website forms, accounting, payment, messaging, social, storage APIs
- Integration health, credential status, quotas, logs and disconnect controls

## 18. Platform/Infrastructure (Cloudflare-first)
- Cloudflare Workers, D1, R2, Queues, Cron, Durable Objects only where needed
- Free-tier-aware architecture and quotas; no promise that every external API is free
- Dev/staging/production separation, migration scripts, CI checks, deploy previews
- Observability, uptime checks, error reporting, backups and rollback strategy

## 19. Release Acceptance Gate
- Requirement/module traceability checklist
- Unit, integration, API, UI, security, accessibility, responsive and performance tests
- Database migration/restore verification
- Manual UAT for all high-risk flows
- No critical/high unresolved security defects
- Deployment and live health/API checks
- Known limitations, release notes, rollback instructions
- **Do not call the portal complete, production-ready, or live until this gate is passed and verified.**

## 20. Initial priority sequence
1. Foundation/security/data model and CI/test/deployment pipeline
2. Admin, identity, permissions and client portal
3. CRM/sales/marketing and communication
4. Vendor, purchase, inventory, RFQ/PO
5. Projects/site/BOQ/tender/GeM
6. Finance/accounting/GST
7. HR/payroll/compliance/legal
8. AI automation center and sandboxed self-creation
9. Reporting, integrations, QA, UAT, final production release

This master scope is intentionally broad; implementation is tracked separately from requirements.