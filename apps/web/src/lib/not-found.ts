/**
 * Unknown slug on a migrated dynamic route. The router (apps/router) sees the
 * marker and re-dispatches to the legacy Worker, which renders the Next app's
 * localized not-found page — one 404 page for both stacks until P5.
 */
export const NOT_FOUND_FALLBACK_HEADER = "X-Ghfind-Fallback";

export function notFoundToLegacy(): Response {
  return new Response(null, { status: 404, headers: { [NOT_FOUND_FALLBACK_HEADER]: "legacy" } });
}

/** Static content pages: edge-cache a day, serve stale for a week (as /about). */
export const STATIC_PAGE_CACHE = "public, s-maxage=86400, stale-while-revalidate=604800";
