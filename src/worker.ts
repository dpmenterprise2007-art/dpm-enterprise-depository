/// <reference types="@cloudflare/workers-types" />
export interface Env {
  DB: D1Database;
  DOCS: R2Bucket;
  APP_NAME: string;
  APP_ENV: string;
  ADMIN_TOKEN?: string;
  AI: Ai;
}

const headers = { "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff", "cache-control": "no-store" };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });
const cors = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,PATCH,OPTIONS", "access-control-allow-headers": "content-type, authorization" };
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
  if(task.task_type==="workflow_run") {
    const workflowId=clean(payload.workflow_id,80);
    if(!workflowId) throw new Error("workflow_id is required for workflow_run");
    const workflow=await env.DB.prepare("SELECT name,steps_json,status FROM automation_workflows WHERE id=?").bind(workflowId).first<{name:string;steps_json:string;status:string}>();
    if(!workflow||workflow.status!=="active") throw new Error("Workflow must exist and be active before execution");
    let steps:unknown;
    try { steps=JSON.parse(workflow.steps_json||"[]"); } catch { throw new Error("Workflow steps_json must be valid JSON"); }
    if(!Array.isArray(steps)||steps.length<1||steps.length>10) throw new Error("Workflow must contain between 1 and 10 steps");
    const allowed=["health_check","crm_followup_scan","inventory_stock_scan","project_deadline_scan","finance_overdue_scan","ai_business_analysis","ai_agent_run"];
    const outputs:TaskResult[]=[];
    for(let i=0;i<steps.length;i++) {
      const step=steps[i] as Record<string,unknown>;
      const type=clean(step.task_type,100);
      if(!allowed.includes(type)) throw new Error("Workflow step "+(i+1)+" has unsupported task_type");
      if(type==="workflow_run") throw new Error("Nested workflow execution is not supported");
      const stepAgent=clean(step.agent_id,80)||null;
      const stepPayload=JSON.stringify(step.payload&&typeof step.payload==="object"?step.payload:{});
      outputs.push(await executeSafeTask(env,{id:task.id,task_type:type,payload_json:stepPayload,agent_id:stepAgent}));
    }
    return {type:"workflow_run",workflow_id:workflowId,workflow_name:workflow.name,step_count:outputs.length,steps:outputs,generated_at:new Date().toISOString()};
  }
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

  if(task.task_type==="inventory_stock_scan") {
    const organizationId=clean(payload.organization_id,80);
    if(!organizationId) throw new Error("organization_id is required for inventory_stock_scan");
    const rows=await env.DB.prepare("SELECT id,sku,item_name,category,unit,stock_qty,reorder_level,unit_cost,warehouse FROM inventory_items WHERE organization_id=? AND status='active' AND stock_qty<=reorder_level ORDER BY (reorder_level-stock_qty) DESC LIMIT 200").bind(organizationId).all();
    return {type:"inventory_stock_scan",organization_id:organizationId,low_stock_count:rows.results.length,items:rows.results,generated_at:new Date().toISOString(),note:"Read-only stock threshold scan; no purchase orders were created."};
  }
  if(task.task_type==="project_deadline_scan") {
    const organizationId=clean(payload.organization_id,80);
    if(!organizationId) throw new Error("organization_id is required for project_deadline_scan");
    const now=new Date().toISOString().slice(0,10);
    const rows=await env.DB.prepare("SELECT id,name,client_name,status,target_completion_date,budget_amount FROM projects WHERE organization_id=? AND target_completion_date IS NOT NULL AND target_completion_date<=? AND status NOT IN ('completed','cancelled') ORDER BY target_completion_date ASC LIMIT 100").bind(organizationId,now).all();
    return {type:"project_deadline_scan",organization_id:organizationId,overdue_or_due_count:rows.results.length,items:rows.results,generated_at:new Date().toISOString(),note:"Read-only deadline scan; no project status was changed."};
  }
  if(task.task_type==="finance_overdue_scan") {
    const organizationId=clean(payload.organization_id,80);
    if(!organizationId) throw new Error("organization_id is required for finance_overdue_scan");
    const now=new Date().toISOString().slice(0,10);
    const rows=await env.DB.prepare("SELECT id,client_name,invoice_number,invoice_date,due_date,total_amount,amount_paid,status FROM finance_invoices WHERE organization_id=? AND due_date IS NOT NULL AND due_date<? AND status NOT IN ('paid','cancelled') ORDER BY due_date ASC LIMIT 100").bind(organizationId,now).all();
    return {type:"finance_overdue_scan",organization_id:organizationId,overdue_invoice_count:rows.results.length,total_outstanding:rows.results.reduce((sum,row)=>sum+Math.max(0,Number(row.total_amount||0)-Number(row.amount_paid||0)),0),items:rows.results,generated_at:new Date().toISOString(),note:"Read-only overdue invoice scan; no collection messages were sent."};
  }
  if(task.task_type==="ai_agent_run") {
    if(!task.agent_id) throw new Error("agent_id is required for ai_agent_run");
    const agent=await env.DB.prepare("SELECT name,agent_type,description,config_json,status FROM automation_agents WHERE id=?").bind(task.agent_id).first<{name:string;agent_type:string;description:string;config_json:string;status:string}>();
    if(!agent||agent.status!=="active") throw new Error("An active agent is required for ai_agent_run");
    const prompt=clean(payload.prompt,6000);
    const context=clean(payload.context,12000);
    if(!prompt) throw new Error("prompt is required for ai_agent_run");
    let config:Record<string,unknown>={};
    try { config=JSON.parse(agent.config_json||"{}") as Record<string,unknown>; } catch { throw new Error("Agent config_json must be valid JSON"); }
    const instructions=clean(config.instructions,4000);
    const system="You are the DPM Enterprise AI agent named "+agent.name+". Agent type: "+agent.agent_type+". Agent description: "+agent.description+". "+instructions+" Operate only as a business assistant. Do not invent facts, prices, legal rules, external contacts, or research. Clearly flag assumptions and missing evidence. You cannot send communications, publish, submit bids, make payments, or perform external actions. Return actionable results and next steps.";
    const result=await env.AI.run("@cf/meta/llama-3.1-8b-instruct",{messages:[{role:"system",content:system},{role:"user",content:"Context: "+context+"\nTask: "+prompt}],max_tokens:1200});
    return {type:"ai_agent_run",agent_id:task.agent_id,agent_name:agent.name,agent_type:agent.agent_type,response:result,model:"@cf/meta/llama-3.1-8b-instruct",generated_at:new Date().toISOString()};
  }
  if(task.task_type==="ai_business_analysis") {
    const prompt=clean(payload.prompt,6000);
    const context=clean(payload.context,12000);
    const objective=clean(payload.objective,120);
    if(!prompt) throw new Error("prompt is required for ai_business_analysis");
    const system="You are DPM Enterprise AI, an operations and sales analyst for an Indian interior design and custom furniture company. Give actionable analysis in Hinglish when suitable. Do not invent company facts, prices, tender requirements, legal rules, or external research. Clearly separate assumptions from facts. You cannot send messages, make payments, submit bids, or perform external actions.";
    const result=await env.AI.run("@cf/meta/llama-3.1-8b-instruct",{messages:[{role:"system",content:system},{role:"user",content:"Objective: "+objective+"\nContext: "+context+"\nRequest: "+prompt}],max_tokens:1200});
    return {type:"ai_business_analysis",objective:objective||"general",response:result,model:"@cf/meta/llama-3.1-8b-instruct",generated_at:new Date().toISOString()};
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
          const org=clean(url.searchParams.get("organization_id"),80),stage=clean(url.searchParams.get("stage"),40),search=clean(url.searchParams.get("search"),160),source=clean(url.searchParams.get("source"),100),limit=Math.min(Math.max(parseInt(url.searchParams.get("limit")||"50",10)||50,1),100);
          if(!org)return adminJson({error:"organization_id is required"},400);
          let q="SELECT id,organization_id,company_name,contact_name,email,phone,source,stage,next_followup_at,notes,created_at,updated_at FROM leads WHERE organization_id=?";
          const params:(string|number)[]=[org];if(stage){q+=" AND stage=?";params.push(stage);}if(source){q+=" AND source=?";params.push(source);}if(search){q+=" AND (company_name LIKE ? OR contact_name LIKE ? OR email LIKE ? OR phone LIKE ?)";const term="%"+search+"%";params.push(term,term,term,term);}q+=" ORDER BY created_at DESC LIMIT ?";params.push(limit);
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
        const activityMatch=url.pathname.match(/^\/api\/admin\/crm\/leads\/([^/]+)\/activity$/);
        if(activityMatch && request.method==="GET") {
          const id=clean(decodeURIComponent(activityMatch[1]),80);
          const lead=await env.DB.prepare("SELECT organization_id FROM leads WHERE id=?").bind(id).first<{organization_id:string}>();
          if(!lead)return adminJson({error:"Lead not found"},404);
          const rows=await env.DB.prepare("SELECT id,event_type,metadata_json,created_at FROM audit_events WHERE organization_id=? AND entity_type='lead' AND entity_id=? ORDER BY created_at DESC LIMIT 100").bind(lead.organization_id,id).all();
          return adminJson({items:rows.results});
        }
        const leadMatch=url.pathname.match(/^\/api\/admin\/crm\/leads\/([^/]+)$/);
        if(leadMatch && request.method==="PATCH") {
          const b=await parseBody(request),id=clean(decodeURIComponent(leadMatch[1]),80);
          const current=await env.DB.prepare("SELECT id,organization_id,company_name,contact_name,email,phone,source,stage,next_followup_at,notes FROM leads WHERE id=?").bind(id).first<Record<string,unknown>>();
          if(!current)return adminJson({error:"Lead not found"},404);
          const has=(key:string)=>Object.prototype.hasOwnProperty.call(b,key);const company=has("company_name")?clean(b.company_name,200):String(current.company_name),contact=has("contact_name")?clean(b.contact_name,120):String(current.contact_name||""),email=has("email")?clean(b.email,180).toLowerCase():String(current.email||""),phone=has("phone")?clean(b.phone,30):String(current.phone||""),source=has("source")?clean(b.source,100):String(current.source||""),notes=has("notes")?clean(b.notes,4000):String(current.notes||""),stage=has("stage")?clean(b.stage,40):String(current.stage),follow=has("next_followup_at")?clean(b.next_followup_at,40):String(current.next_followup_at||"");
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
          return adminJson({ok:true,id,status:"queued",supported_task_types:["health_check","crm_followup_scan","inventory_stock_scan","project_deadline_scan","finance_overdue_scan","ai_business_analysis","ai_agent_run","workflow_run"],note:"Task queued. Supported scans are read-only; AI analysis runs through Workers AI."},201);
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
    if(url.pathname==="/api/admin/ai/modules" && request.method==="GET") {
      if(!adminOk(request,env)) return adminJson({error:"Unauthorized"},401);
      try {
        const rows=await env.DB.prepare("SELECT module_key,name,description,capabilities_json,status FROM ai_module_catalog WHERE status='available' ORDER BY name").all();
        return adminJson({items:rows.results});
      } catch(e) { return adminJson({error:"AI module catalog unavailable. Apply database migrations first."},503); }
    }
    if(url.pathname==="/api/admin/ai/assist" && request.method==="POST") {
      if(!adminOk(request,env)) return adminJson({error:"Unauthorized"},401);
      try {
        const b=await parseBody(request);
        const prompt=clean(b.prompt,6000);
        const context=clean(b.context,12000);
        const task=clean(b.task,80)||"general";
        if(!prompt) return adminJson({error:"prompt is required"},400);
        const moduleRow=await env.DB.prepare("SELECT name,task_prompt FROM ai_module_catalog WHERE module_key=? AND status='available'").bind(task).first<{name:string;task_prompt:string}>();
        const system="You are DPM Enterprise AI, an internal business copilot for an Indian interior design and custom furniture company. "+(moduleRow?.task_prompt||"Give actionable, concise, accurate help for the selected task.")+" Never invent facts, tender clauses, prices, legal requirements, contacts, or company data. Flag assumptions and missing evidence. You cannot send messages, submit bids, make payments, publish content, or take external actions. GST references are general guidance and require accountant validation. Respond in Hinglish when the user uses Hinglish.";
        const result=await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {messages:[{role:"system",content:system},{role:"user",content:"Module: "+(moduleRow?.name||task)+"\nContext:\n"+context+"\n\nRequest:\n"+prompt}],max_tokens:1200});
        return adminJson({ok:true,task,response:result,model:"@cf/meta/llama-3.1-8b-instruct",generated_at:new Date().toISOString()});
      } catch(e) {
        return adminJson({error:"AI request failed. Check Workers AI availability and account configuration."},503);
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
    if(url.pathname==="/api/public/platform-status" && request.method==="GET") return json({app:"DPM Enterprise OS",status:"foundation_live",live_features:["Cloudflare Worker API","D1 database migrations","Public enquiry submission","Marketplace category/product listing APIs","Seller/vendor registration APIs","Protected CRM/project/quotation/AI/automation API foundations"],incomplete_features:["Autonomous AI build and release","Automated data hunting","Full ERP UI and workflows","Tender intelligence ingestion","Email/WhatsApp integrations","Android app"],checked_at:new Date().toISOString()});
    if(url.pathname==="/") {
      const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#101827"><title>DPM Enterprise OS</title><style>
      *{box-sizing:border-box}body{margin:0;background:#0b1220;color:#eef3ff;font:16px system-ui,-apple-system,Segoe UI,sans-serif}main{max-width:1120px;margin:auto;padding:28px 20px 56px}.top{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #253349;padding-bottom:20px}.brand{display:flex;gap:12px;align-items:center;font-weight:800;letter-spacing:.12em}.logo{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:#d8e7ff;color:#15243a;font-size:22px}.pill{border:1px solid #365b4d;color:#9be5c3;border-radius:20px;padding:8px 12px;font-size:12px}.hero{padding:64px 0 46px}.kicker{color:#91b6e8;text-transform:uppercase;letter-spacing:.18em;font-size:12px;font-weight:700}.h1{font-size:clamp(40px,7vw,72px);letter-spacing:-.055em;line-height:1.04;margin:16px 0}.h1 span{color:#9db9e8}.lead{color:#acb9cd;max-width:700px;line-height:1.7}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}.btn{display:inline-block;text-decoration:none;color:#e8f1ff;border:1px solid #425b7c;border-radius:10px;padding:10px 14px}.section{margin:32px 0}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.card{background:#121c2c;border:1px solid #28384e;border-radius:14px;padding:18px}.card h3{margin:8px 0 6px}.card p{color:#a9b6c9;font-size:13px;line-height:1.55}.tag{font-size:11px;color:#9db5d5}.form{display:grid;grid-template-columns:1fr 1fr;gap:12px}.form label{font-size:12px;color:#c5d1e3}.form input,.form textarea,.form select{width:100%;margin-top:6px;background:#0b1321;color:#edf3ff;border:1px solid #30415a;border-radius:9px;padding:11px;font:inherit}.full{grid-column:1/-1}.submit{background:#dbeafe;color:#17243a;border:0;border-radius:10px;padding:12px;font-weight:700;cursor:pointer}.small{font-size:12px;color:#8796ac}footer{margin-top:40px;border-top:1px solid #253349;padding-top:18px;color:#7f8da3;font-size:12px}@media(max-width:720px){.grid{grid-template-columns:1fr}.hero{padding:42px 0}.form{grid-template-columns:1fr}.full{grid-column:auto}.top{align-items:flex-start;gap:10px;flex-wrap:wrap}}
      </style></head><body><main><header class="top"><div class="brand"><span class="logo">D</span><span>DPM ENTERPRISE<br><small style="font-weight:400;letter-spacing:0;color:#94a4ba">Business Operating Platform</small></span></div><span class="pill" id="health">Checking live system…</span></header><section class="hero"><p class="kicker">DPM Enterprise Private Limited</p><h1 class="h1">One workspace.<br><span>Every operation connected.</span></h1><p class="lead">A growing business operating platform for sales, project execution, BOQ and quotations, procurement, marketplace enquiries and AI-assisted operations. Features are published in stages; the status below distinguishes live foundations from work still under development.</p><div class="actions"><a class="btn" href="/api/health">Server health</a><a class="btn" href="/api/public/platform-status">Public feature status</a><a class="btn" href="https://www.dpmenterprise.in" target="_blank" rel="noopener">Company website ↗</a></div></section><section class="section"><h2>Platform features</h2><div class="grid"><article class="card"><span class="tag">LIVE FOUNDATION</span><h3>Public Enquiries</h3><p>Contact and project enquiry form submits to the backend database.</p></article><article class="card"><span class="tag">LIVE API</span><h3>Marketplace Listings</h3><p>Product and category listing endpoints; seller/vendor registration endpoints.</p><div class="actions"><a class="btn" href="/api/marketplace/categories">Categories</a><a class="btn" href="/api/marketplace/products">Products</a></div></article><article class="card"><span class="tag">API FOUNDATION</span><h3>CRM & Sales</h3><p>Protected organization and lead API foundation with validation and audit events.</p></article><article class="card"><span class="tag">API FOUNDATION</span><h3>Projects & Quotations</h3><p>Protected project and quotation creation/list API foundations with BOQ item and GST calculations.</p></article><article class="card"><span class="tag">AI FOUNDATION</span><h3>AI Workbench</h3><p>Workers AI assistant endpoint and module-specific prompt catalog.</p></article><article class="card"><span class="tag">IN DEVELOPMENT</span><h3>Autonomous Build & ERP</h3><p>Self-build/release engine, data hunting, full ERP screens, mobile app and advanced integrations are not yet live.</p></article></div></section><section class="section card"><h2>Send a project enquiry</h2><p class="lead">Tell us about your residential, commercial, office, showroom or furniture requirement.</p><form id="enquiry" class="form"><label>Name<input name="name" required maxlength="120"></label><label>Email<input name="email" type="email" maxlength="180"></label><label>Phone<input name="phone" maxlength="30"></label><label>Service<select name="service"><option>Interior Design</option><option>Residential Interior</option><option>Commercial / Office Interior</option><option>Custom Furniture</option><option>Modular Kitchen / Wardrobe</option><option>Project / Tender Enquiry</option><option>Other</option></select></label><label class="full">Message<textarea name="message" rows="4" required maxlength="4000"></textarea></label><button class="submit full" type="submit">Submit enquiry</button><p class="small full" id="formstatus" role="status"></p></form></section><footer>© DPM Enterprise Private Limited · Public API foundation · <a style="color:#9db9e8" href="/api/health">Health endpoint</a></footer></main><script>
      fetch('/api/health').then(r=>r.ok?r.json():Promise.reject()).then(d=>{document.getElementById('health').textContent='Live · '+(d.environment||'production');}).catch(()=>{document.getElementById('health').textContent='Health check unavailable';document.getElementById('health').style.color='#ffb3b3';});
      document.getElementById('enquiry').addEventListener('submit',async e=>{e.preventDefault();const form=e.target,button=form.querySelector('button'),status=document.getElementById('formstatus');button.disabled=true;button.textContent='Submitting…';status.textContent='';const data=Object.fromEntries(new FormData(form).entries());try{const res=await fetch('/api/public/enquiry',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});const result=await res.json();if(!res.ok)throw new Error(result.error||'Submission failed');status.textContent='Enquiry received. Reference: '+result.enquiry_id;form.reset();}catch(err){status.textContent=err.message||'Unable to submit. Please try again.';}finally{button.disabled=false;button.textContent='Submit enquiry';}});
      </script></body></html>`;
      return new Response(html,{headers:{"content-type":"text/html; charset=utf-8","content-security-policy":"default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'","x-content-type-options":"nosniff","x-frame-options":"DENY","referrer-policy":"strict-origin-when-cross-origin","cache-control":"no-store"}});
    }
    return json({error:"Not found"},404);
  }
};
