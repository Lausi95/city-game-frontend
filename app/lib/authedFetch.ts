import { cookies } from 'next/headers';
import { getToken } from 'next-auth/jwt';
import { tenantHeaders } from './tenant';

const API_URL = process.env.API_URL ?? 'http://localhost:8080';

// Auth.js uses the secure-prefixed cookie name when the deployment URL is https.
// getToken must look for the same name, so derive it from AUTH_URL.
const secureCookie = (process.env.AUTH_URL ?? '').startsWith('https://');

/**
 * Server-only fetch for the backend's authenticated surface (`/games/**`).
 *
 * Every `/games/**` endpoint requires the operator's Keycloak access token
 * (see docs/adr/0014-operator-access-token-on-games-endpoints.md). The token is
 * read **server-side from the encrypted session cookie via `getToken`** and is
 * deliberately NOT mapped into the NextAuth session — so it never reaches the
 * client (`/api/auth/session`) and can't be exfiltrated by client-side JS.
 *
 * The "no token" rule lives here, once: if there is no access token (unauthenticated,
 * or a failed silent refresh) we return a 401 and never call the backend tokenless.
 * This is defense-in-depth behind the middleware.
 *
 * `path` is a backend path beginning with `/` (e.g. `/games/${id}`); the API base URL
 * is owned here. Do NOT use this for the public top-level participant endpoints
 * (`/find`, `/board`, `/location`, …) — those are tokenless by design.
 */
export async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const cookieHeader = (await cookies()).toString();
  const token = await getToken({
    req: { headers: { cookie: cookieHeader } },
    secret: process.env.AUTH_SECRET!,
    secureCookie,
  });

  const accessToken = token?.accessToken;
  if (!accessToken) {
    return Response.json({ detail: 'Not authenticated' }, { status: 401 });
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);

  // Tenant resolution — the backend keys on this; see ./tenant.ts and ADR 0017.
  for (const [key, value] of Object.entries(await tenantHeaders())) {
    headers.set(key, value);
  }

  return fetch(`${API_URL}${path}`, { ...init, headers });
}
