---
status: accepted (supersedes 0021-log-raw-access-token-on-backend-401)
---

# `authedFetch` derives the session-cookie name from the environment, not `AUTH_URL`

`authedFetch` reads the operator's access token from the encrypted session
cookie with `getToken`. `getToken` must look for the cookie under the same name
Auth.js used when it **wrote** it. Auth.js prefixes the name with `__Secure-`
exactly when the cookie was set over https, and `@auth/core` decides that from
the **request protocol** (`useSecureCookies ?? url.protocol === "https:"`), not
from any env var.

The deployment contract pins protocol to environment: production is always https
behind traefik ([ADR 0018](0018-containerized-deployment-behind-traefik.md)) and
local dev is plain http on `localhost:3000`. That is exactly what `NODE_ENV`
encodes, so it reproduces the write path's effective protocol in both
environments:

```ts
const secureCookie = process.env.NODE_ENV === 'production';
```

## The bug this fixes

The previous code derived the cookie name from `AUTH_URL`:

```ts
const secureCookie = (process.env.AUTH_URL ?? '').startsWith('https://');
```

But `AUTH_URL` is **intentionally unset in production** — one container serves
many tenant domains, so the callback URL is derived per-request from the
forwarded host rather than pinned ([ADR 0018](0018-containerized-deployment-behind-traefik.md),
[ADR 0019](0019-auth-derives-external-origin-from-forwarded-host.md)). The two
sides then disagreed:

| | sign-in writes cookie | `authedFetch` read (`secureCookie` from `AUTH_URL`) |
|---|---|---|
| **prod** (https, `AUTH_URL` unset → `false`) | `__Secure-authjs.session-token` | bare `authjs.session-token` → **miss** |
| **dev** (`AUTH_URL=http://localhost:3000` → `false`) | `authjs.session-token` | `authjs.session-token` → match |

In production `getToken` looked for the wrong cookie, found no token, and
`authedFetch` returned its synthetic `401 { detail: "Not authenticated" }` for
every `/games/**` call — even though the operator had a valid Keycloak session.
The middleware `auth()` was unaffected because it reads the cookie through the
NextAuth instance, which uses the correct per-request protocol — which is why
the operator appeared logged in yet every backend call failed ("after Keycloak
auth, the access token is not present"). Dev never reproduced it because
`AUTH_URL` made both sides agree on the bare name.

## Considered options

- **`NODE_ENV === 'production'`** (chosen). The deployment contract makes
  protocol a function of environment (prod=https-behind-traefik, dev=http), so
  this matches the write path's effective protocol in both. Simplest correct
  option; no per-request work, no new dependency.
- **Derive from the forwarded protocol via `externalOrigin`.** Tempting as
  "read and write share one signal," but [`externalOrigin`](../../app/lib/origin.ts)
  defaults `x-forwarded-proto` to `https` when the header is absent — which is
  exactly the local-dev case (`npm run dev` has no proxy, no
  `x-forwarded-proto`). It would compute `secureCookie=true` in dev and look for
  the `__Secure-` cookie that http never wrote, **breaking dev auth**. Rejected:
  it trades a latent theoretical drift for a concrete immediate regression.
- **Pin `AUTH_URL` in prod.** Rejected: directly contradicts the multi-tenant
  forwarded-host design (ADR 0018/0019).

## Consequences

- The synthetic no-token `401` now only fires when the operator genuinely has no
  valid session, restoring `authedFetch`'s intended defense-in-depth role
  ([ADR 0014](0014-operator-access-token-on-games-endpoints.md)).
- `secureCookie` stays a module-level constant (it depends only on `NODE_ENV`),
  so there is no per-request cost.
- **Coupling to note:** this is correct only while the contract "prod is https,
  dev is http" holds. Running the prod build over plain http (or dev over https)
  would reintroduce the mismatch. If that ever becomes a real configuration, the
  signal must move to the actual request protocol — read `x-forwarded-proto`
  directly and fall back to `NODE_ENV` (do **not** route through `externalOrigin`,
  whose `https` default silently breaks the no-header case).
- **Supersedes [ADR 0021](0021-log-raw-access-token-on-backend-401.md).** That
  raw-token logging targeted the backend-returned 401, a path this bug never
  reached, so it never helped — and it weakened the redact backstop and risked
  raw Keycloak tokens reaching Datadog. It is reverted: the
  `accessToken`/`access_token`/`token` entries are restored to the pino `redact`
  list and `logBackendError` no longer carries the token, re-establishing the
  "never log secrets" rule of [ADR 0020](0020-structured-json-logging-with-pino-for-datadog.md).
