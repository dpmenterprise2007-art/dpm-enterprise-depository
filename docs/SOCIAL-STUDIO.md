# DPM Social Media Studio MVP

## Scope
Owned-code content queue for DPM Enterprise. No SaaS scheduler, external JS library, paid data provider, or embedded tracking.

## Features
- Draft brief builder (format, pillar, audience, language, visual notes)
- Content queue with status flow: DRAFT, REVIEW, APPROVED, SCHEDULED, PUBLISHED
- Six channel labels: Instagram, Facebook, YouTube Shorts, LinkedIn, Pinterest, X
- Copy brief, CSV export, local browser persistence
- Mobile responsive UI
- Dashboard counts for draft/approved/published

## Not yet implemented / verified
- AI generation API integration (requires model/provider config; no API keys in repository)
- Video/image asset generation or rendering
- Social platform publishing APIs, account OAuth, token vault
- Scheduled publishing worker, platform rate limits, retries, webhook handling
- Shared cloud database, user auth, approval roles, analytics API
- Live deployment

## Brand safety
Use official DPM logo asset without recreating/recoloring it. Do not fabricate project/client results. Human review required before public content. Secure platform tokens server-side only; never commit secrets.
