import { describe, expect, it } from "vitest";
import { pickTarget } from "../routes";

describe("pickTarget", () => {
  it("serves migrated pages from web in every locale", () => {
    expect(pickTarget("/about")).toBe("web");
    expect(pickTarget("/en/about")).toBe("web");
    expect(pickTarget("/zh/about")).toBe("web");
    expect(pickTarget("/ar/about")).toBe("web");
  });

  it("serves Astro build assets from web", () => {
    expect(pickTarget("/_astro/index.abc123.js")).toBe("web");
  });

  it("serves migrated API routes from api, by whole path only", () => {
    for (const p of ["/api/leaderboard", "/api/stats", "/api/search-users", "/api/developers", "/api/talent", "/api/sponsors", "/api/facet-rank/torvalds", "/api/campaigns/advx/leaderboard"]) {
      expect(pickTarget(p)).toBe("api");
    }
    for (const p of ["/api/talent/123", "/api/campaigns/advx/leaderboard/events", "/api/leaderboard/x", "/api/facet-rank", "/api/score/torvalds", "/api/does-not-exist", "/en/api/stats"]) {
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

  it("keeps everything else on legacy", () => {
    for (const p of ["/", "/en", "/about/team", "/aboutx", "/u/torvalds", "/api/score/x", "/_next/static/x.js", "/favicon.ico", "/mcp"]) {
      expect(pickTarget(p)).toBe("legacy");
    }
  });
});
