/**
 * ghfind-coord: hosts the Durable Objects that replace Upstash Redis for
 * coordination. Callers bind the classes cross-script (`script_name`); the
 * Worker itself serves nothing.
 */
export { RateLimiter } from "./rate-limiter";

export default {
  fetch(): Response {
    return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler;
