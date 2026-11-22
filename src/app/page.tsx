'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type PlatformStatus = { ok?: boolean; features?: Array<{ name?: string; status?: string; description?: string }> };
const worker = 'https://dpm-enterprise-os.dpmenterprise2007.workers.dev';
const modules = [
  { name: 'CRM & Sales', desc: 'Leads, organizations, sales pipeline and follow-ups.', href: '/crm', icon: '◉', state: 'Foundation' },
  { name: 'BOQ & Quotations', desc: 'Itemized BOQ, quantities, rates, GST and quotation drafts.', href: '/quotations', icon: '▤', state: 'Foundation' },
  { name: 'Projects & Execution', desc: 'Project register, site, client, budget, dates and status.', href: '/projects', icon: '⌂', state: 'Foundation' },
  { name: 'AI Workbench', desc: 'AI-assisted business analysis and operational tasks.', href: '/ai', icon: '✳', state: 'Available' },
  { name: 'Tender Control Room', desc: 'Tender workspace and procurement opportunity links.', href: '/tender-control-room.html', icon: '⌕', state: 'Workspace' },
  { name: 'Social Media Studio', desc: 'Social content planning and campaign workspace.', href: '/social-studio.html', icon: '▣', state: 'Workspace' },
  { name: 'Lead Hunting AI', desc: 'Prospect discovery, qualification and sales research.', href: '#roadmap', icon: '⌖', state: 'Build queue' },
  { name: 'Buyer–Seller Marketplace', desc: 'Buyer enquiries, seller profiles, catalog and RFQs.', href: '#roadmap', icon: '◇', state: 'Build queue' },
  { name: 'Procurement & Inventory', desc: 'Vendor RFQs, purchase orders, stock and manufacturing.', href: '#roadmap', icon: '▥', state: 'Build queue' },
  { name: 'Finance & Compliance', desc: 'Invoices, GST, receivables, payables and filings.', href: '#roadmap', icon: '₹', state: 'Build queue' },
  { name: 'HR & Workforce', desc: 'Staff records, attendance, assignments and workforce planning.', href: '#roadmap', icon: '♙', state: 'Build queue' },
  { name: 'AI Automation Center', desc: 'Agents, workflows, schedules, approvals and audit trails.', href: '#roadmap', icon: '⟳', state: 'Foundation' },
];
export default function Home() {
  const [health, setHealth] = useState<'checking'|'online'|'offline'>('checking');
  const [status, setStatus] = useState<PlatformStatus | null>(null);
  const [checkedAt, setCheckedAt] = useState('');
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const [h, s] = await Promise.all([
          fetch(worker + '/api/health', { cache: 'no-store' }),
          fetch(worker + '/api/public/platform-status', { cache: 'no-store' }),
        ]);
        if (!active) return;
        setHealth(h.ok ? 'online' : 'offline');
        if (s.ok) setStatus(await s.json());
        setCheckedAt(new Date().toLocaleTimeString());
      } catch {
        if (active) { setHealth('offline'); setCheckedAt(new Date().toLocaleTimeString()); }
      }
    };
    refresh();
    const timer = window.setInterval(refresh, 60000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  const online = health === 'online';
  const liveFeatures = status?.features?.filter(f => f.status === 'available').length ?? 0;
  return (
    <main className="erp">
      <aside className="erp-sidebar">
        <div className="erp-brand"><div className="erp-mark">D</div><div><b>DPM ENTERPRISE</b><small>Enterprise workspace</small></div></div>
        <div className="erp-nav-label">OVERVIEW</div>
        <a className="erp-nav active" href="#overview">▦ &nbsp;Dashboard</a>
        <a className="erp-nav" href="#modules">◈ &nbsp;Module directory</a>
        <div className="erp-nav-label">OPERATIONS</div>
        <Link className="erp-nav" href="/crm">◉ &nbsp;CRM & Sales</Link>
        <Link className="erp-nav" href="/quotations">▤ &nbsp;BOQ & Quotations</Link>
        <Link className="erp-nav" href="/projects">⌂ &nbsp;Projects</Link>
        <Link className="erp-nav" href="/ai">✳ &nbsp;AI Workbench</Link>
        <a className="erp-nav" href="/tender-control-room.html">⌕ &nbsp;Tender Room</a>
        <a className="erp-nav" href="/social-studio.html">▣ &nbsp;Social Studio</a>
        <div className="erp-sidebar-bottom"><div className="erp-status"><span className={online ? 'green' : health==='offline' ? 'red' : 'amber'} />API {health==='checking'?'checking':online?'connected':'offline'}</div><small>Cloud workspace · API health polling</small></div>
      </aside>
      <section className="erp-main" id="overview">
        <header className="erp-header"><div><p className="erp-overline">DPM ENTERPRISE PRIVATE LIMITED · WORKSPACE</p><h1>Business command centre</h1><p className="erp-subtitle">Your operating workspace for sales, projects, estimates and automation.</p></div><a className="erp-header-link" href="https://www.dpmenterprise.in" target="_blank" rel="noreferrer">Visit company website ↗</a></header>
        <section className="erp-kpis">
          <article className="erp-kpi"><small>Platform API</small><strong className={online?'kpi-green':'kpi-muted'}>{health==='checking'?'Checking…':online?'Online':'Offline'}</strong><span>Live health endpoint</span></article>
          <article className="erp-kpi"><small>Available feature flags</small><strong>{status ? liveFeatures : '—'}</strong><span>Reported by API status endpoint</span></article>
          <article className="erp-kpi"><small>Workspace directory</small><strong>{modules.length}</strong><span>Modules mapped · statuses are explicit</span></article>
          <article className="erp-kpi"><small>Last health check</small><strong className="kpi-time">{checkedAt||'—'}</strong><span>Refresh interval · 60 seconds</span></article>
        </section>
        <section className="erp-section" id="modules"><div className="erp-section-title"><div><p className="erp-overline">YOUR WORKSPACE</p><h2>Business modules</h2></div><span className="erp-muted">Status reflects current implementation stage</span></div>
          <div className="erp-module-grid">{modules.map(m=><article className="erp-module" key={m.name}><div className="erp-module-top"><span className="erp-module-icon">{m.icon}</span><span className={'erp-tag '+(m.state==='Available'?'tag-live':m.state==='Build queue'?'tag-plan':'tag-foundation')}>{m.state}</span></div><h3>{m.name}</h3><p>{m.desc}</p><a href={m.href} className="erp-module-open">{m.state==='Build queue'?'Build status':'Open workspace'} ↗</a></article>)}</div>
        </section>
        <section className="erp-bottom-grid"><article className="erp-panel"><p className="erp-overline">SYSTEM CONNECTION</p><h2>Cloud API</h2><p>Live health and public feature status are read from the deployed worker. No sample operational metrics are presented as real data.</p><a href={worker+'/api/health'} target="_blank" rel="noreferrer">Health endpoint ↗</a><a href={worker+'/api/public/platform-status'} target="_blank" rel="noreferrer">Feature status ↗</a></article><article className="erp-panel" id="roadmap"><p className="erp-overline">BUILD PRIORITIES</p><h2>Website → ERP → Autonomous workflows</h2><ul><li>Finish public website and enquiry backend</li><li>Upgrade dashboard with connected records and action shortcuts</li><li>Build lead discovery and AI-assisted qualification</li><li>Expand ERP modules with real database workflows</li><li>Mobile-first PWA and automation control centre</li></ul></article></section>
        <footer className="erp-footer">DPM Enterprise OS · Platform status is live; individual modules are under implementation.</footer>
      </section>
    </main>
  );
}
