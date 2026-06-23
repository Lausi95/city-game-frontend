# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

No test runner is configured.

## Environment

Copy `.env.local` with these required variables:
```
AUTH_KEYCLOAK_ID=
AUTH_KEYCLOAK_SECRET=
AUTH_KEYCLOAK_ISSUER=    # e.g. https://auth.example.com/realms/city-game
AUTH_URL=                # dev only — e.g. http://localhost:3000; unset in prod (see Deployment)
AUTH_SECRET=
API_URL=                 # backend base URL; defaults to http://localhost:8080
TENANT_OVERRIDE=         # local dev only: tenant to resolve against (see Tenant resolution)
LOG_LEVEL=               # optional; defaults to debug in dev / info in prod (see Logging)
```

## Deployment

Production runs as a Docker container (`Dockerfile`, Next.js standalone output)
on a dedicated server behind traefik (`docker-compose.yml`, shared external
`traefik` network, TLS via Let's Encrypt). Runtime config comes from
`.env.production` on the server (template: `.env.production.example`); secrets are
never baked into the image. See `docs/adr/0018-containerized-deployment-behind-traefik.md`.

Two production-specific contracts to respect:
- **`AUTH_URL` is unset in prod**; `auth.ts` sets `trustHost: true` so the OAuth
  callback URL is derived per-request from the traefik-forwarded host (one
  container serves many tenant domains). Don't re-pin `AUTH_URL`.
- **The container publishes no host ports** — reachable only via traefik. This is
  the security boundary that makes the forwarded-host tenant resolution (ADR 0017)
  safe; a published port would allow tenant spoofing.

## Architecture

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript 5 · Tailwind CSS 4 · NextAuth 5 beta · Leaflet / react-leaflet

### Authentication

All routes are protected by middleware in `proxy.ts`, which wraps NextAuth's `auth()` function. Unauthenticated users are redirected to `/auth/signin`, which immediately triggers `signIn("keycloak")` via a `useEffect`.

The Keycloak `id_token` is stored in the JWT session so that `GET /api/auth/federated-logout` can perform a proper Keycloak-side logout (clears `authjs.*` cookies and redirects to the Keycloak logout endpoint).

The NextAuth config lives in `auth.ts` at the project root.

### App Router layout

- `app/layout.tsx` — root layout; wraps everything in `<Providers>` (SessionProvider) and renders `<Header>`
- `app/providers.tsx` — client-side `SessionProvider` wrapper
- `app/page.tsx` — root **participant** page (public); a client organism reads the `role` from local storage and renders the agent or team-member view (or a "no role set" state). See ADR 0004. Operators use `/admin`, not `/`.
- `app/api/auth/[...nextauth]/route.ts` — NextAuth catch-all handler
- `app/api/auth/federated-logout/route.ts` — custom Keycloak federated logout

### Map components

Map components use `react-leaflet` and must be loaded client-side only. Use `next/dynamic` with `{ ssr: false }` when importing them — Leaflet touches `window` at import time and will break SSR.

`MapSelector` uses the Geolocation API to center on the user's position and lets the user click two points to define a rectangular grid area. Grid lines are drawn with SVG overlays inside the map bounds.

### Admin routes

All administration operations — game management, team creation, and agent administration — live under `/admin`. This path requires Keycloak **authentication**, and that is the whole of the authorization: any authenticated operator is allowed. There is no further admin role to check (see ADR 0004).

The root page (`/`) and participant API routes, by contrast, are **public** — participants have no Keycloak login (they are identified by IDs carried in `X-GameId`/`X-AgentId`/`X-TeamId`/`X-MemberId` headers from a setup QR scan). The public/protected split is encoded in `proxy.ts` (Next.js 16's renamed middleware entrypoint — it is live, not a no-op): `/admin` + `/api/admin/*` require authentication, `/` + `/api/participant/*` do not. In **local dev only** (`NODE_ENV !== 'production'`) operator auth is bypassed end to end — the proxy lets `/admin` through, `authedFetch` drops the Bearer, and the operator session is synthesized for the UI; production is unaffected. See [ADR 0036](docs/adr/0036-local-dev-bypasses-operator-auth.md).

Place admin page components under `app/admin/` and any admin-only API routes under `app/api/admin/`.

### Path alias

`@/*` resolves to the project root (set in `tsconfig.json`).

## Component organization

Components follow **Atomic Design**. Place new components under `app/components/` organized by level:

| Level | Description | Examples |
|-------|-------------|---------|
| `atoms/` | Indivisible UI primitives | Button, Input, Badge, Icon |
| `molecules/` | Small groups of atoms with a single purpose | FormField, SearchBar, MapMarker |
| `organisms/` | Self-contained UI sections composed of molecules/atoms | Header, CreateGameDialog, MapSelector |
| `templates/` | Page-level layout shells (no real data) | DashboardTemplate |

Page components (`app/**/page.tsx`) consume organisms and templates — they should not contain raw atoms directly.

## Backend API

The backend exposes an OpenAPI 3 spec at **`http://localhost:8080/v3/api-docs`** (requires the backend running locally). Use this as the authoritative reference for available endpoints, request/response schemas, and error codes when building or modifying frontend API calls.

### Tenant resolution

The backend resolves the **tenant** (the per-customer verification boundary — see CONTEXT.md → Tenant and ADR 0017) from the request `Origin`. **Every** outbound backend call must attach tenant headers via `tenantHeaders()` from `app/lib/tenant.ts`: `authedFetch` adds them automatically, so anything going through it (and `backend.ts`) is covered; any route that calls the backend with a raw `fetch` must spread `...(await tenantHeaders())` into its headers. The helper derives `Origin` from the incoming host server-side — it never relays the browser's `Origin` — and sends `X-TENANT-OVERRIDE` instead when `TENANT_OVERRIDE` is set for local dev.

## Logging

Use the single `logger` exported from `app/lib/logger.ts` (pino) — never `console.*`. It emits JSON to stdout (the host Datadog Agent tails it in prod); dev pretty-prints via the `npm run dev` pipe through `pino-pretty`. Level is `info` in prod / `debug` in dev, overridable with `LOG_LEVEL`. See [ADR 0020](docs/adr/0020-structured-json-logging-with-pino-for-datadog.md) for the full contract. Conventions:

- **Never log secrets** (tokens, cookies, `Authorization` headers). A `redact` list is the backstop, not a license — don't log header/token objects.
- **Never log participant PII** — coordinates, `memberId`, `agentId`. Log `gameId`, `tenant`, `route`, `status` instead.
- **Errors** go through the `err` serializer: `logger.error({ err }, "message")`.
- **`pino` is in `serverExternalPackages`** (`next.config.ts`) — required, or it crashes on first log under standalone output. Don't add an in-process pino transport (breaks standalone); pretty-printing is a CLI pipe only.
