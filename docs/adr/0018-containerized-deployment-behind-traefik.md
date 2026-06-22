# Containerized deployment behind traefik

The frontend is deployed as a Docker image on a single dedicated server, not on
Vercel (the create-next-app default). The image is built from a multi-stage
Dockerfile using Next.js standalone output (`output: "standalone"`), and a
`docker-compose.yml` joins a shared external docker network where a separately-run
traefik instance terminates TLS (Let's Encrypt) and routes to the container by
label discovery. One container serves several tenant domains via an explicit
`Host(...) || Host(...)` router rule.

## Why

- **Self-hosted, not Vercel.** Deployment target is a customer-controlled dedicated
  server with traefik already fronting other services; Vercel is not an option.
- **standalone output.** Produces a small, dependency-traced image (`node server.js`)
  instead of shipping the full `node_modules` and source.

## Consequences (load-bearing constraints)

- **The container publishes no host ports.** It is reachable only through traefik.
  This is a security boundary, not a convenience: `tenant.ts` derives the tenant
  from `X-Forwarded-Host` (ADR 0017). traefik overwrites client-supplied forwarded
  headers, so routing exclusively through it is what makes that trust safe. A
  published port would let a client reach the container directly and spoof the
  tenant. Adding a `ports:` block reopens the cross-tenant bypass 0017 closed.

- **`AUTH_URL` is unset in production; `trustHost: true` is enabled.** With many
  tenant domains on one container, the OAuth callback URL must be built from the
  domain the operator is actually on, derived per-request from the forwarded host —
  a single pinned `AUTH_URL` would break login on every other domain. The
  trade-off: each tenant domain's callback
  (`https://<domain>/api/auth/callback/keycloak`) must be registered as a valid
  redirect URI in the Keycloak client.

- **traefik must forward `X-Forwarded-Host` and `X-Forwarded-Proto`.** Both the
  tenant resolution and the auth base URL depend on them. traefik sets these by
  default; if that ever changes, tenant resolution silently breaks. How the app
  actually honors the forwarded host for auth (NextAuth's route-handler path does
  not, by default) is recorded in
  [ADR 0019](./0019-auth-derives-external-origin-from-forwarded-host.md).

- **Secrets arrive at runtime via `env_file`** (`.env.production` on the server,
  gitignored), never baked into the image. See `.env.production.example`.
