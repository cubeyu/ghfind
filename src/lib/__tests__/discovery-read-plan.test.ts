import { createClient, type InArgs } from "@libsql/client";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SCORE_CACHE_VERSION } from "../cache-version";
import type { D1DatabaseLike } from "../d1-client";
import type { SubScores } from "../types";

const state = vi.hoisted(() => ({
  binding: null as D1DatabaseLike | null,
  cache: new Map<string, string[]>(),
  fail: false,
}));
vi.mock("../d1-client", async original => ({
  ...await original<typeof import("../d1-client")>(), getD1Binding: () => state.binding,
}));
vi.mock("../redis", async original => ({
  ...await original<typeof import("../redis")>(),
  getCachedSimilarUsernames: async (key: string) => state.cache.get(key) ?? null,
  setCachedSimilarUsernames: async (key: string, names: string[]) => { state.cache.set(key, names); },
}));
const client = createClient({ url: "file::memory:" });
const statements: { sql: string; args: unknown[] }[] = [];
const subScores: SubScores = {
  account_maturity: 10, original_project_quality: 18, contribution_quality: 20,
  ecosystem_impact: 15, community_influence: 8, activity_authenticity: 10,
};
let db: typeof import("../db");
beforeAll(async () => {
  await client.executeMultiple(`
    CREATE TABLE scores (
      username TEXT PRIMARY KEY, display_name TEXT, avatar_url TEXT, profile_url TEXT,
      final_score REAL, tier TEXT, tags TEXT, score_version TEXT, sub_scores TEXT,
      hidden INTEGER DEFAULT 0, scanned_at INTEGER
    );
    CREATE TABLE account_stats (username TEXT PRIMARY KEY, lookup_count INTEGER, last_lookup_at INTEGER);
    CREATE TABLE account_lookup_limits (username TEXT, ip_hash TEXT, last_counted_at INTEGER,
      PRIMARY KEY(username, ip_hash));
    CREATE INDEX idx_scores_hidden_score ON scores(hidden, final_score DESC);
    CREATE INDEX idx_account_lookup_limits_counted_user ON account_lookup_limits(last_counted_at, username);
  `);
  await client.executeMultiple(readFileSync(new URL("../../../migrations/0017_discovery_read_indexes.sql", import.meta.url), "utf8"));
  for (const [name, score, hidden, version, scanned] of [
    ["alice", 90, 0, SCORE_CACHE_VERSION, 30], ["bob", 90, 0, SCORE_CACHE_VERSION, 20],
    ["carol", 85, 0, SCORE_CACHE_VERSION, 10], ["hidden", 100, 1, SCORE_CACHE_VERSION, 50],
    ["old", 100, 0, "old", 50], ["low", 50, 0, SCORE_CACHE_VERSION, 50],
  ] as const) {
    await client.execute({ sql: "INSERT INTO scores VALUES(?, ?, NULL, NULL, ?, '顶级', NULL, ?, ?, ?, ?)",
      args: [name, name, score, version, JSON.stringify(subScores), hidden, scanned] });
  }
  const now = Date.now();
  for (const [name, days] of [["alice", 0], ["alice", 2], ["bob", 8], ["carol", 31], ["hidden", 0]] as const) {
    await client.execute({ sql: "INSERT INTO account_lookup_limits VALUES(?,?,?)", args: [name, String(days), now - days * 86400000] });
  }
  await client.executeMultiple(`
    WITH RECURSIVE n(i) AS (VALUES(1) UNION ALL SELECT i+1 FROM n WHERE i<10000)
    INSERT INTO account_lookup_limits SELECT 'unrelated-'||i, 'ip', ${now} FROM n;
    INSERT INTO account_stats VALUES('alice',100,${now}),('bob',3,${now});
  `);
  state.binding = {
    prepare(sql) {
      let args: unknown[] = [];
      const prepared = { bind(...values: unknown[]) { args = values; return prepared; }, async all() {
        statements.push({ sql, args });
        if (state.fail) throw Error("DB down");
        const result = await client.execute({ sql, args: args as InArgs });
        return { results: result.rows.map(row => ({ ...row })), meta: {} };
      } };
      return prepared;
    },
    batch: prepared => Promise.all(prepared.map(statement => statement.all())),
  };
  db = await import("../db");
});
beforeEach(() => { state.cache.clear(); state.fail = false; statements.length = 0; });
afterAll(() => client.close());

describe("bounded score leaderboard", () => {
  it.each(["all", "24h", "7d", "30d"] as const)("matches the previous aggregation for %s", async window => {
    const result = await db.getLeaderboard(2, 60, window);
    const current = statements.at(-1)!;
    const cutoff = current.args.at(-1)!;
    const reference = await client.execute({ sql: `
      SELECT s.username, s.final_score,
        MAX(COALESCE(stats.lookup_count,0),1) AS lookup_count,
        COALESCE(recent.n,0) AS recent_lookup_count
      FROM scores s LEFT JOIN account_stats stats ON stats.username=s.username
      LEFT JOIN (SELECT username, COUNT(*) n FROM account_lookup_limits
        WHERE last_counted_at>=? GROUP BY username) recent ON recent.username=s.username
      WHERE s.hidden=0 AND s.score_version=? AND s.final_score>=60
        ${window === "all" ? "" : "AND recent.n>0"}
      ORDER BY s.final_score DESC,s.scanned_at DESC LIMIT 2`, args: [cutoff as number, SCORE_CACHE_VERSION] });
    expect(result.map(({ username, final_score, lookup_count, recent_lookup_count }) =>
      ({ username, final_score, lookup_count, recent_lookup_count }))).toEqual(reference.rows.map(row => ({ ...row })));
    const plan = await client.execute({ sql: `EXPLAIN QUERY PLAN ${current.sql}`, args: current.args as InArgs });
    const details = plan.rows.map(row => String(row.detail));
    expect(details.some(detail => detail.includes("idx_scores_public_order"))).toBe(true);
    expect(details.some(detail => detail.includes("idx_account_lookup_limits_user_counted") && detail.includes("username=?"))).toBe(true);
    expect(details.some(detail => detail.includes("SCAN l"))).toBe(false);
    expect(details.some(detail => detail.includes("TEMP B-TREE FOR GROUP BY"))).toBe(false);
  });
});

describe("similar recommendation membership cache", () => {
  it("avoids a second candidate scan while keeping order and current stats", async () => {
    const first = await db.getSimilarAccounts("target", 90, subScores, 2);
    statements.length = 0;
    await client.execute("UPDATE account_stats SET lookup_count=101 WHERE username='alice'");
    const second = await db.getSimilarAccounts("TARGET", 90, subScores, 2);
    expect(second.map(entry => entry.username)).toEqual(first.map(entry => entry.username));
    expect(second.find(entry => entry.username === "alice")?.lookup_count).toBe(101);
    expect(statements).toHaveLength(1);
    expect(statements[0].sql).not.toContain("BETWEEN");
    const plan = await client.execute({ sql: `EXPLAIN QUERY PLAN ${statements[0].sql}`, args: statements[0].args as InArgs });
    expect(plan.rows.some(row => String(row.detail).includes("SEARCH s") && String(row.detail).includes("username=?"))).toBe(true);
    expect(plan.rows.some(row => String(row.detail).includes("idx_scores_public_order"))).toBe(false);
  });
  it("filters a newly hidden user on cache hits", async () => {
    const first = await db.getSimilarAccounts("target", 90, subScores, 2);
    const hidden = first[0].username;
    await db.hideUser(hidden);
    try {
      expect((await db.getSimilarAccounts("target", 90, subScores, 2)).some(entry => entry.username === hidden)).toBe(false);
    } finally { await client.execute({ sql: "UPDATE scores SET hidden=0 WHERE username=?", args: [hidden] }); }
  });
  it("changes the key when ranking inputs change and coalesces concurrent cold requests", async () => {
    await Promise.all([db.getSimilarAccounts("target", 90, subScores, 2), db.getSimilarAccounts("target", 90, subScores, 2)]);
    expect(statements.filter(statement => statement.sql.includes("BETWEEN"))).toHaveLength(1);
    await db.getSimilarAccounts("target", 90, { ...subScores, contribution_quality: 25 }, 2);
    expect(statements.filter(statement => statement.sql.includes("BETWEEN"))).toHaveLength(2);
  });
  it("does not cache a database failure", async () => {
    state.fail = true;
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(await db.getSimilarAccounts("target", 90, subScores, 2)).toEqual([]);
      expect(state.cache.size).toBe(0);
    } finally { error.mockRestore(); }
  });
});
