/**
 * `next/headers` shim (wired via the wrangler `alias`). Next serves cookies()
 * and headers() from per-request async storage; this Worker does the same
 * with AsyncLocalStorage, entered around every route handler in index.ts.
 * cookies() is read-only here, matching what route handlers rely on.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { RequestCookies } from "next/dist/server/web/spec-extension/cookies";

export const requestStore = new AsyncLocalStorage<Request>();

function current(): Request {
  const request = requestStore.getStore();
  if (!request) throw new Error("next/headers called outside a request");
  return request;
}

export async function cookies() {
  return new RequestCookies(current().headers);
}

export async function headers() {
  return current().headers;
}
