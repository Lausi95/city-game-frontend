import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Auth enforced for the operator surface. See docs/adr/0014-operator-access-token-on-games-endpoints.md.
//
// Wrapped with NextAuth's `auth()` so `req.auth` carries the session. When there
// is none, behaviour splits on the path:
//   - /admin/*      (page nav)  → redirect to Keycloak via /auth/signin, preserving
//                                 the requested URL as callbackUrl so login returns there.
//   - /api/admin/*  (fetch)     → 401 JSON, never a redirect (a fetch would follow a
//                                 302 to the HTML login and corrupt the response).
export const proxy = auth((req) => {
  // A failed silent refresh leaves a session with a stale token and an `error`
  // flag — treat it as unauthenticated so the operator is forced to re-login
  // rather than slipping through to backend 401s.
  if (req.auth && !req.auth.error) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const signInUrl = new URL("/auth/signin", req.nextUrl.origin);
  signInUrl.searchParams.set("callbackUrl", req.nextUrl.href);
  return NextResponse.redirect(signInUrl);
});

export const config = {
  /*
   * Protected set only — the operator surface. The root participant page (`/`)
   * and participant API routes (`/api/participant/*`) are deliberately PUBLIC:
   * participants have no Keycloak login, they are identified by IDs carried in
   * X-GameId/X-AgentId/X-TeamId/X-MemberId headers from a setup QR scan.
   * See docs/adr/0004-root-is-public-participant-surface.md.
   *
   * Authentication is the whole of authorization here: any authenticated
   * operator is allowed (no separate admin role).
   */
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
