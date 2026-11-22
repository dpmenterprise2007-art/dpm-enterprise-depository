'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type PlatformStatus = { ok?: boolean; features?: Array<{ name?: string; status?: string; description?: string }> };
const worker = 'https://dpm-enterprise-os.dpmenterprise2007.workers.dev';
const modules = [
  { name: 'CRM & Sales', desc: 'Leads, organizations, sales pipeline and follow-ups.', href: '/crm', icon: '◉', state: 'API foundation' },
  { name: 'BOQ & Quotations', desc: 'Itemized BOQ, quantities, rates, GST and quotation drafts.', href: '/quotations', icon: '▤', state: 'API foundation' },
  { name: 'Projects & Execution', desc: 'Project register, site, client, budget, dates and status.', href: '/projects', icon: '⌂', state: 'API foundation' },
  { name: 'AI Workbench', desc: 'AI-assisted business analysis and operational tasks.', href: '/ai', icon: '✳', state: 'Available' },
  { name: 'Tender Control Room', desc: 'Tender workspace and procurement opportunity links.', href: '/tender-control-room.html', icon: '⌕', state: 'Separate workspace' },
  { name: 'Social Media Studio', desc: 'Social content planning and campaign workspace.', href: '/social-studio.html', icon: '▣', state: 'Separate workspace' },
  { name: 'Buyer & Market Research', desc: 'Verified buyers, prospect research and lead discovery.', href: '#modules', icon: '⌖', state: 'Planned' },
  { name: 'Procurement & Inventory', desc: 'Vendor RFQs, purchase orders, stock and manufacturing.', href: '#modules', icon: '▥', state: 'Planned' },
  { name: 'Finance & Compliance', desc: 'Invoices, GST, receivables, payables and filings.', href: '#modules', icon: '₹', state: 'Planned' },
  { name: 'HR & Workforce', desc: 'Staff records, attendance, assignments and workforce planning.', href: '#modules', icon: '♙', state: 'Planned' },
  { name: 'Customer Support', desc: 'Customer requests, warranty and service follow-up.', href: '#modules', icon: '✉', state: 'Planned' },
  { name: 'AI Automation', desc: 'Task queues, agents, approvals and execution audit logs.', href: '#modules', icon: '⟳', state: 'Foundation' },
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
  return (
    <main className="erp">
      <aside className="erp-sidebar">
        <div className="erp-brand"><div className="erp-mark">D</div><div><b>DPM ENTERPRISE</b><small>Business OS</small></div></div>
        <div className="erp-nav-label">WORKSPACE</div>
        <a className="erp-nav active" href="#overview">▦ &nbsp;Overview</a>
        <a className="erp-nav" href="#modules">◈ &nbsp;All modules</a>
        <div className="erp-nav-label">BUSINESS</div>
        <Link className="erp-nav" href="/crm">◉ &nbsp;CRM & Sales</Link>
        <Link className="erp-nav" href="/quotations">▤ &nbsp;BOQ & Quotations</Link>
        <Link className="erp-nav" href="/projects">⌂ &nbsp;Projects</Link>
        <Link className="erp-nav" href="/ai">✳ &nbsp;AI Workbench</Link>
        <a className="erp-nav" href="/tender-control-room.html">⌕ &nbsp;Tender Room</a>
        <a className="erp-nav" href="/social-studio.html">▣ &nbsp;Social Studio</a>
        <div className="erp-sidebar-bottom"><div className="erp-status"><span className={online ? 'green' : health==='offline' ? 'red' : 'amber'} />API {health==='checking'?'checking':online?'connected':'offline'}</div><small>Enterprise workspace · v1</small></div>
      </aside>
      <section className="erp-main" id="overview">
        <header className="erp-header"><div><p className="erp-overline">DPM ENTERPRISE PRIVATE LIMITED</p><h1>Business overview</h1><p className="erp-subtitle">Your company workspace — operational modules, live platform status and quick access.</p></div><a className="erp-header-link" href="https://www.dpmenterprise.in" target="_blank" rel="noreferrer">Company website ↗</a></header>
        <section className="erp-kpis">
          <article className="erp-kpi"><small>Platform API</small><strong className={online?'kpi-green':'kpi-muted'}>{health==='checking'?'Checking…':online?'Online':'Offline'}</strong><span>Live health endpoint</span></article>
          <article className="erp-kpi"><small>Core modules</small><strong>4</strong><span>Connected UI foundations</span></article>
          <article className="erp-kpi"><small>Module directory</small><strong>{modules.length}</strong><span>Workspace modules mapped</span></article>
          <article className="erp-kpi"><small>Last check</small><strong className="kpi-time">{checkedAt||'—'}</strong><span>Auto-refresh · 60 seconds</span></article>
        </section>
        <section className="erp-section" id="modules"><div className="erp-section-title"><div><p className="erp-overline">WORKSPACE</p><h2>Modules & work areas</h2></div><span className="erp-muted">Select a module to open</span></div>
          <div className="erp-module-grid">{modules.map(m=><article className="erp-module" key={m.name}><div className="erp-module-top"><span className="erp-module-icon">{m.icon}</span><span className={'erp-tag '+(m.state==='Available'?'tag-live':m.state==='Planned'?'tag-plan':'tag-foundation')}>{m.state}</span></div><h3>{m.name}</h3><p>{m.desc}</p><a href={m.href} className="erp-module-open">{m.state==='Planned'?'View roadmap':'Open workspace'} ↗</a></article>)}</div>
        </section>
        <section className="erp-bottom-grid"><article className="erp-panel"><p className="erp-overline">SYSTEM</p><h2>Live API status</h2><p>Worker health and public platform status are checked automatically.</p><a href={worker+'/api/health'} target="_blank" rel="noreferrer">Open health endpoint ↗</a><a href={worker+'/api/public/platform-status'} target="_blank" rel="noreferrer">Open feature status ↗</a></article><article className="erp-panel"><p className="erp-overline">NEXT BUILD</p><h2>ERP implementation queue</h2><ul><li>Dashboard and module navigation</li><li>Authenticated CRM data views</li><li>BOQ line-item editor and quotation register</li><li>Project execution and task tracking</li><li>Procurement, inventory and finance workflows</li></ul></article></section>
        <footer className="erp-footer">DPM Enterprise OS · Build & deploy status is not a substitute for production data verification.</footer>
      </section>
    </main>
  );
}
