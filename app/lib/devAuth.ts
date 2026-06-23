import type { Session } from 'next-auth';
import { auth } from '@/auth';

/**
 * Local-dev operator-auth bypass — the single source of truth for "is auth off?".
 *
 * True only outside production. The deployment contract bakes
 * `NODE_ENV=production` into the runner image (`Dockerfile`) and there is no
 * non-prod *deployed* environment, so this is a reliable, fail-closed prod
 * discriminator: a shipped build is always `production`. The same signal already
 * gates the secure-cookie name in `authedFetch` (ADR 0022).
 *
 * See docs/adr/0036-local-dev-bypasses-operator-auth.md.
 */
export const AUTH_BYPASS = process.env.NODE_ENV !== 'production';

/**
 * Synthetic operator session used to render the admin UI when auth is bypassed.
 * UI-only: the proxy bypass is a plain early-return and `authedFetch` reads no
 * token, so neither depends on this object.
 */
const DEV_SESSION: Session = {
  user: { name: 'Local Dev' },
  expires: '',
};

/**
 * The operator session for UI rendering: the real Keycloak session in prod, the
 * synthetic stub locally so the Header nav renders without a login.
 */
export async function resolveOperatorSession(): Promise<Session | null> {
  if (AUTH_BYPASS) {
    return DEV_SESSION;
  }
  return auth();
}
