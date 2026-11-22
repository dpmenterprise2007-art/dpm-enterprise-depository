const modules = [
  ['CRM & Sales', 'Leads, pipeline, follow-ups and customer records', 'Foundation'],
  ['Research & Buyer Intel', 'Evidence-backed opportunities and buyer verification', 'Planned'],
  ['BOQ & Quotations', 'Rate library, estimates, quotations and tender workflow', 'Planned'],
  ['Projects & Execution', 'Site visits, tasks, milestones and delivery control', 'Planned'],
  ['Procurement & Inventory', 'Vendors, purchasing, stock and manufacturing', 'Planned'],
  ['Finance & Compliance', 'Invoices, GST, receivables and compliance calendar', 'Planned'],
  ['Marketing & Website', 'SEO, enquiries, content and publishing workflows', 'Planned'],
  ['AI Automation', 'Agent tasks, approvals, logs and pause controls', 'Planned'],
];

export default function Home() {
  return (
    <main className="shell">
      <header className="topbar"><div className="brand"><span className="mark">D</span><div><strong>DPM ENTERPRISE</strong><small>Business Operating Platform</small></div></div><span className="pill">Repository foundation</span></header>
      <section className="hero"><p className="eyebrow">DPM ENTERPRISE PRIVATE LIMITED</p><h1>One workspace.<br/><span>Every operation connected.</span></h1><p className="intro">A secure foundation for sales, projects, procurement, finance, compliance and AI-assisted operations.</p><div className="hero-actions"><a href="https://dpmenterprise.in" target="_blank" rel="noreferrer">Company website ↗</a><span className="status"><i/> Foundation scaffold</span></div></section>
      <section className="section"><div className="section-head"><div><p className="eyebrow">WORKSPACE MAP</p><h2>Platform modules</h2></div><span className="muted">Build status is shown honestly</span></div><div className="grid">{modules.map(([name,desc,status])=><article className="module" key={name}><div className="module-top"><span className="dot"/><span className="module-status">{status}</span></div><h3>{name}</h3><p>{desc}</p></article>)}</div></section>
      <section className="notice"><strong>Build status</strong><p>This is the initial application shell. Authentication, database, integrations, AI agents and operational workflows are not yet connected. Modules will only be marked live after implementation and testing.</p></section>
      <footer>© DPM Enterprise Private Limited · Secure-by-design platform foundation</footer>
    </main>
  );
}
