import { env } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../src/github";
import {
  classifyJev,
  JEV_ENDPOINT,
  JEV_MODEL,
  jevConfigured,
  jevRequest,
  parseJev,
} from "../src/jev";
const KEY = "local-test-key";
const candidates = [
  { name: "问题", description: "Asks how to configure existing software" },
  { name: "bug", description: "Reports broken behavior" },
];
const allowed = candidates.map((label) => label.name);
const definitions = new Map(candidates.map((label) => [label.name, label]));
const jevEnv: Env = {
  ...(env as Env),
  TRIAGE_PROVIDER: "jev",
  OPENROUTER_API_KEY: KEY,
};
const response = (probabilities = [0.97, 0.1]) => ({
  model: `${JEV_MODEL}-20260917`,
  answers: Object.fromEntries(
    probabilities.map((noul, index) => [
      `label_${index}`,
      { type: "noul", noul },
    ]),
  ),
  usage: { input_tokens: 300, output_tokens: 30, cost: 0.0000126 },
});
afterEach(() => vi.unstubAllGlobals());
function mock(value: unknown, status = 200) {
  const fetcher = vi.fn(async () => Response.json(value, { status }));
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}
describe("Jev intent decisions", () => {
  it("preserves PR title and body as state for independent label decisions", () => {
    const sent = jevRequest(
      JEV_MODEL,
      {
        title: "Export public APIs",
        body: "Adds exports and corrects the API authoring rule.\n- [ ] Documentation update required",
        pull_request: {},
      },
      candidates,
    );
    expect(sent.state).toEqual({ kind: "pull request", title: "Export public APIs", body: "Adds exports and corrects the API authoring rule.\n- [ ] Documentation update required" });
    expect(Object.values(sent.questions).map((question) => question.criteria.true)).toEqual(candidates.map((label) => label.description));
    expect(parseJev(response([0.91, 0.87]), candidates, 0.8).labels).toEqual(allowed);
  });

  it("returns no labels for uncertain/negative answers and ranks at most three", () => {
    expect(parseJev(response([0.79, 0]), candidates, 0.8).labels).toEqual([]);
    const many = ["a", "b", "c", "d"].map((name) => ({
      name,
      description: name,
    }));
    expect(
      parseJev(response([0.85, 0.99, 0.9, 0.98]), many, 0.8).labels,
    ).toEqual(["b", "d", "c"]);
  });

  it("rejects missing, extra, unknown IDs, wrong model/types and invalid probabilities", () => {
    for (const value of [
      { ...response(), model: "other-model" },
      { ...response(), model: `${JEV_MODEL}-evil` },
      { ...response(), model: `${JEV_MODEL}-20260917-extra` },
      { ...response(), answers: { label_0: { type: "noul", noul: 1 } } },
      {
        ...response(),
        answers: {
          label_0: { type: "choice", noul: 1 },
          label_1: { type: "noul", noul: 1 },
        },
      },
      {
        ...response(),
        answers: {
          label_0: { type: "noul", noul: 1 },
          bug: { type: "noul", noul: 1 },
        },
      },
      response([1.01, 0]),
      response([-0.1, 0]),
      response([NaN, 0]),
      response([Infinity, 0]),
      { ...response(), usage: { input_tokens: -1, output_tokens: 30 } },
      {
        ...response(),
        usage: { input_tokens: 1, output_tokens: 30, cost: "free" },
      },
    ])
      expect(() => parseJev(value, candidates, 0.8)).toThrow();
  });

  it("requires the exact dated snapshot when one is configured", () => {
    const snapshot = `${JEV_MODEL}-20260917`;
    expect(parseJev(response(), candidates, 0.8, snapshot).model).toBe(
      snapshot,
    );
    for (const model of [
      JEV_MODEL,
      `${JEV_MODEL}-20261007`,
      `${snapshot}-extra`,
    ])
      expect(() =>
        parseJev({ ...response(), model }, candidates, 0.8, snapshot),
      ).toThrow("Unexpected Jev model");
  });

  it("bounds inputs and candidate count before any paid request", () => {
    const sent = jevRequest(
      JEV_MODEL,
      { title: "x".repeat(2000), body: "y".repeat(12000), pull_request: {} },
      candidates,
    );
    expect(sent.state.title.length).toBe(1000);
    expect(sent.state.body.length).toBe(8000);
    expect(sent.state.kind).toBe("pull request");
    expect(() => jevRequest(JEV_MODEL, {}, [])).toThrow();
    expect(() =>
      jevRequest(
        JEV_MODEL,
        {},
        Array.from({ length: 51 }, () => candidates[0]),
      ),
    ).toThrow();
  });

  it("keeps keys and private text out of outage errors", async () => {
    mock({ error: `${KEY} private-body` }, 503);
    const error = await classifyJev(
      jevEnv,
      { body: "private-body" },
      candidates,
      Date.now() + 5000,
    ).catch((value: unknown) => value);
    expect(error).toBeInstanceOf(ApiError);
    expect(String(error)).not.toMatch(/local-test-key|private-body/);
  });
});
