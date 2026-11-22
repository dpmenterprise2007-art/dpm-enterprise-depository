"use client";
import Link from "next/link";
import { useCallback,useEffect,useMemo,useState } from "react";
type Organization={id:string;legal_name:string;gstin?:string|null};
type Lead={id:string;organization_id:string;company_name:string;contact_name?:string|null;email?:string|null;phone?:string|null;source?:string|null;stage:string;next_followup_at?:string|null;notes?:string|null;created_at?:string;updated_at?:string};
type Activity={id:string;event_type:string;metadata_json?:string;created_at?:string};
const stages=["new","contacted","qualified","proposal","negotiation","won","lost"];
const empty={company_name:"",contact_name:"",email:"",phone:"",source:"Website",stage:"new",next_followup_at:"",notes:""};
export default function CrmClient(){
 const [api,setApi]=useState("https://dpm-enterprise-os.dpmenterprise2007.workers.dev"),[token,setToken]=useState("");
 const [orgs,setOrgs]=useState<Organization[]>([]),[orgId,setOrgId]=useState(""),[leads,setLeads]=useState<Lead[]>([]);
 const [form,setForm]=useState(empty),[editing,setEditing]=useState<Lead|null>(null),[newOrg,setNewOrg]=useState("");
 const [search,setSearch]=useState(""),[stageFilter,setStageFilter]=useState(""),[sourceFilter,setSourceFilter]=useState("");
 const [activityLead,setActivityLead]=useState<Lead|null>(null),[activities,setActivities]=useState<Activity[]>([]);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState(""),[connected,setConnected]=useState(false);
 const base=useMemo(()=>api.trim().replace(/\/$/,""),[api]);
 const request=useCallback(async(path:string,method="GET",body?:unknown)=>{
  const res=await fetch(base+path,{method,headers:{authorization:"Bearer "+token,...(body?{"content-type":"application/json"}:{})},body:body?JSON.stringify(body):undefined});
  const data=await res.json().catch(()=>({error:"Non-JSON response"}));if(!res.ok)throw new Error(data.error||"Request failed ("+res.status+")");return data;
 },[base,token]);
 const load=useCallback(async()=>{
  if(!base||!token)return;setBusy(true);setError("");try{
   const od=await request("/api/admin/crm/organizations");const list:Organization[]=od.items||[];setOrgs(list);setConnected(true);
   const selected=orgId&&list.some(o=>o.id===orgId)?orgId:list[0]?.id||"";setOrgId(selected);
   if(selected){const query=new URLSearchParams({organization_id:selected,limit:"100"});if(search.trim())query.set("search",search.trim());if(stageFilter)query.set("stage",stageFilter);if(sourceFilter)query.set("source",sourceFilter);
    const ld=await request("/api/admin/crm/leads?"+query.toString());setLeads(ld.items||[]);}else setLeads([]);
  }catch(e){setConnected(false);setError(e instanceof Error?e.message:"CRM connection failed");}finally{setBusy(false);}
 },[base,token,orgId,search,stageFilter,sourceFilter,request]);
 useEffect(()=>{setConnected(false)},[base,token]);
 const createOrg=async()=>{if(!newOrg.trim())return;setBusy(true);try{await request("/api/admin/crm/organizations","POST",{legal_name:newOrg.trim()});setNewOrg("");setMessage("Organization created");await load();}catch(e){setError(e instanceof Error?e.message:"Organization creation failed");}finally{setBusy(false)}};
 const resetForm=()=>{setForm(empty);setEditing(null)};
 const saveLead=async(e:React.FormEvent)=>{e.preventDefault();if(!orgId||!form.company_name.trim())return;setBusy(true);setError("");setMessage("");
  try{const body={organization_id:orgId,...form,next_followup_at:form.next_followup_at?new Date(form.next_followup_at).toISOString():null};
   if(editing){await request("/api/admin/crm/leads/"+encodeURIComponent(editing.id),"PATCH",body);setMessage("Lead updated successfully");}
   else{await request("/api/admin/crm/leads","POST",body);setMessage("Lead created successfully");}
   resetForm();await load();
  }catch(e){setError(e instanceof Error?e.message:"Save failed");}finally{setBusy(false)}
 };
 const editLead=(l:Lead)=>{setEditing(l);setForm({company_name:l.company_name||"",contact_name:l.contact_name||"",email:l.email||"",phone:l.phone||"",source:l.source||"Website",stage:l.stage||"new",next_followup_at:l.next_followup_at?new Date(l.next_followup_at).toISOString().slice(0,16):"",notes:l.notes||""});};
 const showActivity=async(l:Lead)=>{setActivityLead(l);setActivities([]);try{const d=await request("/api/admin/crm/leads/"+encodeURIComponent(l.id)+"/activity");setActivities(d.items||[]);}catch(e){setError(e instanceof Error?e.message:"Activity load failed");}};
 const counts=Object.fromEntries(stages.map(s=>[s,leads.filter(l=>l.stage===s).length]));
 const sources=[...new Set(leads.map(l=>l.source).filter(Boolean))] as string[];
 return <main className="crm-shell">
 <header className="crm-header"><Link className="crm-back" href="/">← DPM Enterprise OS</Link><div><span className="crm-eyebrow">CUSTOMER OPERATIONS</span><h1>CRM & Sales</h1><p>Leads database, pipeline, follow-ups and activity history.</p></div><span className={connected?"crm-badge live":"crm-badge"}>{connected?"API connected":"Not connected"}</span></header>
 <section className="crm-connection"><h2>Secure API connection</h2><p>Admin token remains in this page's memory only. Connect to load your organization and lead records.</p><div className="crm-connect-grid"><label>API base URL<input value={api} onChange={e=>setApi(e.target.value)} autoComplete="url"/></label><label>Admin bearer token<input value={token} onChange={e=>setToken(e.target.value)} type="password" autoComplete="off" placeholder="ADMIN_TOKEN"/></label><button disabled={busy||!api||!token} onClick={load}>{busy?"Working…":"Connect / Refresh"}</button></div></section>
 {error&&<div className="crm-alert error">{error}</div>}{message&&<div className="crm-alert">{message}</div>}
 {connected&&<><section className="crm-metrics">{stages.map(s=><article key={s}><span>{s}</span><strong>{counts[s]||0}</strong></article>)}</section>
 <section className="crm-organization"><label>Organization<select value={orgId} onChange={e=>{setOrgId(e.target.value);setTimeout(load,0)}}><option value="">Select organization</option>{orgs.map(o=><option key={o.id} value={o.id}>{o.legal_name}</option>)}</select></label>{!orgs.length&&<div className="crm-create-org"><input value={newOrg} onChange={e=>setNewOrg(e.target.value)} placeholder="Legal organization name"/><button disabled={busy||!newOrg.trim()} onClick={createOrg}>Create organization</button></div>}</section>
 <section className="crm-workspace"><form className="crm-form" onSubmit={saveLead}><h2>{editing?"Edit lead":"New lead"}</h2><label>Company / client name<input required value={form.company_name} onChange={e=>setForm({...form,company_name:e.target.value})}/></label><label>Contact person<input value={form.contact_name} onChange={e=>setForm({...form,contact_name:e.target.value})}/></label><label>Email<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Phone<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label>Lead source<input value={form.source} onChange={e=>setForm({...form,source:e.target.value})}/></label><label>Pipeline stage<select value={form.stage} onChange={e=>setForm({...form,stage:e.target.value})}>{stages.map(s=><option key={s}>{s}</option>)}</select></label><label>Next follow-up<input type="datetime-local" value={form.next_followup_at} onChange={e=>setForm({...form,next_followup_at:e.target.value})}/></label><label>Notes<textarea rows={4} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label><button type="submit" disabled={busy||!form.company_name.trim()}>{busy?"Saving…":editing?"Update lead":"Create lead"}</button>{editing&&<button type="button" className="crm-secondary" onClick={resetForm}>Cancel edit</button>}</form>
 <section className="crm-lead-list"><div className="crm-list-title"><h2>Leads database</h2><button onClick={load} disabled={busy}>Refresh</button></div><div className="crm-filters"><input placeholder="Search company, contact, email or phone…" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&load()}/><select value={stageFilter} onChange={e=>setStageFilter(e.target.value)}><option value="">All stages</option>{stages.map(s=><option key={s}>{s}</option>)}</select><select value={sourceFilter} onChange={e=>setSourceFilter(e.target.value)}><option value="">All sources</option>{sources.map(s=><option key={s}>{s}</option>)}</select><button onClick={load} disabled={busy}>Apply</button></div>
 {leads.length===0?<div className="crm-empty">No matching leads. Try removing filters or create a lead.</div>:leads.map(l=><article className="crm-lead" key={l.id}><div className="crm-lead-info"><strong>{l.company_name}</strong><small>{l.contact_name||"No contact"} · {l.email||l.phone||"No contact details"}</small><small>{l.source||"Unknown source"} · {l.next_followup_at?"Follow-up "+new Date(l.next_followup_at).toLocaleString():"No follow-up scheduled"}</small>{l.notes&&<p>{l.notes}</p>}</div><div className="crm-lead-actions"><label>Stage<select value={l.stage} onChange={async e=>{const newStage=e.target.value;try{await request("/api/admin/crm/leads/"+encodeURIComponent(l.id),"PATCH",{stage:newStage});setMessage("Stage updated");await load();}catch(err){setError(err instanceof Error?err.message:"Stage update failed");}}}>{stages.map(s=><option key={s}>{s}</option>)}</select></label><button type="button" onClick={()=>editLead(l)}>Edit</button><button type="button" className="crm-secondary" onClick={()=>showActivity(l)}>History</button></div></article>)}</section></section>
 {activityLead&&<section className="crm-activity"><div className="crm-list-title"><h2>Activity history · {activityLead.company_name}</h2><button onClick={()=>setActivityLead(null)}>Close</button></div>{activities.length?activities.map(a=><article className="crm-activity-item" key={a.id}><strong>{a.event_type.replaceAll("_"," ")}</strong><time>{a.created_at?new Date(a.created_at).toLocaleString():""}</time><p>{a.metadata_json||""}</p></article>):<div className="crm-empty">No activity records found.</div>}</section>}
 </>}
 <footer className="crm-footer">CRM · Protected Worker API · Search, filters, editing and activity history</footer></main>;
}
