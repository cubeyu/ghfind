import { pickTarget } from "./routes";

export interface Env {
  WEB: Fetcher;
  API: Fetcher;
  LEGACY: Fetcher;
  /** "1" sends every request to the legacy Worker (instant rollback via a var change). */
  ROUTER_FORCE_LEGACY?: string;
}

export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url);
    const target = env.ROUTER_FORCE_LEGACY === "1" ? "legacy" : pickTarget(pathname);
    const upstream = target === "web" ? env.WEB : target === "api" ? env.API : env.LEGACY;
    // Service bindings keep the original URL/host, so both apps see the
    // public origin exactly as they did behind the custom domain.
    // Web can't render legacy's localized not-found page: an unknown slug on a
    // migrated dynamic route comes back marked for fallback (body-less, so the
    // request is replayed unchanged).
    let served = target;
    let res = await upstream.fetch(target === "web" ? request.clone() : request);
    if (target === "web" && res.status === 404 && res.headers.get("X-Ghfind-Fallback") === "legacy") {
      served = "legacy";
      res = await env.LEGACY.fetch(request);
    }
    const out = new Response(res.body, res);
    out.headers.set("X-Ghfind-Origin", served);
    return out;
  },
} satisfies ExportedHandler<Env>;
