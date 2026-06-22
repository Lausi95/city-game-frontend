/**
 * The external origin of the current request, reconstructed from the
 * traefik-forwarded headers rather than the container's own listen address.
 *
 * Behind traefik the Next.js standalone server sees its bind address
 * (`0.0.0.0:3000`, from `HOSTNAME`/`PORT` in the Dockerfile) on the
 * route-handler `req.url`. Any URL built from that — the OAuth callback, the
 * post-logout redirect — would point at the container instead of the tenant
 * domain the operator is actually on. We derive the origin the same way tenant
 * resolution does (`x-forwarded-host ?? host`), so auth and tenant share one
 * trusted notion of "where this request really came from".
 *
 * Trusting these headers is safe ONLY because the container publishes no host
 * ports: traefik overwrites client-supplied forwarded headers and is the sole
 * path in. See docs/adr/0019-auth-derives-external-origin-from-forwarded-host.md
 * (and 0017/0018 for the security invariant).
 *
 * Returns null when no host header is present (no request to derive from).
 */
export function externalOrigin(
  headers: { get(name: string): string | null },
): string | null {
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (!host) {
    return null;
  }
  const proto = headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}
