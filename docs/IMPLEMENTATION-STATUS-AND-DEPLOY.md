# Enterprise build branch — deploy and verify

This branch contains implementation additions, not a production-certified release.

## Added
- Additive D1 migration for departments, delegated work, marketplace applications, product catalog, enquiry tables, social content draft records and publishing attempt records.
- Seed marketplace category taxonomy.
- Public Worker API routes for marketplace category/product browsing, seller/vendor applications, product enquiries and company enquiries.
- SQLite migration smoke test and GitHub Actions workflow.

## Deploy prerequisites
1. Review/apply D1 migrations in order: `db/schema.sql`, `db/migrations/0002_enterprise_public_and_marketplace.sql`, `db/migrations/0003_seed_marketplace_categories.sql`.
2. Replace the placeholder D1 database id in `wrangler.toml`; verify bucket and Worker bindings in Cloudflare.
3. Configure secure authentication, rate limiting, spam controls, logging and secrets before exposing public application/enquiry POST routes.
4. CI should pass on the branch before any production promotion.
5. Cloudflare account access is required for D1 provisioning, Workers AI binding, Pages/Worker domain configuration, secrets, and production deployment.

## Safety / not yet shipped
No production domain is switched or live deployment claimed from this repository commit. The AI content generation/publishing agents, complete ERP UI, marketplace checkout/orders/settlement, department permission enforcement, integrations and end-to-end tests remain in active development. Public API handlers are not yet production hardened; do not expose them as a live service until security prerequisites are completed.
## Cloudflare deployment workflow
A guarded manual workflow is available at `.github/workflows/cloudflare-deploy.yml`. It requires GitHub Actions secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, runs the web build and migration/route tests, applies remote D1 migrations, ensures the R2 document bucket exists, then deploys the Worker. The workflow is deliberately manual and requires the exact confirmation `PUBLISH_FOUNDATION_ONLY`. This deploys only the API Worker foundation; it does not publish the complete Next.js ERP frontend or constitute a production-ready full ERP release.
