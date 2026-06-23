---
status: accepted
---

# Local dev bypasses operator auth, gated on `NODE_ENV`

The operator surface (`/admin`, `/api/admin/*`) requires a Keycloak session
([ADR 0014](0014-operator-access-token-on-games-endpoints.md)): the proxy
redirects unauthenticated page navigations into the Keycloak OAuth flow, and
[`authedFetch`](../../app/lib/authedFetch.ts) returns a synthetic `401` rather
than call the backend without a Bearer token. Locally this means a full Keycloak
round-trip just to open `/admin`, and it makes the surface unusable from headless
or browser-driving tooling that cannot complete an interactive OAuth login. The
local backend does **not** require the operator token, so the friction buys
nothing in dev.

**Decision:** when `NODE_ENV !== 'production'`, bypass operator auth end to end:

- The proxy ([proxy.ts](../../proxy.ts)) lets `/admin` and `/api/admin/*` through
  without a session.
- `authedFetch` omits the `Authorization` header and skips its no-token `401`,
  calling the backend tokenless (tenant headers still attach — see below).
- The operator session is **synthesized** (`{ user: { name: 'Local Dev' } }`) so
  the Header nav renders normally; the logout link is replaced by a static
  "Local Dev" label, since there is no Keycloak session to terminate.

The bypass condition lives in a **single module** so the `NODE_ENV` check is not
scattered; production (`NODE_ENV=production`, baked into the runner image —
[Dockerfile](../../Dockerfile)) is entirely unaffected and behaves exactly as
before.

## Considered options

- **`NODE_ENV !== 'production'`** (chosen). The deployment contract already makes
  `NODE_ENV` a reliable prod discriminator: the runner stage bakes
  `ENV NODE_ENV=production`, the container publishes no host ports and is reachable
  only via traefik ([ADR 0018](0018-containerized-deployment-behind-traefik.md)),
  and there is no staging/preview deployment. The same signal already gates the
  secure-cookie name in `authedFetch`
  ([ADR 0022](0022-secure-cookie-from-request-protocol-not-auth-url.md)), so this
  reuses an established, trusted discriminator and **fails closed** — a shipped
  build is always `production`.
- **A dedicated opt-in flag (e.g. `AUTH_DISABLED=true`).** Rejected: more config
  to set on every dev machine, and it would need a `NODE_ENV` prod hard-guard
  anyway to be safe — at which point `NODE_ENV` alone is sufficient and has no
  footgun to forget.
- **Absence of Keycloak env vars.** Rejected: a misconfigured production (missing
  `AUTH_KEYCLOAK_SECRET`) would then **silently disable auth** rather than fail
  loudly. `NODE_ENV` fails closed; this fails open.

## Consequences

- The synthetic session feeds the **UI only** (the Header). The proxy bypass is a
  plain early-return, not a faked `req.auth`, and `authedFetch` reads no token —
  nothing downstream depends on a forged session object.
- **Tenant resolution is unchanged.** Only the `Authorization` Bearer is dropped;
  `authedFetch` still attaches tenant headers, so local dev keeps sending
  `X-TENANT-OVERRIDE` ([ADR 0017](0017-tenant-from-derived-host-not-relayed-origin.md)).
- `authedFetch`'s no-token `401` retains its defense-in-depth role in production
  ([ADR 0014](0014-operator-access-token-on-games-endpoints.md)); it is simply not
  reached locally.
- **Coupling to note:** this is correct only while `NODE_ENV` is reliably
  `production` in every deployed environment. Introducing a non-prod *deployed*
  environment (staging, preview) would run it with auth disabled — at that point
  the signal must move to an explicit opt-in flag with a `NODE_ENV` prod
  hard-guard.
