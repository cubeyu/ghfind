/**
 * `next/server` shim (wired via the wrangler `alias`): Next's own NextRequest /
 * NextResponse classes, imported from their standalone spec-extension modules
 * so cookie parsing/serialization (@edge-runtime/cookies), redirects and JSON
 * responses are byte-identical to the legacy Worker — without bundling the rest
 * of `next/server`. Add exports here only as route handlers need them.
 */
export { NextRequest } from "next/dist/server/web/spec-extension/request";
export { NextResponse } from "next/dist/server/web/spec-extension/response";
