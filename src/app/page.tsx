import Link from 'next/link';

const modules = [
  ['CRM & Sales', 'Lead records, organization selector, pipeline stages and follow-up fields', 'API-connected interface', '/crm'],
  ['Research & Buyer Intel', 'Evidence-backed opportunities and buyer verification', 'Not implemented', null],
  ['BOQ & Quotations', 'Line items, rates, GST, margin, revisions and exports', 'Not implemented', null],
  ['Projects & Execution', 'Project register, client/site details, budget, dates and status tracking', 'API-connected interface', '/projects'],
  ['Procurement & Inventory', 'Vendors, RFQs, purchase orders, stock and manufacturing', 'Not implemented', null],
  ['Finance & Compliance', 'Invoices, GST, receivables, payables, ledger and compliance', 'Not implemented', null],
  ['Marketing & Website', 'SEO, enquiries, content quality and publishing workflows', 'Not implemented', null],
  ['AI Automation', 'Agent tasks, approvals, logs and pause controls', 'Foundation only', null],
];

export default function Home() {
  return (
    <main className="shell">
      <header className="topbar"><div className="brand"><span className="mark">D</span><div><strong>DPM ENTERPRISE</strong><small>Business Operating Platform</small></div></div><span className="pill">Build status</span></header>
      <section className="hero"><p className="eyebrow">DPM ENTERPRISE PRIVATE LIMITED</p><h1>One workspace.<br/><span>Every operation connected.</span></h1><p className="intro">Unified business workspace for sales, projects, procurement, finance, compliance and AI-assisted operations.</p><div className="hero-actions"><a href="https://www.dpmenterprise.in" target="_blank" rel="noreferrer">Company website ↗</a><Link href="/crm">Open CRM & Sales ↗</Link><Link href="/projects">Open Projects ↗</Link><a href="/tender-control-room.html">Tender Control Room ↗</a><a href="/social-studio.html">Social Media Studio ↗</a><span className="status"><i/> Development build</span></div></section>
      <section className="section"><div className="section-head"><div><p className="eyebrow">WORKSPACE MAP</p><h2>Platform modules</h2></div><span className="muted">Status reflects implemented functionality</span></div><div className="grid">{modules.map(([name,desc,status,href])=><article className="module" key={name}><div className="module-top"><span className="dot"/><span className="module-status">{status}</span></div><h3>{name}</h3><p>{desc}</p>{href&&<Link className="module-link" href={href}>Open module →</Link>}</article>)}</div></section>
      <section className="notice"><strong>Production status</strong><p>This application is still in development. CRM interface is connected to protected Worker APIs when configured with a Worker URL and admin token. Other modules are not yet implemented; do not treat this branch as a live production ERP.</p></section>
      <footer>© DPM Enterprise Private Limited · Enterprise OS</footer>
    </main>
  );
}
