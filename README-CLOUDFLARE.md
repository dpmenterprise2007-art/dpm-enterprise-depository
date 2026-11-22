# DPM Enterprise OS — Cloudflare-first

This project is intended to run on Cloudflare free/low-cost services where limits permit. It is a starter foundation; it is **not yet a complete ERP or production deployment**.

## Current starter
- Cloudflare Worker entry point with `/` and `/api/health`
- Initial D1 schema for organizations, users, audit events, leads, and automation jobs
- Security baseline checklist
- Wrangler configuration with database ID placeholder

## Planned module groups
Corporate governance; CRM/sales; email; tender/GeM; project delivery; procurement/vendors/inventory; finance/accounting/GST; HR/payroll/statutory compliance; documents; meetings; communications; marketing/social publishing; AI task orchestration.

## Deploy prerequisites
1. Install Node.js and Wrangler.
2. Sign in: `npx wrangler login`.
3. Create D1 database and replace placeholder database_id in wrangler.toml.
4. Create R2 bucket named `dpm-enterprise-documents`.
5. Apply schema: `npx wrangler d1 execute dpm-enterprise-os --remote --file=db/schema.sql`.
6. Deploy: `npx wrangler deploy`.

A production release must add authentication, RBAC, organization isolation, rate limits, audit coverage, backup/restore, integration secrets, approval workflows, and end-to-end tests. Never deploy this starter as a finished enterprise system.
