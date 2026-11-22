/// <reference types="@cloudflare/workers-types" />
export interface Env {
  DB: D1Database;
  DOCS: R2Bucket;
  APP_NAME: string;
  APP_ENV: string;
}

const headers = { "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff", "cache-control": "no-store" };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });
const cors = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "content-type" };
const corsJson = (data: unknown, status = 200) => json(data,status);
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
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url=new URL(request.url);
    if(request.method==="OPTIONS") return new Response(null,{status:204,headers:cors});
    if(url.pathname==="/api/health") return json({ok:true,app:env.APP_NAME,environment:env.APP_ENV,timestamp:new Date().toISOString()});
    if(url.pathname==="/api") return json({name:env.APP_NAME,status:"public-api-foundation",endpoints:["GET /api/health","GET /api/marketplace/categories","GET /api/marketplace/products","POST /api/marketplace/seller-register","POST /api/marketplace/vendor-register","POST /api/marketplace/enquiry","POST /api/public/enquiry"]});
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
