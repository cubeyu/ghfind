import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  store: new Map<string, unknown>(),
  getFacetRank: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getDevelopersByFacet: vi.fn(),
  getFacetCategories: vi.fn(),
  getFacetRank: mocks.getFacetRank,
}));
vi.mock("@/lib/redis", () => ({
  getCachedFacetCategories: vi.fn(),
  getCachedFacetDevelopers: vi.fn(),
  setCachedFacetCategories: vi.fn(),
  setCachedFacetDevelopers: vi.fn(),
  getCachedFacetRank: vi.fn(async (u: string, s: number) => mocks.store.get(`${u}:${s}`) ?? null),
  setCachedFacetRank: vi.fn(async (u: string, s: number, value: unknown) => {
    mocks.store.set(`${u}:${s}`, { value });
  }),
}));

import { getFacetRankCached } from "../developers";

const rank = { facetType: "language", facetValue: "Rust", rank: 3, total: 40, ahead: null };

beforeEach(() => {
  mocks.store.clear();
  mocks.getFacetRank.mockReset();
});

describe("getFacetRankCached", () => {
  it("queries once per username+score and serves repeats from cache", async () => {
    mocks.getFacetRank.mockResolvedValue(rank);
    expect(await getFacetRankCached("OctoCat", 77.7)).toEqual(rank);
    expect(await getFacetRankCached("octocat", 77.7)).toEqual(rank);
    expect(mocks.getFacetRank).toHaveBeenCalledTimes(1);
    expect(mocks.getFacetRank).toHaveBeenCalledWith("octocat", 77.7);
  });

  it("does not cache null, which may be a swallowed DB failure", async () => {
    mocks.getFacetRank.mockResolvedValue(null);
    await getFacetRankCached("octocat", 50);
    await getFacetRankCached("octocat", 50);
    expect(mocks.getFacetRank).toHaveBeenCalledTimes(2);
  });

  it("collapses concurrent misses into one query", async () => {
    mocks.getFacetRank.mockResolvedValue(rank);
    await Promise.all([getFacetRankCached("a", 60), getFacetRankCached("a", 60)]);
    expect(mocks.getFacetRank).toHaveBeenCalledTimes(1);
  });
});
