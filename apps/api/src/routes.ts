/**
 * Batches 1 (read-only) and 2a (SVG images) of the API migration. Each handler is the Next app's own
 * route module under src/app/api — they use only web-standard Request/Response,
 * so both stacks run the same code until the Next app is retired (P5).
 */
import * as badge from "@/app/api/badge/[username]/route";
import * as miniCard from "@/app/api/card/mini/[username]/route";
import * as campaignLeaderboard from "@/app/api/campaigns/[campaign]/leaderboard/route";
import * as developers from "@/app/api/developers/route";
import * as facetRank from "@/app/api/facet-rank/[username]/route";
import * as leaderboard from "@/app/api/leaderboard/route";
import * as materialCard from "@/app/api/material-card/[username]/route";
import * as searchUsers from "@/app/api/search-users/route";
import * as sponsors from "@/app/api/sponsors/route";
import * as stats from "@/app/api/stats/route";
import * as talent from "@/app/api/talent/route";

type Handler = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Response | Promise<Response>;

export interface ApiRoute {
  /** Hono path pattern. */
  path: string;
  GET: Handler;
}

export const API_ROUTES: ApiRoute[] = [
  { path: "/api/leaderboard", GET: leaderboard.GET },
  { path: "/api/stats", GET: stats.GET },
  { path: "/api/search-users", GET: searchUsers.GET },
  { path: "/api/developers", GET: developers.GET },
  { path: "/api/talent", GET: talent.GET },
  { path: "/api/sponsors", GET: sponsors.GET },
  { path: "/api/facet-rank/:username", GET: facetRank.GET as Handler },
  { path: "/api/campaigns/:campaign/leaderboard", GET: campaignLeaderboard.GET as Handler },
  // Batch 2a: README-embedded SVG images (the PNG cards need a new renderer).
  { path: "/api/badge/:username", GET: badge.GET as Handler },
  { path: "/api/card/mini/:username", GET: miniCard.GET as Handler },
  { path: "/api/material-card/:username", GET: materialCard.GET as Handler },
];
