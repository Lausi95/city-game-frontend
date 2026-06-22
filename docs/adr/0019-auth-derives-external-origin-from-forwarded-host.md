# Auth and federated logout derive the external origin from the forwarded host

[ADR 0018](./0018-containerized-deployment-behind-traefik.md) leaves `AUTH_URL`
unset so that NextAuth builds each operator's OAuth callback from the domain they
are actually on — one container serves many tenant domains, so a single pinned
URL would break login everywhere but one. That intent was only half-honored in
code. NextAuth has two host-derivation paths, and they disagree behind traefik:
the **middleware/server-action** path (`createActionURL`) reads
`x-forwarded-host ?? host`, but the **`[...nextauth]` route-handler** path builds
the origin from `req.url` — which, in the standalone container, is the listen
address `0.0.0.0:3000` (`HOSTNAME:PORT` from the `Dockerfile`), not the external
host. The result: the operator reaches Keycloak (middleware redirect resolves
correctly) but is sent there with `redirect_uri=https://0.0.0.0:3000/api/auth/callback/keycloak`,
which Keycloak rejects. `federated-logout` had the same defect via
`req.nextUrl.origin`, producing a bad `post_logout_redirect_uri`.

We **reconstruct the external origin from the forwarded headers** rather than
trusting `req.url`, using one shared helper — `externalOrigin(headers)` returning
`${x-forwarded-proto ?? 'https'}://${x-forwarded-host ?? host}` — consumed by
three sites: `tenant.ts` (which already computed exactly this inline; now
de-duplicated), a thin wrapper around the `[...nextauth]` route handler that
rebuilds the request URL before delegating to `handlers.GET/POST` (covering both
the authorization leg *and* the callback token-exchange leg, whose `redirect_uri`
must match), and `federated-logout` (whose dead `AUTH_URL ??` prefix is dropped —
`AUTH_URL` is unset by design). `AUTH_URL` stays unset; the fix makes the code do
what 0018 always claimed.

The security invariant is unchanged and now also guards auth: trusting
`x-forwarded-host` is safe **only because the container publishes no host ports**
([ADR 0017](./0017-tenant-from-derived-host-not-relayed-origin.md), 0018) — traefik
overwrites client-supplied forwarded headers, and no direct path to the container
exists. This fix extends that one existing trust to the auth callback; it
introduces no new trust. As 0018 already requires, every served tenant domain's
callback (`https://<domain>/api/auth/callback/keycloak`) must remain a registered
redirect URI in the Keycloak client — a correct origin against an unregistered
URI simply fails differently.
