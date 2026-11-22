"use client";
import Link from "next/link";

import { useCallback, useEffect, useMemo, useState } from "react";

type Organization = { id: string; legal_name: string; gstin?: string | null };
type Lead = { id: string; company_name: string; contact_name?: string | null; email?: string | null; phone?: string | null; source?: string | null; stage: string; next_followup_at?: string | null; notes?: string | null; created_at?: string };
const stages = ["new","contacted","qualified","proposal","negotiation","won","lost"];

export default function CrmClient() {
  const [api, setApi] = useState("");
  const [token, setToken] = useState("");
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [orgId, setOrgId] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("Website");
  const [stage, setStage] = useState("new");
  const [followup, setFollowup] = useState("");
  const [notes, setNotes] = useState("");
  const [newOrg, setNewOrg] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);

  const base = useMemo(() => api.trim().replace(/\/$/,""),[api]);
  const request = useCallback(async (path: string, method = "GET", body?: unknown) => {
    const res = await fetch(base + path, { method, headers: { authorization: "Bearer " + token, ...(body ? {"content-type":"application/json"} : {}) }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(()=>({error:"Non-JSON API response"}));
    if (!res.ok) throw new Error(data.error || "Request failed ("+res.status+")");
    return data;
  },[base,token]);

  const load = useCallback(async () => {
    if (!base || !token) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const orgData = await request("/api/admin/crm/organizations");
      const items: Organization[] = orgData.items || [];
      setOrgs(items);
      setConnected(true);
      const selected = orgId && items.some(o=>o.id===orgId) ? orgId : items[0]?.id || "";
      setOrgId(selected);
      if(selected) {
        const leadData = await request("/api/admin/crm/leads?organization_id="+encodeURIComponent(selected));
        setLeads(leadData.items || []);
      } else setLeads([]);
      if(!items.length) setMessage("API connected. Create your organization to start using CRM.");
    } catch(e) { setConnected(false); setError(e instanceof Error ? e.message : "Connection failed"); }
    finally { setBusy(false); }
  },[base,token,orgId,request]);

  useEffect(()=>{ setConnected(false); },[base,token]);
  const createOrganization = async () => {
    if(!newOrg.trim()) return;
    setBusy(true); setError(""); setMessage("");
    try { const data=await request("/api/admin/crm/organizations","POST",{legal_name:newOrg.trim()}); setNewOrg(""); setMessage("Organization created. Refreshing CRM."); await load(); }
    catch(e){setError(e instanceof Error?e.message:"Could not create organization");}
    finally{setBusy(false);}
  };
  const addLead = async (e: React.FormEvent) => {
    e.preventDefault(); if(!orgId||!company.trim()) return;
    setBusy(true);setError("");setMessage("");
    try {
      await request("/api/admin/crm/leads","POST",{organization_id:orgId,company_name:company,contact_name:contact,email,phone,source,stage,next_followup_at:followup?new Date(followup).toISOString():null,notes});
      setCompany("");setContact("");setEmail("");setPhone("");setFollowup("");setNotes("");
      setMessage("Lead saved to CRM."); await load();
    } catch(e){setError(e instanceof Error?e.message:"Lead creation failed");}
    finally{setBusy(false);}
  };
  const changeStage = async (lead: Lead, next: string) => {
    setError("");setMessage("");
    try { await request("/api/admin/crm/leads/"+encodeURIComponent(lead.id),"PATCH",{stage:next});setLeads(old=>old.map(x=>x.id===lead.id?{...x,stage:next}:x)); }
    catch(e){setError(e instanceof Error?e.message:"Stage update failed");}
  };
  const countByStage=(s:string)=>leads.filter(l=>l.stage===s).length;
  return <main className="crm-shell">
    <header className="crm-header"><Link className="crm-back" href="/">← DPM Enterprise OS</Link><div><span className="crm-eyebrow">CUSTOMER OPERATIONS</span><h1>CRM & Sales</h1><p>Lead records, pipeline stages and follow-up management.</p></div><span className={connected?"crm-badge live":"crm-badge"}>{connected?"API connected":"Not connected"}</span></header>
    <section className="crm-connection"><h2>Secure API connection</h2><p>Enter your Cloudflare Worker URL and admin bearer token. The token is kept only in this page&apos;s memory and is not saved to browser storage.</p><div className="crm-connect-grid"><label>API base URL<input value={api} onChange={e=>setApi(e.target.value)} placeholder="https://your-worker.workers.dev" autoComplete="url"/></label><label>Admin token<input value={token} onChange={e=>setToken(e.target.value)} placeholder="ADMIN_TOKEN" type="password" autoComplete="off"/></label><button disabled={busy||!api||!token} onClick={load}>{busy?"Connecting…":"Connect & load"}</button></div></section>
    {error&&<div className="crm-alert error">{error}</div>}{message&&<div className="crm-alert">{message}</div>}
    {connected&&<><section className="crm-metrics">{["new","contacted","qualified","proposal","negotiation","won","lost"].map(s=><article key={s}><span>{s.replace("_"," ")}</span><strong>{countByStage(s)}</strong></article>)}</section>
    <section className="crm-organization"><label>Organization<select value={orgId} onChange={async e=>{const id=e.target.value;setOrgId(id);if(id){try{const d=await request("/api/admin/crm/leads?organization_id="+encodeURIComponent(id));setLeads(d.items||[]);}catch(err){setError(err instanceof Error?err.message:"Load failed");}}}}><option value="">Select organization</option>{orgs.map(o=><option key={o.id} value={o.id}>{o.legal_name}</option>)}</select></label>{orgs.length===0&&<div className="crm-create-org"><input value={newOrg} onChange={e=>setNewOrg(e.target.value)} placeholder="Legal organization name"/><button disabled={busy||!newOrg.trim()} onClick={createOrganization}>Create organization</button></div>}</section>
    {orgId&&<section className="crm-workspace"><form className="crm-form" onSubmit={addLead}><h2>New lead</h2><label>Company / client name<input required value={company} onChange={e=>setCompany(e.target.value)} /></label><label>Contact person<input value={contact} onChange={e=>setContact(e.target.value)} /></label><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Phone<input value={phone} onChange={e=>setPhone(e.target.value)}/></label><label>Source<input value={source} onChange={e=>setSource(e.target.value)}/></label><label>Stage<select value={stage} onChange={e=>setStage(e.target.value)}>{stages.map(s=><option key={s}>{s}</option>)}</select></label><label>Next follow-up<input type="datetime-local" value={followup} onChange={e=>setFollowup(e.target.value)}/></label><label>Notes<textarea rows={4} value={notes} onChange={e=>setNotes(e.target.value)}/></label><button type="submit" disabled={busy||!company.trim()}>{busy?"Saving…":"Save lead"}</button></form>
    <section className="crm-lead-list"><div className="crm-list-title"><h2>Lead records</h2><button onClick={load} disabled={busy}>Refresh</button></div>{leads.length===0?<div className="crm-empty">No leads in this organization yet.</div>:leads.map(l=><article className="crm-lead" key={l.id}><div className="crm-lead-info"><strong>{l.company_name}</strong><small>{l.contact_name||"No contact"} · {l.email||l.phone||"No contact details"}</small><small>{l.source||"Unknown source"}{l.next_followup_at?" · Follow-up "+new Date(l.next_followup_at).toLocaleString():""}</small>{l.notes&&<p>{l.notes}</p>}</div><label>Stage<select value={l.stage} onChange={e=>changeStage(l,e.target.value)}>{stages.map(s=><option key={s}>{s}</option>)}</select></label></article>)}</section></section>}</>}
    <footer className="crm-footer">CRM module · Uses protected Worker endpoints · No token persistence</footer>
  </main>;
}
