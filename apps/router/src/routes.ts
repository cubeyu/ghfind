import { splitLocale } from "@ghfind/i18n";

export type Target = "web" | "legacy";

/**
 * Migration route table: which Worker serves each path. Page rules match the
 * locale-agnostic path (`/en/about` and `/about` both match `/about`), so one
 * rule covers all nine locales. Anything unmatched stays on the legacy Next
 * Worker. To roll a page back, delete its rule (or set ROUTER_FORCE_LEGACY).
 */
const WEB_PAGES: readonly string[] = [
  "/about",
];

/** Build output of the Astro app (hashed JS/CSS). */
const WEB_PREFIXES: readonly string[] = ["/_astro/"];

export function pickTarget(pathname: string): Target {
  if (WEB_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return "web";
  const { path } = splitLocale(pathname);
  return WEB_PAGES.includes(path) ? "web" : "legacy";
}
