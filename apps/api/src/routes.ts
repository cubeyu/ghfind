/**
 * Route modules served by this Worker. Each is the Next app's own route module
 * under src/app/api — the same handler code runs on both stacks until the Next
 * app is retired (P5). Every exported HTTP method is mounted (index.ts).
 *
 * Batches: 1 read-only JSON, 2 README/social images, 3 auth and account.
 */
import * as accountToken from "@/app/api/account/tokens/[id]/route";
import * as accountTokens from "@/app/api/account/tokens/route";
import * as authCallbackGithub from "@/app/api/auth/callback/github/route";
import * as authGithub from "@/app/api/auth/github/route";
import * as authSignout from "@/app/api/auth/signout/route";
import * as badge from "@/app/api/badge/[username]/route";
import * as campaignLeaderboard from "@/app/api/campaigns/[campaign]/leaderboard/route";
import * as card from "@/app/api/card/[username]/route";
import * as miniCard from "@/app/api/card/mini/[username]/route";
import * as vsCard from "@/app/api/card/vs/[a]/[b]/route";
import * as developers from "@/app/api/developers/route";
import * as facetRank from "@/app/api/facet-rank/[username]/route";
import * as leaderboard from "@/app/api/leaderboard/route";
import * as materialCard from "@/app/api/material-card/[username]/route";
import * as me from "@/app/api/me/route";
import * as ogBlog from "@/app/api/og/blog/[slug]/route";
import * as ogHome from "@/app/api/og/home/route";
import * as searchUsers from "@/app/api/search-users/route";
import * as sponsors from "@/app/api/sponsors/route";
import * as stats from "@/app/api/stats/route";
import * as talent from "@/app/api/talent/route";

export interface ApiRoute {
  /** Hono path pattern. */
  path: string;
  /** The Next route module; its exported GET/POST/… become handlers. */
  module: object;
}

export const API_ROUTES: ApiRoute[] = [
  // Batch 1: read-only JSON.
  { path: "/api/leaderboard", module: leaderboard },
  { path: "/api/stats", module: stats },
  { path: "/api/search-users", module: searchUsers },
  { path: "/api/developers", module: developers },
  { path: "/api/talent", module: talent },
  { path: "/api/sponsors", module: sponsors },
  { path: "/api/facet-rank/:username", module: facetRank },
  { path: "/api/campaigns/:campaign/leaderboard", module: campaignLeaderboard },
  // Batch 2: README-embedded / social images.
  { path: "/api/badge/:username", module: badge },
  { path: "/api/card/mini/:username", module: miniCard },
  { path: "/api/material-card/:username", module: materialCard },
  { path: "/api/card/:username", module: card },
  { path: "/api/card/vs/:a/:b", module: vsCard },
  { path: "/api/og/home", module: ogHome },
  { path: "/api/og/blog/:slug", module: ogBlog },
  // Batch 3: GitHub OAuth session and account API tokens.
  { path: "/api/auth/github", module: authGithub },
  { path: "/api/auth/callback/github", module: authCallbackGithub },
  { path: "/api/auth/signout", module: authSignout },
  { path: "/api/me", module: me },
  { path: "/api/account/tokens", module: accountTokens },
  { path: "/api/account/tokens/:id", module: accountToken },
];
