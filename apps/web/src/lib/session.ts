import { env } from "cloudflare:workers";

interface Service {
  fetch(request: Request): Promise<Response>;
}

/**
 * Whether the request carries a valid session, asked of ghfind-api's
 * /api/me over the API service binding — the auth secrets stay on the API
 * Worker only. Same answer as the Next app's `auth()` (both verify the
 * ghfind_session cookie).
 */
export async function isSignedIn(request: Request): Promise<boolean> {
  const api = env.API as Service | undefined;
  const cookie = request.headers.get("cookie");
  if (!api || !cookie?.includes("ghfind_session=")) return false;
  try {
    const res = await api.fetch(new Request(new URL("/api/me", request.url), { headers: { cookie } }));
    if (!res.ok) return false;
    const body = (await res.json()) as { user?: unknown };
    return Boolean(body.user);
  } catch {
    return false;
  }
}
