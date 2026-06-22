import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import type { JWT } from "@auth/core/jwt";

declare module "next-auth" {
  interface Session {
    idToken?: string;
    /** Set when a silent refresh failed; the middleware forces a re-login. */
    error?: "RefreshAccessTokenError";
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    idToken?: string;
    accessToken?: string;
    refreshToken?: string;
    /** Access-token expiry, seconds since epoch. */
    expiresAt?: number;
    error?: "RefreshAccessTokenError";
  }
}

/**
 * Swap the refresh token for a fresh access token at Keycloak's token endpoint.
 * On any failure we flag the token so the next request bounces the operator to re-login.
 * See docs/adr/0014-operator-access-token-on-games-endpoints.md.
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const issuer = process.env.AUTH_KEYCLOAK_ISSUER!;
    const res = await fetch(`${issuer}/protocol/openid-connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: process.env.AUTH_KEYCLOAK_ID!,
        client_secret: process.env.AUTH_KEYCLOAK_SECRET!,
        refresh_token: token.refreshToken!,
      }),
    });

    const refreshed = await res.json();
    if (!res.ok) throw refreshed;

    return {
      ...token,
      accessToken: refreshed.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + refreshed.expires_in,
      // Keycloak rotates refresh tokens — keep the new one, fall back to the old.
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  // One container serves many tenant domains behind traefik, so the OAuth
  // callback URL must be derived per-request from the forwarded host rather
  // than pinned to a single AUTH_URL. trustHost lets NextAuth read the host
  // from traefik's X-Forwarded-Host; production therefore leaves AUTH_URL
  // unset. Safe only because the container is reachable solely via traefik,
  // which overwrites client-supplied forwarded headers.
  // See docs/adr/0018-containerized-deployment-behind-traefik.md.
  trustHost: true,
  providers: [Keycloak],
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign-in: capture the tokens from Keycloak.
      if (account) {
        token.idToken = account.id_token;
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        return token;
      }

      // Subsequent calls: reuse while valid, refresh once expired.
      if (token.expiresAt && Date.now() < token.expiresAt * 1000) {
        return token;
      }
      if (!token.refreshToken) {
        return token;
      }
      return refreshAccessToken(token);
    },
    redirect({ url, baseUrl }) {
      // Mirrors NextAuth's default same-origin guard, with one change: the
      // fallback target is /admin, not the bare root. The root `/` is the PUBLIC
      // participant surface (ADR 0004); an operator finishing login must never
      // land there. Behind traefik the post-login callbackUrl can be missing or
      // fail an origin-string comparison for several reasons (host normalization,
      // a callback-url cookie lost across the Keycloak round-trip), and the stock
      // fallback would dump the operator on `/`. Sending them to /admin instead
      // makes login robust regardless of why the callbackUrl was unusable.
      // See docs/adr/0019-auth-derives-external-origin-from-forwarded-host.md.
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/admin`;
    },
    session({ session, token }) {
      // accessToken is deliberately NOT exposed here — authedFetch reads it
      // server-side from the encrypted cookie via getToken (see ADR 0014).
      session.idToken = token.idToken;
      session.error = token.error;
      return session;
    },
  },
});
