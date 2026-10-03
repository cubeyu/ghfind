import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  getHeatLeaderboard,
  getLeaderboard,
  getProgressLeaderboard,
  getTrendingLeaderboard,
  type LeaderboardEntry,
  type LeaderboardWindow,
} from "@/lib/db";
import {
  acquireLeaderboardRefresh,
  LEADERBOARD_FRESH_MS,
  getCachedLeaderboard,
  setCachedLeaderboard,
  type LeaderboardCacheView,
} from "@/lib/redis";

// One source of truth for "how many rows a board holds". The full /leaderboard
// page wants the long list; the home page slices what it needs off the same
// cached payload, so both share a single Redis entry per (view, window).
export const LEADERBOARD_LIMIT = 500;

const fetchers: Record<
  LeaderboardCacheView,
  (limit: number, window: LeaderboardWindow) => Promise<LeaderboardEntry[]>
> = {
  trending: (limit, window) => getTrendingLeaderboard(limit, undefined, window),
  score: (limit, window) => getLeaderboard(limit, undefined, window),
  heat: (limit, window) => getHeatLeaderboard(limit, undefined, window),
  progress: (limit, window) => getProgressLeaderboard(limit, window),
};

// In-process single-flight: when the cache expires, a burst of concurrent
// requests would otherwise ALL run the heavy triple JOIN (cache stampede). We
// dedupe per (view, window) within a function instance so only the first miss
// queries the DB; the rest await the same promise. Fluid Compute reuses
// instances across concurrent requests, so this absorbs most of the herd.
const inflight = new Map<string, Promise<{ entries: LeaderboardEntry[]; cached: boolean }>>();

/**
 * Cache-aside leaderboard read shared by /leaderboard (SSR) and the
 * /api/leaderboard route (which the homepage rail fetches client-side). A hit
 * serves entirely from Redis — no DB query — so the expensive triple LEFT JOIN
 * only runs once per (view, window) per TTL, and concurrent misses are
 * coalesced into a single query.
 */
export async function getLeaderboardCached(
  view: LeaderboardCacheView = "trending",
  window: LeaderboardWindow = "all",
): Promise<{ entries: LeaderboardEntry[]; cached: boolean }> {
  const key = `${view}:${window}`;
  const cached = await getCachedLeaderboard(view, window);
  if (cached && Date.now() - cached.at < LEADERBOARD_FRESH_MS) {
    return { entries: cached.entries, cached: true };
  }

  const refresh = () => {
    const existing = inflight.get(key);
    if (existing) return existing;
    const run = (async () => {
      try {
        if (cached && !(await acquireLeaderboardRefresh(view, window))) {
          return { entries: cached.entries, cached: true };
        }
        const entries = await fetchers[view](LEADERBOARD_LIMIT, window);
        if (entries.length > 0) await setCachedLeaderboard(entries, view, window);
        return entries.length || !cached
          ? { entries, cached: false }
          : { entries: cached.entries, cached: true };
      } catch (error) {
        if (cached) return { entries: cached.entries, cached: true };
        throw error;
      }
    })();
    inflight.set(key, run);
    void run.finally(() => inflight.delete(key)).catch(() => {});
    return run;
  };

  if (cached) {
    // Keep background work alive on Workers. Outside a Worker request (tests,
    // scripts, other hosts), await it rather than starting an untracked task.
    try {
      const ctx = getCloudflareContext().ctx;
      if (ctx) {
        ctx.waitUntil(refresh());
        return { entries: cached.entries, cached: true };
      }
    } catch { /* no Worker request context */ }
  }
  return refresh();
}
