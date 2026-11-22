# DPM Enterprise OS Security Baseline

This is a starter implementation, not a production-certified corporate system.

## Required before production
- Implement authentication with strong password hashing and MFA support.
- Enforce organization-scoped authorization on every API and database operation.
- Never trust role claims supplied by the browser.
- Validate all input; use parameterized SQL.
- Add rate limits, abuse controls, session rotation, secure cookies, and CSRF protections.
- Keep credentials in Cloudflare Worker Secrets, never in source files.
- Add audit logging for admin, financial, HR, document, and automation actions.
- Encrypt data in transit and review at-rest, backups, and retention controls.
- Restrict document uploads by size/type and scan uploads where possible.
- Require human approval for external emails, payments, statutory filings, bid submission, and irreversible actions.
- Add incident response, backup/restore tests, security testing, dependency scanning, and vulnerability disclosure process.

## Deployment safety
Do not deploy with placeholder database IDs. Configure secrets and test staging before production.
