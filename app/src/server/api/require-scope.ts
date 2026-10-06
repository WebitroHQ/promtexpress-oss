import { NextResponse } from "next/server";
import type { ApiKeyAuth, ApiKeyAuthFail, Scope } from "./bearer-auth";

/**
 * Combined auth-fail / scope-fail short-circuit for /api/v1/* routes.
 *
 * Returns a Response when the request must be rejected, or null when the
 * caller may continue. The "admin" scope implicitly grants every other
 * scope so admin-issued keys do not need a full enumeration.
 */
export function requireScope(
  auth: ApiKeyAuth | ApiKeyAuthFail,
  needed: Scope,
): Response | null {
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (auth.scopes.includes("admin") || auth.scopes.includes(needed)) {
    return null;
  }
  return NextResponse.json(
    { error: `Missing scope: ${needed}` },
    { status: 403 },
  );
}
