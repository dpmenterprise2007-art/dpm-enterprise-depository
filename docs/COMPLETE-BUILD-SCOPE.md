# DPM Enterprise Complete Build — Locked Scope

This document is the release gate for the Cloudflare-first DPM Enterprise platform. It is a requirements tracker, not a claim that the features are already implemented.

## Deployment targets (not yet verified/configured)
- Public: www.dpmenterprise.in
- ERP: erp.dpmenterprise.in
- Marketplace: marketplace.dpmenterprise.in
- Mobile/PWA: app.dpmenterprise.in
- API: api.dpmenterprise.in

## Public website
- Corporate profile, services, project portfolio/gallery, enquiry/contact/WhatsApp, careers, customer registration, vendor registration, public CMS/blog, announcements, responsive design, accessibility, metadata, canonical URLs, sitemap, robots, local and national SEO pages, analytics/lead attribution.

## Marketplace — B2B A-to-Z
- Public buyer: browse/search, categories, brands, product/service details, filters, compare, wishlist, RFQ/bulk enquiry, cart, address, checkout, order tracking, reviews/ratings, returns/refunds, support and disputes.
- Seller: separate seller registration, KYC/business-document submission, verification/approval/suspension, storefront, catalog/products/services, SKU/variants/specifications/images, price/MRP/stock, shipping/warranty/returns, CSV/Excel import, enquiries/RFQs, orders, analytics, settlement statements.
- Vendor: distinct supplier/service/contractor/labour registration and management, documents, verification, quotations, purchase orders, performance.
- Admin: catalog moderation, category/attribute/brand management, buyer/seller/vendor support, fraud/report handling, disputes, order oversight, fees/commission settings, audit trail.
- Catalog integrity: only verified/source-backed products and specifications; no fabricated product data. Support approved bulk imports and moderation.

## Private ERP departments and delegated authority
- Director/Super-admin; organization-wide policy, critical approvals, audit.
- Department Head; scoped department management and assignment.
- Manager/supervisor; scoped work review and allocation.
- Employee, labour, site-in-charge; only assigned work and permitted records.
- Backend-enforced role, permission, department, record ownership, approval boundaries and audit events. HR cannot access restricted finance/director records by default; no self-approval of restricted transactions.
- Department modules: HR/recruitment/payroll/attendance/leave/labour; Sales/CRM; Finance/accounting/GST/invoices/expenses/receivables; Tender; Projects; Site operations; Design; Manufacturing; Procurement; Vendor; Inventory/Warehouse; Marketing/SEO; Social; Legal/Complaints; Customer Support/Warranty; IT/Security; Admin; Documents/Knowledge; Communication; Analytics; approvals; audit.

## CRM, customer hunting and intelligence
- Lead capture, contact/company profiles, source evidence, deduplication, scoring, owner/department assignment, pipeline, tasks, reminders, activity log, follow-up and conversion.
- Global public-source opportunity research for new openings, branches, expansions, offices, hotels, hospitals, clinics, restaurants, retail/showrooms, developers and corporate buyers.
- Evidence URL, source, capture/verification date, confidence and last-verified fields required. Never fabricate contacts; respect public-source access and do not bypass login/CAPTCHA.

## Government procurement and tender intelligence
- GeM buyer/seller participation support and opportunity tracking; tender discovery across supported public sources (GeM, CPPP/eProcure, state portals, PSU, railways, coal/mining, defence, municipal bodies).
- Tender record: source link/ID, buyer, value, deadlines, EMD/ePBG, eligibility, turnover/experience, BOQ, GST/HSN/rates/margins, checklist, documents, bid/no-bid decision, approvals, submission evidence, result/award and contract-to-project conversion.
- PDF/document extraction with human validation. Do not automate restricted portal actions or submit bids without explicit authorization and required human approval. Portal/API availability must be verified per source.

## Private RFQ/RFP
- Corporate procurement, builders/developers, hotels, hospitals, offices, retail, architects/PMC; opportunity evidence; RFQ/RFP/drawings/BOQ; costing/vendor comparison; quotation; negotiation; submission approvals; reminders; award tracking.

## BOQ, estimation and sales
- Itemized BOQ, rate library, quantity/units, HSN, GST, costs, markup/margin, vendor comparisons, quotation versions, approval, PDF/export, revisions, follow-up and won/lost reason. Site visit rule: ₹5,000 + 18% GST (₹5,900); never promise free site visits.

## Projects, site and manufacturing
- Project creation from award/order; scope, budget, milestones, task dependencies, calendar, owners, labour/team allocation, site-in-charge, site visits, progress/photos, issue/variation/change approvals, material requests, safety/checklists, timesheets, production jobs, manufacturing stages, QA, dispatch, installation, handover and closeout.

## Procurement, vendor and inventory
- Supplier onboarding/verification; purchase request, RFQ, comparison, approvals, purchase order, receipts, invoice matching; warehouses, stock movements, reservations, issue/return, reorder thresholds, serial/batch where applicable, audit and reports.

## Finance, compliance and HR
- Finance: chart of accounts, ledger, journals, GST, invoices, credit/debit notes, expenses, receivables/payables, bank reconciliation, cashflow, financial reports, approval and audit; validate accounting/tax rules with qualified review.
- HR: recruitment, onboarding, employee/labour records, documents, departments, designation, reporting lines, site allocation, attendance, shifts, leave, payroll, performance, training, disciplinary workflows, transfer, exit, access revocation.
- Compliance calendar, filings/tasks, evidence, reminders, status and approvals. Legal register/cases/notices/complaints, evidence, drafts, advocates, hearings, deadlines, follow-ups, escalation and closure.

## Marketing and social
- SEO audit/keywords/competitor research, PAN-India/local SEO, content/blog calendar, campaigns, creative/image generation, captions, hashtags, reels/video scripts, post queue, authorized publishing integrations, history, analytics, conversions and ROI.
- Preserve original DPM logo exactly as supplied; do not recreate/recolor it. Platform publishing requires authorized APIs/accounts and credentials; never claim publishing works until tested.

## Documents and communication
- Secure upload (PDF/Word/Excel/images), OCR, extraction, classification, dedup, versioning, search, entity links, deadlines/obligations, missing-doc checklists, department access and retention controls.
- Email/message center, templates, incoming thread tracking, follow-ups, approvals and evidence; sensitive outbound actions require approval.

## AI automation
- Agent registry, scoped tools/permissions, scheduled/triggered jobs, queues, retries, logs, usage/cost controls, stop/pause, approval gates, output validation, evidence and audit.
- Agents: management, research/hunting, lead verification, sales, tender, RFQ, BOQ, marketing, SEO, social, legal assistant, compliance, finance, HR, projects, procurement, documents, marketplace, support/reporting.
- External AI/API charges must not be incurred without owner approval; implement no-cost/local/Cloudflare-compatible options first and expose limits.

## Cloudflare-first architecture
- Pages for web frontends; Workers for API and backend; D1 for relational data; R2 for documents/images; Queues and Cron for background work. Cloudflare free-tier limits and feature availability must be checked at build/deploy time.
- Separate public/private API boundaries, authentication, authorization, rate limiting, CSRF/session protection, validation, secrets, backups/restore, migrations, monitoring and rollback.
- Do not add paid hosting or migrate to another hosting provider without approval.

## Release gate (do not mark complete until verified)
1. Route/module inventory; no dead links or placeholder-only screens.
2. Functional tests for create/read/update/delete where appropriate; validation and persistence.
3. Authentication, role/department isolation, approval and audit tests.
4. API/integration tests; background job/queue retry and failure tests.
5. Marketplace buyer/seller/vendor workflows and order lifecycle tests.
6. Tender/document extraction tests with human-validated outputs.
7. Responsive/mobile/PWA, accessibility, performance, SEO and security checks.
8. Migration/backup/restore and rollback tested.
9. Live Cloudflare deployment, domain/SSL, health and smoke tests verified.
10. Final status report with feature-by-feature evidence and honest WORKING/PARTIAL/MISSING status.

## Current truth
The repository currently contains an early Cloudflare/Next foundation. This scope document is committed to guide implementation; it is not evidence that the platform is finished or deployed.
