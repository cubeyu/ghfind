/**
 * ghfind-coord: hosts the Durable Objects that replace Upstash Redis for
 * coordination (callers bind the classes cross-script via `script_name`), and
 * runs scheduled housekeeping. The Worker serves no HTTP routes.
 */
import { gcNextCache, type GcBucket } from "./next-cache-gc";

export { RateLimiter } from "./rate-limiter";

interface Env {
  /** The legacy Next Worker's OpenNext incremental cache bucket for this env. */
  NEXT_INC_CACHE_R2_BUCKET?: GcBucket;
  NEXT_CACHE_GC_KEEP_NEWEST?: string;
  NEXT_CACHE_GC_MIN_IDLE_DAYS?: string;
  /** "0" to actually delete; anything else only logs the plan. */
  NEXT_CACHE_GC_DRY_RUN?: string;
}

export default {
  fetch(): Response {
    return new Response(null, { status: 404 });
  },

  async scheduled(_controller, env) {
    const bucket = env.NEXT_INC_CACHE_R2_BUCKET;
    if (!bucket) return;
    const report = await gcNextCache(bucket, {
      root: "incremental-cache/",
      keepNewest: Number(env.NEXT_CACHE_GC_KEEP_NEWEST ?? 3),
      minIdleMs: Number(env.NEXT_CACHE_GC_MIN_IDLE_DAYS ?? 7) * 86_400_000,
      now: Date.now(),
      dryRun: env.NEXT_CACHE_GC_DRY_RUN !== "0",
      // Stay well under the per-invocation subrequest limit; resumes next run.
      maxOps: 900,
    });
    console.log(
      JSON.stringify({
        event: "next_cache_gc",
        dryRun: report.dryRun,
        complete: report.complete,
        ops: report.ops,
        deletedObjects: report.deletedObjects,
        builds: report.builds.length,
        doomed: report.doomed.map((prefix) => {
          const b = report.builds.find((x) => x.prefix === prefix)!;
          return { prefix, objects: b.objects, lastWrite: new Date(b.newestUpload).toISOString() };
        }),
        kept: report.kept.map((prefix) => {
          const b = report.builds.find((x) => x.prefix === prefix)!;
          return { prefix, objects: b.objects, lastWrite: new Date(b.newestUpload).toISOString() };
        }),
      }),
    );
  },
} satisfies ExportedHandler<Env>;
