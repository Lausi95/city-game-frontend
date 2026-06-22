import { headers } from 'next/headers';

/**
 * Tenant-resolution headers for an outbound backend call.
 *
 * The backend resolves the tenant — the verification boundary that stops one
 * customer's frontend from loading another's game (see CONTEXT.md → Tenant and
 * docs/adr/0017-tenant-from-derived-host-not-relayed-origin.md) — from the
 * request `Origin`. A server-side `fetch` sends no `Origin` by default, so every
 * backend call must attach one explicitly through this helper.
 *
 * We do NOT relay the browser's own `Origin`: browsers omit it on same-origin
 * GET/HEAD requests and SSR navigations, which would leave the read endpoints
 * tenant-less. Instead we DERIVE it from the incoming request's host
 * (`x-forwarded-host ?? host`), which is present on every request, and set it
 * server-side. We always construct the value ourselves and never pass through a
 * client-supplied `Origin`/`X-TENANT-OVERRIDE` — the participant routes are
 * public, so a relayed client header would be a cross-tenant bypass.
 *
 * Locally the host is `localhost:3000`, which maps to no tenant; when
 * `TENANT_OVERRIDE` is set we send `X-TENANT-OVERRIDE` instead of `Origin`. That
 * header is a dev-only affordance — the backend ignores it in production — so a
 * production deployment simply leaves `TENANT_OVERRIDE` unset.
 */
export async function tenantHeaders(): Promise<Record<string, string>> {
  const override = process.env.TENANT_OVERRIDE;
  if (override) {
    return { 'X-TENANT-OVERRIDE': override };
  }

  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  if (!host) {
    return {};
  }

  const proto = h.get('x-forwarded-proto') ?? 'https';
  return { Origin: `${proto}://${host}` };
}
