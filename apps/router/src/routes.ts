import { splitLocale } from "@ghfind/i18n";

export type Target = "web" | "api" | "legacy";

/**
 * Migration route table: which Worker serves each path. Anything unmatched
 * stays on the legacy Next Worker. To roll a route back, delete its rule (or
 * set ROUTER_FORCE_LEGACY to send everything to legacy).
 */

/**
 * Pages served by the Astro Worker. Rules match the locale-agnostic path
 * (`/en/about` and `/about` both match `/about`), so one rule covers all nine
 * locales.
 */
const WEB_PAGES: readonly string[] = [
  "/about",
];

/** Build output of the Astro app (hashed JS/CSS). */
const WEB_PREFIXES: readonly string[] = ["/_astro/"];

/**
 * API routes served by the Hono Worker (P1 batches 1–5). Whole-path
 * patterns, never prefixes: sibling routes such as /api/talent/:id and
 * /api/campaigns/:c/leaderboard/events are not migrated yet.
 */
const API_ROUTES: readonly RegExp[] = [
  /^\/api\/leaderboard$/,
  /^\/api\/stats$/,
  /^\/api\/search-users$/,
  /^\/api\/developers$/,
  /^\/api\/talent$/,
  /^\/api\/sponsors$/,
  /^\/api\/facet-rank\/[^/]+$/,
  /^\/api\/campaigns\/[^/]+\/leaderboard$/,
  // Batch 2: README-embedded / social images (SVG badges and cards, PNG
  // cards and OG images rendered with the same @vercel/og as next/og).
  /^\/api\/badge\/[^/]+$/,
  /^\/api\/card\/mini\/[^/]+$/,
  /^\/api\/material-card\/[^/]+$/,
  /^\/api\/card\/[^/]+$/,
  /^\/api\/card\/vs\/[^/]+\/[^/]+$/,
  /^\/api\/og\/home$/,
  /^\/api\/og\/blog\/[^/]+$/,
  // Batch 3: GitHub OAuth session cookies and account API tokens.
  /^\/api\/auth\/github$/,
  /^\/api\/auth\/callback\/github$/,
  /^\/api\/auth\/signout$/,
  /^\/api\/me$/,
  /^\/api\/account\/tokens$/,
  /^\/api\/account\/tokens\/[^/]+$/,
  // Batch 4: comments, reactions, follows, resumes, talent detail, API index.
  /^\/api$/,
  /^\/api\/blog-comments\/[^/]+$/,
  /^\/api\/collection-comments\/[^/]+$/,
  /^\/api\/profile-comments\/[^/]+$/,
  /^\/api\/profile-reactions\/[^/]+$/,
  /^\/api\/follows$/,
  /^\/api\/follows\/[^/]+$/,
  /^\/api\/resumes$/,
  /^\/api\/talent\/[^/]+$/,
  // Batch 5: scoring, scans, LLM roasts/verdicts, project analyses, campaign
  // SSE, profile backfill, admin/internal jobs. (Feed stays on legacy: its
  // rollout is switched and verified on the legacy Worker by the release.)
  /^\/api\/score\/[^/]+$/,
  /^\/api\/scan$/,
  /^\/api\/roast$/,
  /^\/api\/vs-verdict$/,
  /^\/api\/project-analyses$/,
  /^\/api\/project-analyses\/[^/]+$/,
  /^\/api\/campaigns\/[^/]+\/leaderboard\/events$/,
  /^\/api\/profile\/backfill$/,
  /^\/api\/admin\/backfill-(facets|profiles|repos|scores)$/,
  /^\/api\/internal\/project-analyses\/reconcile$/,
];

export function pickTarget(pathname: string): Target {
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    return API_ROUTES.some((re) => re.test(pathname)) ? "api" : "legacy";
  }
  if (WEB_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return "web";
  const { path } = splitLocale(pathname);
  return WEB_PAGES.includes(path) ? "web" : "legacy";
}
