import { env } from "cloudflare:test";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { Job, putJob, runJob } from "../src/jobs";
import {
  COMMENT_MARKER,
  commentTemplate,
  composeComment,
  LABELS,
} from "../src/review";
import { DEFAULT_SETTINGS, putSettings, RepoSettings } from "../src/settings";
import { pickLabels, sanitizeIntro } from "../src/triage";

declare const TEST_SQL: string[];
const testEnv = env as Env;
const llmEnv: Env = { ...testEnv, LLM_API_KEY: "sk-test" };
const api = "https://api.github.com";
const LLM = "https://api.stepfun.com/v1/chat/completions";
const repo = "AsperforMias/test-bot";
const slug = "ghfind-review-test";
const issuePath = `/repos/${repo}/issues/1`;
interface Route {
  url: string;
  method: string;
  body?: unknown;
  status: number;
  response: unknown;
}
const routes: Route[] = [];
const calls: { url: string; method: string; body: string }[] = [];
let llm: (body: { messages: { content: string }[] }) => Response;
const route = (
  path: string,
  response: unknown,
  method = "GET",
  status = 200,
  body?: unknown,
) => routes.push({ url: api + path, method, status, response, body });
const reply = (content: string) =>
  Response.json({ choices: [{ message: { content } }] });
const llmCalls = () =>
  calls
    .filter((x) => x.url === LLM)
    .map((x) => JSON.parse(x.body) as { messages: { content: string }[] });
const commentCalls = () => calls.filter((x) => x.url.includes("/comments"));
const configure = (value: Partial<RepoSettings>) =>
  putSettings(
    testEnv,
    10,
    100,
    repo,
    { ...DEFAULT_SETTINGS, ...value },
    "admin",
  );
const add = (id: string) =>
  putJob(testEnv, {
    id,
    installation: 10,
    repository: 100,
    full_name: repo,
    pr: 1,
    kind: "label",
  });
const recorded = async () =>
  (
    await testEnv.DB.prepare(
      "SELECT number,label FROM triage_labels WHERE repository=100 ORDER BY label",
    ).all()
  ).results;
const job = (id: string) =>
  testEnv.DB.prepare("SELECT * FROM jobs WHERE id=?").bind(id).first<Job>();
const repoLabels = [
  ...LABELS.map((name) => ({ name, color: "123456", description: "x" })),
  { name: "bug", description: "Something is broken" },
  { name: "feature", description: "A request for new behaviour" },
  { name: "question", description: "Asks for help" },
];
// Everything a first label job reads and writes up to the review label.
function labelJob(
  issue: Record<string, unknown> = {},
  applied: { name: string }[] = [],
) {
  route("/app/installations/10/access_tokens", { token: "t" }, "POST", 201);
  route("/repositories/100", { id: 100, full_name: repo, archived: false });
  route(`/repos/${repo}/labels?per_page=100&page=1`, repoLabels);
  route(issuePath, {
    state: "open",
    title: "Crash on start",
    body: "It crashes.",
    user: { login: "AsperforMias", id: 5 },
    ...issue,
  });
  route(`${issuePath}/labels?per_page=100&page=1`, applied);
  if (!applied.some((x) => x.name === LABELS[2]))
    route(`${issuePath}/labels`, {}, "POST", 200, { labels: [LABELS[2]] });
}
beforeAll(async () => {
  for (const sql of TEST_SQL) await testEnv.DB.prepare(sql).run();
});
beforeEach(async () => {
  await testEnv.DB.exec(
    "DELETE FROM jobs; DELETE FROM author_comment_once; DELETE FROM noscore_comment_budget; DELETE FROM repo_settings; DELETE FROM triage_labels;",
  );
  llm = () => reply('{"labels":[]}');
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const url = String(input);
      const method = init.method ?? "GET";
      const body = typeof init.body === "string" ? init.body : "";
      calls.push({ url, method, body });
      if (url === LLM) return llm(JSON.parse(body));
      const at = routes.findIndex(
        (x) =>
          x.url === url &&
          x.method === method &&
          (x.body === undefined || JSON.stringify(x.body) === body),
      );
      if (at < 0)
        throw new Error(`Unexpected request: ${method} ${url} ${body}`);
      const x = routes.splice(at, 1)[0];
      return new Response(
        x.status === 204 ? null : JSON.stringify(x.response),
        { status: x.status },
      );
    }),
  );
});
afterEach(() => {
  expect(routes.splice(0)).toEqual([]);
  calls.splice(0);
  vi.unstubAllGlobals();
});

describe("triage", () => {
  it("caps picks at three exact names", () => {
    const set = new Set(["a", "b", "c", "d"]);
    expect(pickLabels('{"labels":["A","a","b","c","d"]}', set)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(pickLabels('x {"labels":"a"} {"labels":["a"]}', set)).toEqual([]);
    expect(pickLabels("no json", set)).toEqual([]);
  });


});

describe("comments", () => {
  const template = (score: unknown) =>
    commentTemplate("AsperforMias", score, slug);
  const own = (body: string) => [
    { id: 77, user: { login: `${slug}[bot]`, type: "Bot" }, body },
  ];

  it("neutralizes GH- references, email addresses and commit SHAs", () => {
    const out = sanitizeIntro(
      "See GH-123 and gh-7, mail dev.ops+x@example.co.uk, fixed in a1b2c3d and 0123456789abcdef0123456789abcdef01234567; GH-x stays, cafe and 123456 too.",
    );
    expect(out).toContain("GH-\u200d123");
    expect(out).toContain("gh-\u200d7");
    expect(out).not.toMatch(/example|dev\.ops/);
    expect(out).not.toMatch(/\b[0-9a-f]{7,40}\b/i);
    expect(out).not.toMatch(/\bGH-\d/i);
    expect(out).toContain("a1b2c3\u200dd");
    expect(out.replaceAll("\u200d", "")).toContain(
      "0123456789abcdef0123456789abcdef01234567",
    );
    expect(out).toContain("GH-x stays, cafe and 123456 too.");
    expect(sanitizeIntro("ping @octocat")).toBe("ping @\u200doctocat");
  });
  it("strips a table the model draws itself", () => {
    // Real StepFun output for a cheerful prompt, observed in staging.
    expect(
      sanitizeIntro(
        "Hello! Your score: +----------+-------+ | Author | Score | +----------+-------+ | octocat | 45 |",
      ),
    ).toBe("Hello! Your score: Author Score octocat 45");
  });
  it("drops link targets without leaving stray parentheses", () => {
    expect(sanitizeIntro("See [the docs](https://x.example/a) now.")).toBe(
      "See the docs now.",
    );
    expect(sanitizeIntro("Read (https://x.example) first (really).")).toBe(
      "Read first (really).",
    );
  });

  it("sanitizes intros to bounded plain text", () => {
    const out = sanitizeIntro(`> @a <script>x</script> ${"z".repeat(900)}`);
    expect(out.startsWith("@\u200da x z")).toBe(true);
    expect(Array.from(out).length).toBeLessThanOrEqual(600);
  });
});
