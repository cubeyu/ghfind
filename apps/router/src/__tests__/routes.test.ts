import { describe, expect, it } from "vitest";
import { pickTarget } from "../routes";

describe("pickTarget", () => {
  it("serves migrated pages from web in every locale", () => {
    expect(pickTarget("/about")).toBe("web");
    expect(pickTarget("/en/about")).toBe("web");
    expect(pickTarget("/zh/about")).toBe("web");
    expect(pickTarget("/ar/about")).toBe("web");
  });

  it("serves the P2 content pages from web in every locale, markdown twins and the rest from legacy", () => {
    for (const p of ["/blog", "/en/blog", "/ja/blog/who-builds-dify", "/blog/who-builds-dify", "/collections", "/ar/collections", "/en/collections/bojie-li",
      "/contact", "/en/privacy", "/ja/methodology", "/docs", "/ko/github-bot", "/sponsor"]) {
      expect(pickTarget(p)).toBe("web");
    }
    for (const p of ["/blog/who-builds-dify.md", "/en/blog/x.md", "/blog/a/b", "/collections/a/b", "/blogs", "/en/collectionsx", "/docs/x", "/integrations", "/sponsor/x"]) {
      expect(pickTarget(p)).toBe("legacy");
    }
  });

  it("serves Astro build assets from web", () => {
    expect(pickTarget("/_astro/index.abc123.js")).toBe("web");
  });

  it("serves migrated API routes from api, by whole path only", () => {
    for (const p of ["/api/leaderboard", "/api/stats", "/api/search-users", "/api/developers", "/api/talent", "/api/sponsors", "/api/facet-rank/torvalds", "/api/campaigns/advx/leaderboard"]) {
      expect(pickTarget(p)).toBe("api");
    }
    for (const p of ["/api/talent/123/x", "/api/campaigns/advx/leaderboard/events/x", "/api/leaderboard/x", "/api/facet-rank", "/api/does-not-exist", "/en/api/stats"]) {
      expect(pickTarget(p)).toBe("legacy");
    }
  });

  it("serves the image endpoints from api, by whole path only", () => {
    for (const p of ["/api/badge/torvalds", "/api/card/mini/torvalds", "/api/material-card/torvalds", "/api/card/torvalds", "/api/card/vs/a/b", "/api/og/home", "/api/og/blog/x"]) {
      expect(pickTarget(p)).toBe("api");
    }
    // Like Next, a bare /api/card/mini is the card of a user named "mini".
    expect(pickTarget("/api/card/mini")).toBe("api");
    for (const p of ["/api/card/vs/a", "/api/card/vs/a/b/c", "/api/og", "/api/og/other", "/api/og/blog/x/y", "/api/badge/a/b"]) {
      expect(pickTarget(p)).toBe("legacy");
    }
  });

  it("serves the auth and account routes from api, by whole path only", () => {
    for (const p of ["/api/auth/github", "/api/auth/callback/github", "/api/auth/signout", "/api/me", "/api/account/tokens", "/api/account/tokens/0b1c2d3e-0000-4000-8000-000000000000"]) {
      expect(pickTarget(p)).toBe("api");
    }
    for (const p of ["/api/auth", "/api/auth/gitlab", "/api/auth/callback/gitlab", "/api/me/x", "/api/account", "/api/account/tokens/a/b"]) {
      expect(pickTarget(p)).toBe("legacy");
    }
  });

  it("serves the social, resume and API index routes from api, by whole path only", () => {
    for (const p of ["/api", "/api/blog-comments/who-builds-dify", "/api/collection-comments/x", "/api/profile-comments/torvalds", "/api/profile-reactions/torvalds", "/api/follows", "/api/follows/torvalds", "/api/resumes", "/api/talent/123"]) {
      expect(pickTarget(p)).toBe("api");
    }
    for (const p of ["/api/", "/en/api", "/api/blog-comments", "/api/follows/a/b", "/api/resumes/1", "/api/profile-reactions"]) {
      expect(pickTarget(p)).toBe("legacy");
    }
  });

  it("serves scoring, scans, LLM and job routes from api; Feed stays on legacy", () => {
    for (const p of ["/api/score/torvalds", "/api/scan", "/api/roast", "/api/vs-verdict", "/api/project-analyses", "/api/project-analyses/abc", "/api/campaigns/advx/leaderboard/events", "/api/profile/backfill", "/api/admin/backfill-facets", "/api/admin/backfill-scores", "/api/internal/project-analyses/reconcile"]) {
      expect(pickTarget(p)).toBe("api");
    }
    for (const p of ["/api/feed/projects", "/api/feed/events", "/api/internal/feed/reconcile", "/api/admin/backfill-other", "/api/scan/x", "/api/score", "/api/profile"]) {
      expect(pickTarget(p)).toBe("legacy");
    }
  });

  it("keeps everything else on legacy", () => {
    for (const p of ["/", "/en", "/about/team", "/aboutx", "/u/torvalds", "/api/score/x/y", "/_next/static/x.js", "/favicon.ico", "/mcp"]) {
      expect(pickTarget(p)).toBe("legacy");
    }
  });
});
