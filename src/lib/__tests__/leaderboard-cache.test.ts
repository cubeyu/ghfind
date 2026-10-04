import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getTrendingLeaderboard: vi.fn(), getLeaderboard: vi.fn(),
  getHeatLeaderboard: vi.fn(), getProgressLeaderboard: vi.fn(),
  getCachedLeaderboard: vi.fn(), setCachedLeaderboard: vi.fn(),
  acquireLeaderboardRefresh: vi.fn(), waitUntil: vi.fn(), worker: false,
}));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: () => {
  if (!mocks.worker) throw new Error("No request");
  return { ctx: { waitUntil: mocks.waitUntil } };
} }));
vi.mock("@/lib/db", () => ({
  getTrendingLeaderboard: mocks.getTrendingLeaderboard, getLeaderboard: mocks.getLeaderboard,
  getHeatLeaderboard: mocks.getHeatLeaderboard, getProgressLeaderboard: mocks.getProgressLeaderboard,
}));
vi.mock("@/lib/redis", () => ({
  getCachedLeaderboard: mocks.getCachedLeaderboard, setCachedLeaderboard: mocks.setCachedLeaderboard,
  acquireLeaderboardRefresh: mocks.acquireLeaderboardRefresh, LEADERBOARD_FRESH_MS: 300_000,
}));
import { getLeaderboardCached } from "@/lib/leaderboard";
const old = [{ username: "old" }];
beforeEach(() => {
  vi.resetAllMocks(); mocks.worker = false;
  mocks.getCachedLeaderboard.mockResolvedValue(null);
  mocks.setCachedLeaderboard.mockResolvedValue(undefined);
  mocks.acquireLeaderboardRefresh.mockResolvedValue(true);
});
describe("getLeaderboardCached", () => {
  it("caches a non-empty fetch", async () => {
    mocks.getTrendingLeaderboard.mockResolvedValue([{ username: "a" }]);
    expect((await getLeaderboardCached()).entries).toHaveLength(1);
    expect(mocks.setCachedLeaderboard).toHaveBeenCalledOnce();
  });
  it("does not cache a failed/empty cold fetch", async () => {
    mocks.getTrendingLeaderboard.mockResolvedValue([]);
    expect((await getLeaderboardCached()).entries).toEqual([]);
    expect(mocks.setCachedLeaderboard).not.toHaveBeenCalled();
  });
  it("serves fresh cache without a query or refresh lease", async () => {
    mocks.getCachedLeaderboard.mockResolvedValue({ entries: old, at: Date.now() });
    expect(await getLeaderboardCached()).toEqual({ entries: old, cached: true });
    expect(mocks.getTrendingLeaderboard).not.toHaveBeenCalled();
    expect(mocks.acquireLeaderboardRefresh).not.toHaveBeenCalled();
  });
  it("serves stale data when another isolate owns the refresh", async () => {
    mocks.getCachedLeaderboard.mockResolvedValue({ entries: old, at: 0 });
    mocks.acquireLeaderboardRefresh.mockResolvedValue(false);
    expect((await getLeaderboardCached()).entries).toEqual(old);
    expect(mocks.getTrendingLeaderboard).not.toHaveBeenCalled();
  });
  it.each([[], new Error("DB down")])("preserves stale data when refresh fails: %s", async outcome => {
    mocks.getCachedLeaderboard.mockResolvedValue({ entries: old, at: 0 });
    if (outcome instanceof Error) mocks.getTrendingLeaderboard.mockRejectedValue(outcome);
    else mocks.getTrendingLeaderboard.mockResolvedValue(outcome);
    expect((await getLeaderboardCached()).entries).toEqual(old);
    expect(mocks.setCachedLeaderboard).not.toHaveBeenCalled();
  });
  it("responds with stale data while waitUntil keeps one refresh alive", async () => {
    mocks.worker = true;
    mocks.getCachedLeaderboard.mockResolvedValue({ entries: old, at: 0 });
    let finish!: (value: unknown) => void;
    mocks.getTrendingLeaderboard.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const responses = await Promise.all([getLeaderboardCached(), getLeaderboardCached()]);
    expect(responses.every(result => result.entries === old)).toBe(true);
    expect(mocks.getTrendingLeaderboard).toHaveBeenCalledOnce();
    finish([{ username: "new" }]);
    await Promise.all(mocks.waitUntil.mock.calls.map(([promise]) => promise));
    expect(mocks.setCachedLeaderboard).toHaveBeenCalledOnce();
  });
});
