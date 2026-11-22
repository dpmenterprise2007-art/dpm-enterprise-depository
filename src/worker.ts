export interface Env {
  DB: D1Database;
  DOCS: R2Bucket;
  APP_NAME: string;
  APP_ENV: string;
}

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff" } });
const pageHeaders = { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'", "x-content-type-options": "nosniff", "x-frame-options": "DENY", "referrer-policy": "strict-origin-when-cross-origin", "permissions-policy": "camera=(), microphone=(), geolocation=()" };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") return json({ ok: true, app: env.APP_NAME, environment: env.APP_ENV, timestamp: new Date().toISOString() });
    if (url.pathname === "/api") return json({ name: env.APP_NAME, status: "starter", modules: ["crm", "finance", "hr", "compliance", "projects", "procurement", "marketing", "ai-automation"] });
    if (url.pathname === "/") return new Response("<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width\"><title>DPM Enterprise OS</title></head><body><main><h1>DPM Enterprise OS</h1><p>Cloudflare-first corporate operating system.</p><p>Initial Worker is running. Feature modules are under active implementation.</p><a href=\"/api/health\">System health</a></main></body></html>", { headers: pageHeaders });
    return json({ error: "Not found" }, 404);
  }
};
