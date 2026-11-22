/// <reference types="@cloudflare/workers-types" />
export interface Env {
  DB: D1Database;
  DOCS: R2Bucket;
  APP_NAME: string;
  APP_ENV: string;
  ADMIN_TOKEN?: string;
}

const headers = { "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff", "cache-control": "no-store" };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });
const cors = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "content-type" };
const corsJson = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...headers, ...cors } });
const adminOk = (request: Request, env: Env) => !!env.ADMIN_TOKEN && request.headers.get("authorization") === `Bearer ${env.ADMIN_TOKEN}`;
const adminJson = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...headers, ...cors } });
const clean = (v: unknown, max = 500) => typeof v === "string" ? v.trim().slice(0,max) : "";
const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const uid = () => crypto.randomUUID();
async function parseBody(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length > 20000) throw new Error("Request body too large");
  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Expected JSON object");
  return parsed as Record<string,unknown>;
}
async function saveRegistration(env: Env, table: "marketplace_seller_applications" | "marketplace_vendor_applications", body: Record<string,unknown>, typeKey: "business_type" | "vendor_type") {
  const name=clean(body.business_name,160), contact=clean(body.contact_name,120), email=clean(body.email,180).toLowerCase(), phone=clean(body.phone,30), kind=clean(body[typeKey],80), gst=clean(body.gstin,20);
  if (!name || !contact || !validEmail(email) || !phone || !kind) return json({error:"Business name, contact, valid email, phone and type are required"},400);
  const id=uid();
  const sql=table==="marketplace_seller_applications"
    ? "INSERT INTO marketplace_seller_applications (id,business_name,contact_name,email,phone,business_type,gstin,status) VALUES (?,?,?,?,?,?,?,'pending')"
    : "INSERT INTO marketplace_vendor_applications (id,business_name,contact_name,email,phone,vendor_type,gstin,status) VALUES (?,?,?,?,?,?,?,'pending')";
  await env.DB.prepare(sql).bind(id,name,contact,email,phone,kind,gst).run();
  return json({ok:true,application_id:id,status:"pending_review",message:"Application received; activation requires verification."},201);
}
type TaskResult = Record<string,unknown>;
async function executeSafeTask(env: Env, task: {id:string;task_type:string;payload_json:string;agent_id:string|null}): Promise<TaskResult> {
  if(task.agent_id) {
    const agent=await env.DB.prepare("SELECT status FROM automation_agents WHERE id=?").bind(task.agent_id).first<{status:string}>();
    if(!agent||agent.status!=="active") throw new Error("Assigned agent must be active before task execution");
  }
  const payload=JSON.parse(task.payload_json||"{}") as Record<string,unknown>;
  if(task.task_type==="health_check") {
    const db=await env.DB.prepare("SELECT 1 AS ok").first<{ok:number}>();
    return {type:"health_check",database:db?.ok===1,checked_at:new Date().toISOString()};
  }
  if(task.task_type==="crm_followup_scan") {
    const organizationId=clean(payload.organization_id,80);
    if(!organizationId) throw new Error("organization_id is required for crm_followup_scan");
    const now=new Date().toISOString();
    const rows=await env.DB.prepare("SELECT id,company_name,contact_name,email,phone,stage,next_followup_at FROM leads WHERE organization_id=? AND next_followup_at IS NOT NULL AND next_followup_at<=? AND stage NOT IN ('won','lost') ORDER BY next_followup_at ASC LIMIT 100").bind(organizationId,now).all();
    return {type:"crm_followup_scan",organization_id:organizationId,due_count:rows.results.length,items:rows.results,generated_at:now,note:"Read-only scan. No email, SMS, WhatsApp, or call was sent."};
  }
  throw new Error("Task type is not allow-listed for execution");
}
async function runAutomationBatch(env: Env, maxTasks=5): Promise<{processed:number;completed:number;failed:number}> {
  let processed=0,completed=0,failed=0;
  for(let i=0;i<maxTasks;i++) {
    const task=await env.DB.prepare("SELECT id,task_type,payload_json,agent_id,attempts,max_attempts FROM automation_tasks WHERE status='queued' AND (scheduled_at IS NULL OR scheduled_at<=CURRENT_TIMESTAMP) ORDER BY created_at ASC LIMIT 1").first<{id:string;task_type:string;payload_json:string;agent_id:string|null;attempts:number;max_attempts:number}>();
    if(!task) break;
    const claim=await env.DB.prepare("UPDATE automation_tasks SET status='running',started_at=CURRENT_TIMESTAMP,attempts=attempts+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='queued'").bind(task.id).run();
    if(!claim.meta.changes) continue;
    processed++;
    try {
      const output=await executeSafeTask(env,task);
      await env.DB.prepare("UPDATE automation_tasks SET status='completed',output_json=?,completed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP,last_error=NULL WHERE id=? AND status='running'").bind(JSON.stringify(output),task.id).run();
      await env.DB.prepare("INSERT INTO automation_audit_log(id,actor,action,entity_type,entity_id,details_json) VALUES(?,?,?,?,?,?)").bind(uid(),"system","task_completed","task",task.id,JSON.stringify({task_type:task.task_type,result_type:output.type})).run();
      completed++;
    } catch(e) {
      const message=e instanceof Error?e.message:"Task execution failed";
      const nextStatus=task.attempts+1>=task.max_attempts?"failed":"queued";
      await env.DB.prepare("UPDATE automation_tasks SET status=?,last_error=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='running'").bind(nextStatus,message.slice(0,500),task.id).run();
      await env.DB.prepare("INSERT INTO automation_audit_log(id,actor,action,entity_type,entity_id,details_json) VALUES(?,?,?,?,?,?)").bind(uid(),"system","task_failed","task",task.id,JSON.stringify({task_type:task.task_type,error:message,next_status:nextStatus})).run();
      failed++;
    }
  }
  return {processed,completed,failed};
}
export default {
  async scheduled(_controller: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    await runAutomationBatch(env,5);
  },
  async fetch(request: Request, env: Env): Promise<Response> {
    const url=new URL(request.url);
    if(request.method==="OPTIONS") return new Response(null,{status:204,headers:cors});
    if(url.pathname==="/api/health") return json({ok:true,app:env.APP_NAME,environment:env.APP_ENV,timestamp:new Date().toISOString()});
    if(url.pathname==="/api") return json({name:env.APP_NAME,status:"public-api-foundation",endpoints:["GET /api/health","GET /api/admin/crm/organizations","POST /api/admin/crm/organizations","GET /api/admin/crm/leads","POST /api/admin/crm/leads","PATCH /api/admin/crm/leads/:id","GET /api/marketplace/categories","GET /api/marketplace/products","POST /api/marketplace/seller-register","POST /api/marketplace/vendor-register","POST /api/marketplace/enquiry","POST /api/public/enquiry"]});
    if(url.pathname.startsWith("/api/admin/crm/")) {
      if(!adminOk(request,env)) return adminJson({error:"Unauthorized. Configure ADMIN_TOKEN and provide a bearer token."},401);
      try {
        if(url.pathname==="/api/admin/crm/organizations" && request.method==="GET") {
          const rows=await env.DB.prepare("SELECT id,legal_name,gstin,created_at FROM organizations ORDER BY created_at DESC LIMIT 100").all();
          return adminJson({items:rows.results});
        }
        if(url.pathname==="/api/admin/crm/organizations" && request.method==="POST") {
          const b=await parseBody(request),name=clean(b.legal_name,200),gst=clean(b.gstin,20)||null;
          if(!name)return adminJson({error:"legal_name is required"},400);
          const id=clean(b.id,80)||uid();
          await env.DB.prepare("INSERT INTO organizations(id,legal_name,gstin) VALUES(?,?,?)").bind(id,name,gst).run();
          return adminJson({ok:true,id,legal_name:name},201);
        }
        if(url.pathname==="/api/admin/crm/leads" && request.method==="GET") {
          const org=clean(url.searchParams.get("organization_id"),80),stage=clean(url.searchParams.get("stage"),40),limit=Math.min(Math.max(parseInt(url.searchParams.get("limit")||"50",10)||50,1),100);
          if(!org)return adminJson({error:"organization_id is required"},400);
          let q="SELECT id,organization_id,company_name,contact_name,email,phone,source,stage,next_followup_at,notes,created_at,updated_at FROM leads WHERE organization_id=?";
          const params:(string|number)[]=[org];if(stage){q+=" AND stage=?";params.push(stage);}q+=" ORDER BY created_at DESC LIMIT ?";params.push(limit);
          const rows=await env.DB.prepare(q).bind(...params).all();return adminJson({items:rows.results});
        }
        if(url.pathname==="/api/admin/crm/leads" && request.method==="POST") {
          const b=await parseBody(request),org=clean(b.organization_id,80),company=clean(b.company_name,200),contact=clean(b.contact_name,120),email=clean(b.email,180).toLowerCase(),phone=clean(b.phone,30),source=clean(b.source,100),stage=clean(b.stage,40)||"new",notes=clean(b.notes,4000),follow=clean(b.next_followup_at,40)||null;
          if(!org||!company)return adminJson({error:"organization_id and company_name are required"},400);
          if(email&&!validEmail(email))return adminJson({error:"Invalid email address"},400);
          if(!["new","contacted","qualified","proposal","negotiation","won","lost"].includes(stage))return adminJson({error:"Invalid lead stage"},400);
          const exists=await env.DB.prepare("SELECT id FROM organizations WHERE id=?").bind(org).first();
          if(!exists)return adminJson({error:"Organization not found"},404);
          const id=uid();await env.DB.prepare("INSERT INTO leads(id,organization_id,company_name,contact_name,email,phone,source,stage,next_followup_at,notes) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(id,org,company,contact||null,email||null,phone||null,source||null,stage,follow,notes||null).run();
          await env.DB.prepare("INSERT INTO audit_events(id,organization_id,event_type,entity_type,entity_id,metadata_json) VALUES(?,?,?,?,?,?)").bind(uid(),org,"lead_created","lead",id,JSON.stringify({company_name:company,stage})).run();
          return adminJson({ok:true,id,status:"created"},201);
        }
        const leadMatch=url.pathname.match(/^\/api\/admin\/crm\/leads\/([^/]+)$/);
        if(leadMatch && request.method==="PATCH") {
          const b=await parseBody(request),id=clean(decodeURIComponent(leadMatch[1]),80);
          const current=await env.DB.prepare("SELECT id,organization_id,company_name,contact_name,email,phone,source,stage,next_followup_at,notes FROM leads WHERE id=?").bind(id).first<Record<string,unknown>>();
          if(!current)return adminJson({error:"Lead not found"},404);
          const company=clean(b.company_name,200)||String(current.company_name),contact=clean(b.contact_name,120)||String(current.contact_name||""),email=clean(b.email,180).toLowerCase()||String(current.email||""),phone=clean(b.phone,30)||String(current.phone||""),source=clean(b.source,100)||String(current.source||""),notes=clean(b.notes,4000)||String(current.notes||""),stage=clean(b.stage,40)||String(current.stage),follow=clean(b.next_followup_at,40)||String(current.next_followup_at||"");
          if(email&&!validEmail(email))return adminJson({error:"Invalid email address"},400);
          if(!["new","contacted","qualified","proposal","negotiation","won","lost"].includes(stage))return adminJson({error:"Invalid lead stage"},400);
          await env.DB.prepare("UPDATE leads SET company_name=?,contact_name=?,email=?,phone=?,source=?,stage=?,next_followup_at=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(company,contact||null,email||null,phone||null,source||null,stage,follow||null,notes||null,id).run();
          await env.DB.prepare("INSERT INTO audit_events(id,organization_id,event_type,entity_type,entity_id,metadata_json) VALUES(?,?,?,?,?,?)").bind(uid(),String(current.organization_id),"lead_updated","lead",id,JSON.stringify({stage})).run();
          return adminJson({ok:true,id,status:"updated"});
        }
        return adminJson({error:"Not found"},404);
      }catch(e){
        if(e instanceof SyntaxError)return adminJson({error:"Malformed JSON body"},400);
        return adminJson({error:"CRM request failed. Check migrations and logs."},503);
      }
    }
    if(url.pathname.startsWith("/api/admin/projects") || url.pathname.startsWith("/api/admin/quotations")) {
      if(!adminOk(request,env)) return adminJson({error:"Unauthorized. Configure ADMIN_TOKEN and provide a bearer token."},401);
      try {
        if(url.pathname==="/api/admin/projects" && request.method==="GET") {
          const org=clean(url.searchParams.get("organization_id"),80);
          if(!org)return adminJson({error:"organization_id is required"},400);
          const rows=await env.DB.prepare("SELECT * FROM projects WHERE organization_id=? ORDER BY created_at DESC LIMIT 100").bind(org).all();
          return adminJson({items:rows.results});
        }
        if(url.pathname==="/api/admin/projects" && request.method==="POST") {
          const b=await parseBody(request),org=clean(b.organization_id,80),name=clean(b.name,200);
          if(!org||!name)return adminJson({error:"organization_id and name are required"},400);
          const exists=await env.DB.prepare("SELECT id FROM organizations WHERE id=?").bind(org).first();
          if(!exists)return adminJson({error:"Organization not found"},404);
          const status=clean(b.status,30)||"planning";
          if(!["planning","design","quotation","approved","execution","on_hold","completed","cancelled"].includes(status))return adminJson({error:"Invalid project status"},400);
          const id=uid();
          await env.DB.prepare("INSERT INTO projects(id,organization_id,name,client_name,project_type,site_address,status,budget_amount,start_date,target_completion_date,notes) VALUES(?,?,?,?,?,?,?,?,?,?,?)").bind(id,org,name,clean(b.client_name,180)||null,clean(b.project_type,100)||null,clean(b.site_address,500)||null,status,typeof b.budget_amount==="number"&&b.budget_amount>=0?b.budget_amount:null,clean(b.start_date,30)||null,clean(b.target_completion_date,30)||null,clean(b.notes,4000)||null).run();
          await env.DB.prepare("INSERT INTO audit_events(id,organization_id,event_type,entity_type,entity_id,metadata_json) VALUES(?,?,?,?,?,?)").bind(uid(),org,"project_created","project",id,JSON.stringify({name,status})).run();
          return adminJson({ok:true,id,status:"created"},201);
        }
        if(url.pathname==="/api/admin/quotations" && request.method==="GET") {
          const org=clean(url.searchParams.get("organization_id"),80);
          if(!org)return adminJson({error:"organization_id is required"},400);
          const rows=await env.DB.prepare("SELECT * FROM quotations WHERE organization_id=? ORDER BY created_at DESC LIMIT 100").bind(org).all();
          return adminJson({items:rows.results});
        }
        if(url.pathname==="/api/admin/quotations" && request.method==="POST") {
          const b=await parseBody(request),org=clean(b.organization_id,80),number=clean(b.quotation_number,80),client=clean(b.client_name,180);
          if(!org||!number||!client)return adminJson({error:"organization_id, quotation_number and client_name are required"},400);
          const exists=await env.DB.prepare("SELECT id FROM organizations WHERE id=?").bind(org).first();
          if(!exists)return adminJson({error:"Organization not found"},404);
          const items=Array.isArray(b.items)?b.items.slice(0,100):[];
          if(!items.length)return adminJson({error:"At least one quotation item is required"},400);
          const normalized=[];
          for(const item of items) {
            if(!item||typeof item!=="object")return adminJson({error:"Each item must be an object"},400);
            const desc=clean(item.description,500),unit=clean(item.unit,40)||"Nos",qty=Number(item.quantity),rate=Number(item.rate),gst=Number(item.gst_rate??18);
            if(!desc||!Number.isFinite(qty)||qty<=0||!Number.isFinite(rate)||rate<0||!Number.isFinite(gst)||gst<0||gst>100)return adminJson({error:"Invalid quotation item description, quantity, rate or GST"},400);
            normalized.push({description:desc,unit,quantity:qty,rate,amount:qty*rate,hsn_code:clean(item.hsn_code,20)||null,gst_rate:gst});
          }
          const subtotal=normalized.reduce((s,x)=>s+x.amount,0),discount=Number(b.discount_amount||0);
          if(!Number.isFinite(discount)||discount<0||discount>subtotal)return adminJson({error:"discount_amount must be between 0 and subtotal"},400);
          const taxable=subtotal-discount,gstRate=Number(b.gst_rate??18);
          if(!Number.isFinite(gstRate)||gstRate<0||gstRate>100)return adminJson({error:"Invalid GST rate"},400);
          const gstAmount=taxable*gstRate/100,total=taxable+gstAmount,id=uid();
          await env.DB.prepare("INSERT INTO quotations(id,organization_id,project_id,quotation_number,client_name,client_email,client_phone,status,subtotal,discount_amount,taxable_amount,gst_rate,gst_amount,total_amount,valid_until,notes) VALUES(?,?,?,?,?,?,?,'draft',?,?,?,?,?,?,?, ?,?)").bind(id,org,clean(b.project_id,80)||null,number,client,clean(b.client_email,180)||null,clean(b.client_phone,30)||null,subtotal,discount,taxable,gstRate,gstAmount,total,clean(b.valid_until,30)||null,clean(b.notes,4000)||null).run();
          for(const item of normalized)await env.DB.prepare("INSERT INTO quotation_items(id,quotation_id,description,unit,quantity,rate,amount,hsn_code,gst_rate) VALUES(?,?,?,?,?,?,?,?,?)").bind(uid(),id,item.description,item.unit,item.quantity,item.rate,item.amount,item.hsn_code,item.gst_rate).run();
          await env.DB.prepare("INSERT INTO audit_events(id,organization_id,event_type,entity_type,entity_id,metadata_json) VALUES(?,?,?,?,?,?)").bind(uid(),org,"quotation_created","quotation",id,JSON.stringify({quotation_number:number,total_amount:total})).run();
          return adminJson({ok:true,id,quotation_number:number,subtotal,discount_amount:discount,taxable_amount:taxable,gst_rate:gstRate,gst_amount:gstAmount,total_amount:total,status:"draft"},201);
        }
        return adminJson({error:"Not found"},404);
      } catch(e) {
        if(e instanceof SyntaxError)return adminJson({error:"Malformed JSON body"},400);
        return adminJson({error:"Project or quotation request failed. Check migration and logs."},503);
      }
    }
    if(url.pathname.startsWith("/api/admin/automation/")) {
      if(!adminOk(request,env)) return adminJson({error:"Unauthorized. Configure ADMIN_TOKEN and provide a bearer token."},401);
      try {
        if(url.pathname==="/api/admin/automation/agents/control" && request.method==="POST"){
          const b=await parseBody(request),id=clean(b.agent_id,80),status=clean(b.status,20);
          if(!id||!["active","paused","disabled","draft"].includes(status))return adminJson({error:"agent_id and valid status required"},400);
          const res=await env.DB.prepare("UPDATE automation_agents SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(status,id).run();
          if(!res.meta.changes)return adminJson({error:"Agent not found"},404);
          await env.DB.prepare("INSERT INTO automation_audit_log(id,actor,action,entity_type,entity_id,details_json) VALUES(?,?,?,?,?,?)").bind(uid(),"admin","agent_status_changed","agent",id,JSON.stringify({status})).run();
          return adminJson({ok:true,id,status,note:"Status updated. This repository does not yet contain an agent executor."});
        }
        if(url.pathname==="/api/admin/automation/workflows/control" && request.method==="POST"){
          const b=await parseBody(request),id=clean(b.workflow_id,80),status=clean(b.status,20);
          if(!id||!["active","paused","disabled","draft"].includes(status))return adminJson({error:"workflow_id and valid status required"},400);
          const res=await env.DB.prepare("UPDATE automation_workflows SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(status,id).run();
          if(!res.meta.changes)return adminJson({error:"Workflow not found"},404);
          await env.DB.prepare("INSERT INTO automation_audit_log(id,actor,action,entity_type,entity_id,details_json) VALUES(?,?,?,?,?,?)").bind(uid(),"admin","workflow_status_changed","workflow",id,JSON.stringify({status})).run();
          return adminJson({ok:true,id,status,note:"Workflow status updated. Scheduling and execution engine are not yet connected."});
        }
        if(url.pathname==="/api/admin/automation/tasks/cancel" && request.method==="POST"){
          const b=await parseBody(request),id=clean(b.task_id,80);
          if(!id)return adminJson({error:"task_id required"},400);
          const res=await env.DB.prepare("UPDATE automation_tasks SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status IN ('queued','awaiting_approval')").bind(id).run();
          if(!res.meta.changes)return adminJson({error:"Task not found or not cancellable"},409);
          await env.DB.prepare("INSERT INTO automation_audit_log(id,actor,action,entity_type,entity_id,details_json) VALUES(?,?,?,?,?,?)").bind(uid(),"admin","task_cancelled","task",id,"{}").run();
          return adminJson({ok:true,id,status:"cancelled"});
        }
        if(url.pathname==="/api/admin/automation/summary" && request.method==="GET"){
          const [agents,tasks,approvals,workflows]=await Promise.all([
            env.DB.prepare("SELECT status,COUNT(*) count FROM automation_agents GROUP BY status").all(),
            env.DB.prepare("SELECT status,COUNT(*) count FROM automation_tasks GROUP BY status").all(),
            env.DB.prepare("SELECT status,COUNT(*) count FROM automation_approvals GROUP BY status").all(),
            env.DB.prepare("SELECT status,COUNT(*) count FROM automation_workflows GROUP BY status").all()
          ]);
          return adminJson({agents:agents.results,tasks:tasks.results,approvals:approvals.results,workflows:workflows.results});
        }
        if(url.pathname==="/api/admin/automation/agents" && request.method==="GET"){
          const rows=await env.DB.prepare("SELECT id,name,agent_type,description,config_json,status,created_at,updated_at FROM automation_agents ORDER BY created_at DESC LIMIT 100").all();
          return adminJson({items:rows.results});
        }
        if(url.pathname==="/api/admin/automation/tasks" && request.method==="GET"){
          const status=clean(url.searchParams.get("status"),30),limit=Math.min(Math.max(parseInt(url.searchParams.get("limit")||"50",10)||50,1),100);
          let q="SELECT id,agent_id,task_type,payload_json,status,attempts,max_attempts,scheduled_at,started_at,completed_at,output_json,last_error,created_at FROM automation_tasks";
          const params: string[]=[]; if(status){q+=" WHERE status=?";params.push(status);} q+=" ORDER BY created_at DESC LIMIT ?";params.push(String(limit));
          const rows=await env.DB.prepare(q).bind(...params).all();return adminJson({items:rows.results});
        }
        if(url.pathname==="/api/admin/automation/workflows" && request.method==="GET"){
          const rows=await env.DB.prepare("SELECT id,name,description,trigger_type,trigger_config_json,steps_json,status,created_at,updated_at FROM automation_workflows ORDER BY created_at DESC LIMIT 100").all();return adminJson({items:rows.results});
        }
        if(url.pathname==="/api/admin/automation/approvals" && request.method==="GET"){
          const status=clean(url.searchParams.get("status"),20)||"pending";
          const rows=await env.DB.prepare("SELECT id,task_id,action_type,details_json,status,requested_by,reviewed_by,review_note,created_at,reviewed_at FROM automation_approvals WHERE status=? ORDER BY created_at DESC LIMIT 100").bind(status).all();return adminJson({items:rows.results});
        }
        if(url.pathname==="/api/admin/automation/approvals/review" && request.method==="POST"){
          const b=await parseBody(request),id=clean(b.approval_id,80),decision=clean(b.decision,20),note=clean(b.note,1000);
          if(!id||!["approved","rejected"].includes(decision))return adminJson({error:"approval_id and decision (approved/rejected) required"},400);
          const current=await env.DB.prepare("SELECT status FROM automation_approvals WHERE id=?").bind(id).first<{status:string}>();
          if(!current)return adminJson({error:"Approval not found"},404);
          if(current.status!=="pending")return adminJson({error:"Approval already reviewed"},409);
          await env.DB.prepare("UPDATE automation_approvals SET status=?,reviewed_by='admin',review_note=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'").bind(decision,note,id).run();
          await env.DB.prepare("INSERT INTO automation_audit_log(id,actor,action,entity_type,entity_id,details_json) VALUES(?,?,?,?,?,?)").bind(uid(),"admin",`approval_${decision}`,"approval",id,JSON.stringify({note})).run();
          return adminJson({ok:true,id,status:decision,note:"Decision recorded. Approved actions are not automatically executed."});
        }
        if(url.pathname==="/api/admin/automation/agents" && request.method==="POST"){
          const b=await parseBody(request),name=clean(b.name,100),type=clean(b.agent_type,80),description=clean(b.description,1000);
          if(!name||!type)return adminJson({error:"name and agent_type are required"},400);
          const id=uid();await env.DB.prepare("INSERT INTO automation_agents(id,name,agent_type,description,config_json,status) VALUES(?,?,?,?,?,'draft')").bind(id,name,type,description,JSON.stringify(b.config||{})).run();
          await env.DB.prepare("INSERT INTO automation_audit_log(id,actor,action,entity_type,entity_id,details_json) VALUES(?,?,?,?,?,?)").bind(uid(),"admin","agent_created","agent",id,JSON.stringify({name,type})).run();
          return adminJson({ok:true,id,status:"draft",note:"Agent saved as draft. Activation is not automatic."},201);
        }
        if(url.pathname==="/api/admin/automation/tasks" && request.method==="POST"){
          const b=await parseBody(request),type=clean(b.task_type,100);
          if(!type)return adminJson({error:"task_type is required"},400);
          const id=uid(),payload=JSON.stringify(b.payload||{}),agentId=clean(b.agent_id,80)||null;
          await env.DB.prepare("INSERT INTO automation_tasks(id,agent_id,task_type,payload_json,status,scheduled_at) VALUES(?,?,?,?, 'queued',?)").bind(id,agentId,type,payload,clean(b.scheduled_at,40)||null).run();
          await env.DB.prepare("INSERT INTO automation_audit_log(id,actor,action,entity_type,entity_id,details_json) VALUES(?,?,?,?,?,?)").bind(uid(),"admin","task_queued","task",id,JSON.stringify({type,agentId})).run();
          return adminJson({ok:true,id,status:"queued",note:"Queued for allow-listed scheduled execution. Unsupported task types will fail safely."},201);
        }
        if(url.pathname==="/api/admin/automation/workflows" && request.method==="POST"){
          const b=await parseBody(request),name=clean(b.name,100),trigger=clean(b.trigger_type,20)||"manual";
          if(!name||!["manual","schedule","event"].includes(trigger))return adminJson({error:"Valid name and trigger_type (manual/schedule/event) required"},400);
          const id=uid();await env.DB.prepare("INSERT INTO automation_workflows(id,name,description,trigger_type,trigger_config_json,steps_json,status) VALUES(?,?,?,?,?,?,'draft')").bind(id,name,clean(b.description,1000),trigger,JSON.stringify(b.trigger_config||{}),JSON.stringify(Array.isArray(b.steps)?b.steps:[])).run();
          await env.DB.prepare("INSERT INTO automation_audit_log(id,actor,action,entity_type,entity_id,details_json) VALUES(?,?,?,?,?,?)").bind(uid(),"admin","workflow_created","workflow",id,JSON.stringify({name,trigger})).run();
          return adminJson({ok:true,id,status:"draft",note:"Workflow saved as draft. Execution is not enabled."},201);
        }
        if(url.pathname==="/api/admin/automation/approvals" && request.method==="POST"){
          const b=await parseBody(request),action=clean(b.action_type,100);
          if(!action)return adminJson({error:"action_type is required"},400);
          const id=uid(),taskId=clean(b.task_id,80)||null;
          await env.DB.prepare("INSERT INTO automation_approvals(id,task_id,action_type,details_json,requested_by,status) VALUES(?,?,?,?,?,'pending')").bind(id,taskId,action,JSON.stringify(b.details||{}),"admin").run();
          await env.DB.prepare("INSERT INTO automation_audit_log(id,actor,action,entity_type,entity_id,details_json) VALUES(?,?,?,?,?,?)").bind(uid(),"admin","approval_requested","approval",id,JSON.stringify({action,taskId})).run();
          return adminJson({ok:true,id,status:"pending"},201);
        }
        return adminJson({error:"Not found"},404);
      }catch(e){
        if(e instanceof SyntaxError)return adminJson({error:"Malformed JSON body"},400);
        return adminJson({error:"Automation request failed. Check migrations and logs."},503);
      }
    }
    try {
      if(url.pathname==="/api/marketplace/categories" && request.method==="GET"){
        const rows=await env.DB.prepare("SELECT id,name,slug,parent_id FROM marketplace_categories WHERE active=1 ORDER BY name").all();
        return json({items:rows.results});
      }
      if(url.pathname==="/api/marketplace/products" && request.method==="GET"){
        const search=clean(url.searchParams.get("q"),100), category=clean(url.searchParams.get("category"),100), limit=Math.min(Math.max(parseInt(url.searchParams.get("limit")||"24",10)||24,1),50);
        let sql="SELECT id,title,slug,short_description,category_id,brand,price,currency,stock_quantity,images_json,attributes_json,seller_name,created_at FROM marketplace_products WHERE status='approved'";
        const params: (string|number)[]=[];
        if(search){sql+=" AND (title LIKE ? OR short_description LIKE ? OR brand LIKE ?)";const s="%"+search+"%";params.push(s,s,s);}
        if(category){sql+=" AND category_id=?";params.push(category);}
        sql+=" ORDER BY created_at DESC LIMIT ?";params.push(limit);
        const rows=await env.DB.prepare(sql).bind(...params).all();
        return json({items:rows.results,query:search,limit});
      }
      if(url.pathname==="/api/marketplace/seller-register" && request.method==="POST") return await saveRegistration(env,"marketplace_seller_applications",await parseBody(request),"business_type");
      if(url.pathname==="/api/marketplace/vendor-register" && request.method==="POST") return await saveRegistration(env,"marketplace_vendor_applications",await parseBody(request),"vendor_type");
      if((url.pathname==="/api/marketplace/enquiry"||url.pathname==="/api/public/enquiry")&&request.method==="POST"){
        const b=await parseBody(request),name=clean(b.name,120),email=clean(b.email,180).toLowerCase(),phone=clean(b.phone,30),message=clean(b.message,4000);
        if(!name||(!validEmail(email)&&!phone)||!message)return json({error:"Name, message and either valid email or phone are required"},400);
        const id=uid();
        if(url.pathname==="/api/marketplace/enquiry"){
          await env.DB.prepare("INSERT INTO marketplace_enquiries (id,name,email,phone,product_id,message,status) VALUES (?,?,?,?,?,?,'new')").bind(id,name,email||null,phone||null,clean(b.product_id,80)||null,message).run();
        }else{
          await env.DB.prepare("INSERT INTO public_enquiries (id,name,email,phone,service,message,status) VALUES (?,?,?,?,?,?,'new')").bind(id,name,email||null,phone||null,clean(b.service,120)||null,message).run();
        }
        return json({ok:true,enquiry_id:id,status:"received"},201);
      }
    }catch(e){
      if(e instanceof SyntaxError)return json({error:"Malformed JSON body"},400);
      if(e instanceof Error&&e.message==="Request body too large")return json({error:e.message},413);
      return json({error:"Request could not be processed. Check database migration and server logs."},503);
    }
    if(url.pathname==="/") return new Response("<!doctype html><html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width'><title>DPM Enterprise OS</title></head><body><main><h1>DPM Enterprise OS</h1><p>Cloudflare Worker API foundation. Database-backed public enquiry and marketplace registration/search routes are available after applying migrations.</p><a href='/api/health'>System health</a></main></body></html>",{headers:{"content-type":"text/html; charset=utf-8","content-security-policy":"default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'","x-content-type-options":"nosniff","x-frame-options":"DENY","referrer-policy":"strict-origin-when-cross-origin"}});
    return json({error:"Not found"},404);
  }
};
