import { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { externalOrigin } from "@/app/lib/origin";
import { logger } from "@/app/lib/logger";

// NextAuth's route-handler path builds the OAuth origin from `req.url`, which in
// the standalone container is the listen address `0.0.0.0:3000`, not the tenant
// domain. We rebuild the request URL from the traefik-forwarded host so both the
// authorization leg and the callback token-exchange leg agree on the external
// origin. See docs/adr/0019-auth-derives-external-origin-from-forwarded-host.md.
function withForwardedOrigin(
  handler: (req: NextRequest) => Promise<Response>,
): (req: NextRequest) => Promise<Response> {
  return (req) => {
    // TEMP (ADR 0019): confirm what traefik actually forwards in prod, then
    // remove. Reachable unauthenticated via /api/auth/providers. At `debug` it is
    // off in prod by default — flip LOG_LEVEL=debug to inspect (ADR 0020).
    logger.debug(
      {
        url: req.url,
        host: req.headers.get("host"),
        "x-forwarded-host": req.headers.get("x-forwarded-host"),
        "x-forwarded-proto": req.headers.get("x-forwarded-proto"),
      },
      "auth forwarded headers",
    );

    const origin = externalOrigin(req.headers);
    if (origin) {
      // Rebuild against the external origin via the base-URL constructor rather
      // than mutating url.host — the host setter keeps the old :3000 port when
      // the new value carries none, which would leak it into the redirect_uri.
      const { pathname, search, hash } = new URL(req.url);
      req = new NextRequest(new URL(pathname + search + hash, origin), req);
    }
    return handler(req);
  };
}

export const GET = withForwardedOrigin(handlers.GET);
export const POST = withForwardedOrigin(handlers.POST);
