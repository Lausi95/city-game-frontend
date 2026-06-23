import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { AUTH_BYPASS } from "@/app/lib/devAuth";

// Auth enforced for the operator surface. See docs/adr/0014-operator-access-token-on-games-endpoints.md.
//
// Wrapped with NextAuth's `auth()` so `req.auth` carries the session. When there
// is none, behaviour splits on the path:
//   - /admin/*      (page nav)  → redirect to Keycloak via /auth/signin, preserving
//                                 the requested URL as callbackUrl so login returns there.
//   - /api/admin/*  (fetch)     → 401 JSON, never a redirect (a fetch would follow a
//                                 302 to the HTML login and corrupt the response).
export const proxy = auth((req) => {
  // Local dev disables operator auth end to end — let the operator surface
  // through with no session. See docs/adr/0036-local-dev-bypasses-operator-auth.md.
  if (AUTH_BYPASS) {
    return NextResponse.next();
  }

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

  // callbackUrl is RELATIVE (pathname + search), never the absolute href. An
  // absolute callbackUrl must survive an origin-string comparison in NextAuth's
  // redirect callback against the baseUrl it derives from the forwarded host;
  // behind traefik that comparison is fragile (host normalization differences),
  // and a mismatch falls back to the root. A leading-slash URL skips the
  // comparison — the redirect callback simply prefixes the external baseUrl — so
  // the operator returns to the page they requested. The /admin fallback in that
  // callback (auth.ts) is the backstop if the callbackUrl is lost entirely.
  // See docs/adr/0019-auth-derives-external-origin-from-forwarded-host.md.
  const signInUrl = new URL("/auth/signin", req.nextUrl.origin);
  signInUrl.searchParams.set(
    "callbackUrl",
    req.nextUrl.pathname + req.nextUrl.search,
  );
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
