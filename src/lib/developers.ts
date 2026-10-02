/**
 * Cache-aside reads for the /developers directory, mirroring lib/leaderboard.ts.
 *
 * Both the category grid and each per-bucket developer list are served from
 * Redis first; a miss runs the DB query once, primes the cache, and — crucially —
 * is de-duped in-process (single-flight) so a burst of concurrent misses on the
 * same key collapses to one query instead of a stampede of GROUP BYs. This is the
 * layer the page and API route call; they never touch db.ts directly.
 */
import {
  getDevelopersByFacet,
  getFacetCategories,
  getFacetRank,
  type FacetCategory,
  type FacetRank,
  type LeaderboardEntry,
} from "@/lib/db";
import type { FacetType } from "@/lib/facets";
import {
  getCachedFacetCategories,
  getCachedFacetDevelopers,
  getCachedFacetRank,
  setCachedFacetCategories,
  setCachedFacetDevelopers,
  setCachedFacetRank,
} from "@/lib/redis";

const categoriesInflight = new Map<string, Promise<FacetCategory[]>>();
const developersInflight = new Map<string, Promise<LeaderboardEntry[]>>();

/** Directory categories for a facet type, cache-aside + single-flight. */
export async function getFacetCategoriesCached(
  type: FacetType,
): Promise<FacetCategory[]> {
  const cached = await getCachedFacetCategories(type);
  if (cached) return cached;

  const existing = categoriesInflight.get(type);
  if (existing) return existing;

  const run = (async () => {
    const categories = await getFacetCategories(type);
    // Never cache an empty result: an empty array is truthy, so caching it would
    // pin the "no categories yet" state for a full TTL even after a backfill just
    // populated the table. Empty means the directory is cold; the query on an
    // empty facets table is trivial, and single-flight already covers a burst.
    if (categories.length > 0) await setCachedFacetCategories(type, categories);
    return categories;
  })();
  categoriesInflight.set(type, run);
  try {
    return await run;
  } finally {
    categoriesInflight.delete(type);
  }
}

/** The head of one directory bucket, cache-aside + single-flight. */
export async function getDevelopersByFacetCached(
  type: FacetType,
  value: string,
): Promise<LeaderboardEntry[]> {
  const cached = await getCachedFacetDevelopers(type, value);
  if (cached) return cached;

  const key = `${type}:${value}`;
  const existing = developersInflight.get(key);
  if (existing) return existing;

  const run = (async () => {
    const entries = await getDevelopersByFacet(type, value);
    // See getFacetCategoriesCached: don't cache an empty bucket, so a freshly
    // backfilled bucket appears immediately instead of after the TTL.
    if (entries.length > 0) await setCachedFacetDevelopers(type, value, entries);
    return entries;
  })();
  developersInflight.set(key, run);
  try {
    return await run;
  } finally {
    developersInflight.delete(key);
  }
}

const rankInflight = new Map<string, Promise<FacetRank | null>>();

/** A developer's language-board position, cache-aside + single-flight. */
export async function getFacetRankCached(
  username: string,
  score: number,
): Promise<FacetRank | null> {
  const uname = username.toLowerCase();
  const cached = await getCachedFacetRank(uname, score);
  if (cached) return cached.value;

  const key = `${uname}:${score}`;
  const existing = rankInflight.get(key);
  if (existing) return existing;

  const run = (async () => {
    const value = await getFacetRank(uname, score);
    // getFacetRank swallows DB errors into null, so a null can't be told apart
    // from "no rank" — only cache real ranks, never a possible failure.
    if (value) await setCachedFacetRank(uname, score, value);
    return value;
  })();
  rankInflight.set(key, run);
  try {
    return await run;
  } finally {
    rankInflight.delete(key);
  }
}
