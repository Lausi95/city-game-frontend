import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Auth disabled for local development
export function proxy(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  /*
   * Protected set only — the operator surface. The root participant page (`/`)
   * and participant API routes (`/api/participant/*`) are deliberately PUBLIC:
   * participants have no Keycloak login, they are identified by IDs carried in
   * X-GameId/X-AgentId/X-TeamId/X-MemberId headers from a setup QR scan.
   * See docs/adr/0004-root-is-public-participant-surface.md.
   *
   * Authentication is the whole of authorization here: any authenticated
   * operator is allowed (no separate admin role). The middleware body is a
   * no-op for local dev; this matcher encodes the intended policy for when
   * auth is re-enabled.
   */
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
