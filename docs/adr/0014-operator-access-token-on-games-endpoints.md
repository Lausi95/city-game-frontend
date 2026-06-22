# Operator calls carry the Keycloak access token; `/games/**` is uniformly authenticated

The backend now requires an OAuth bearer token on **all** `/games/**` endpoints. The frontend attaches the operator's Keycloak **`access_token`** to every such call, refreshes it silently, and re-enables the middleware so an unauthenticated operator is bounced to Keycloak. There is **no** public exception under `/games/**` — participants never call it (see ADR 0015).

## Context

`/games/**` is the backend's whole game-management surface. The frontend hit it tokenless from two server-side call sites — the admin route handlers under `/api/admin/games/**`, and the `backend.ts` server reads (`fetchGame/fetchMap/fetchTeams/fetchAgents/fetchGames`) used by the `/admin` server components. `proxy.ts` was a no-op ("auth disabled for local development"). Keycloak login persisted only the `id_token`, and only for federated logout.

The backend enforcement is **already live**, so the admin surface is already broken against a real backend (tokenless `/games/**` → 401). This ADR is the catch-up, not an ahead-of-time change; frontend-first sequencing is moot.

"OAuth token" means the OAuth 2.0 **`access_token`**, not the OIDC `id_token` — the access token is the credential a resource server validates; the id token authenticates *who logged in* and is for the client.

## Decision

1. **Access token, Bearer.** All `/games/**` calls carry `Authorization: Bearer <access_token>`. A single server-side `authedFetch` helper reads the token **from the encrypted session cookie via `getToken`** (not from the session) and, if there is none, returns **401** rather than calling the backend tokenless. `backend.ts`'s `get()` is built on it, and the admin route handlers use it — the "no token" rule lives in one place. The access token is **never mapped into the NextAuth session**, so it is not returned by `/api/auth/session` and cannot be read by client-side JS; only `id_token` (logout) and a refresh-error flag are exposed to the client.

2. **Silent refresh.** The `jwt` callback persists `access_token`, `refresh_token`, and `expires_at`, returns the token unchanged while valid, and POSTs to Keycloak's token endpoint to refresh once expired. A refresh failure is flagged on the token so the next request forces re-login. The `id_token` is kept unchanged for `/api/auth/federated-logout` and is **never** sent to the backend.

3. **Middleware re-enabled** on the existing matcher (`/admin` + `/api/admin`), with behaviour keyed on the path:
   - `/admin/*` (page nav) → redirect to `/auth/signin?callbackUrl=<original-url>`, which auto-fires `signIn("keycloak")` and returns the operator to the page they wanted (today the callback hardcodes `/`).
   - `/api/admin/*` (fetch) → **401 JSON, never a 302** — a redirect to an HTML login would be followed by `fetch()` and corrupt the response. This pairs with `authedFetch`'s 401 as defense-in-depth.
   
   Enforcement is real — no dev bypass.

4. **No public exception under `/games/**`.** The rule is absolute. The one participant flow that touched the prefix (the agent out-of-bounds map) is moved off it — see ADR 0015.

## Consequences

- Local dev now requires the Keycloak env vars (already documented in `CLAUDE.md`).
- The refresh path is load-bearing: a revoked or expired Keycloak SSO session bounces the operator to re-login mid-work.
- Re-enabling the middleware reverses the "auth disabled for local development" no-op in `proxy.ts`; the matcher already described this policy (see ADR 0004).
- **Relies on Keycloak refresh-token rotation being _disabled_.** A single admin page load fans out several concurrent `getToken`/`auth()` calls (4 `backend.ts` reads + middleware), and on expiry each refreshes with the *same* refresh token. With rotation/reuse-detection off this is merely a few redundant refreshes; with it **on**, the concurrent reuses would trip reuse-detection and revoke the session, bouncing the operator every ~5 min. If rotation is ever enabled, add single-flight refresh and stop refreshing from the (un-persistable) server-component reads.
