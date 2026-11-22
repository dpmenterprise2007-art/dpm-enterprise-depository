# DPM Tender Intelligence & Bid Participation — MVP

## Purpose
Independent tender/RFQ discovery workspace for DPM Enterprise Private Limited. Government and private-sector opportunities, keyword search guidance, bid capture, eligibility notes, fit scoring, status pipeline, and CSV export.

## No third-party dependency
The HTML page uses only native HTML/CSS/JavaScript. No paid APIs, external JavaScript libraries, trackers, or external data providers are embedded. Portal links point to official procurement sites; those portals are the authoritative source.

## Included
- Government portal shortcuts (GeM, CPPP, Maharashtra eTender, Indian Railways, Coal India)
- Interior/furniture/fit-out keyword bank
- Tender/RFQ capture form
- Bid number, buyer, deadline, value, EMD, experience/turnover, score inputs
- Score and bid/no-bid review signal
- Participation route notes (direct, MSE/Startup relaxation when rules allow, JV/consortium if tender allows, subcontracting, vendor registration, supplier/OEM partner, private RFQ)
- Status pipeline and copyable bid summary
- CSV export
- Browser-local storage

## Scoring
The form scores match (25), profit (20), competition (10), payment safety (10), execution capability (10), location advantage (5). The total is 80. This is a decision aid, not an eligibility determination or winning probability. A displayed score does not override eligibility.

## Important limitations
- No live portal scraping or search API is wired into this MVP.
- The records are saved only in the browser where the page is opened; they are not shared across devices or users and have no central backup.
- Eligibility, bid docs, buyer identity, deadlines, and relaxations must be checked against the official tender document.
- The system does not submit bids, sign forms, access credentials, generate legally certified documents, or impersonate an authorized bidder.
- Direct participation requires company-authorized credentials, DSC/e-sign where applicable, and final approval by the authorized signatory.
- This version is a code commit, not a verified Cloudflare production deployment.

## Participation route checklist
1. Direct bidder (all criteria verified).
2. MSE/Startup/EMD/experience/turnover relaxations, only if permitted in bid and applicable law/policy.
3. Consortium/JV, only if expressly permitted.
4. Subcontracting to prime contractor, only where allowed and contract-compliant.
5. Vendor registration/empanelment with buyer.
6. OEM/manufacturer/authorized partner route, where permitted.
7. Private RFQ/quotation or rate contract.

## Next production requirements
- Central D1 persistence and authenticated role-based access.
- Live official-source discovery feeds/APIs (only where permitted; portal access constraints documented).
- PDF/BOQ parsing and evidence citations per extracted requirement.
- Document checklist templates and controlled document vault.
- Bid-calendar reminders and approval workflow.
- Rate analysis, margin, tax, transport, labour and cashflow model.
- Audit events, backups, security review, tests, and Cloudflare deployment/health verification.
