import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { externalOrigin } from "@/app/lib/origin";

export async function GET(request: NextRequest) {
  const session = await auth();

  const keycloakIssuer = process.env.AUTH_KEYCLOAK_ISSUER;
  const endSessionUrl = `${keycloakIssuer}/protocol/openid-connect/logout`;
  // Derive the external origin from the forwarded host, not req.nextUrl.origin
  // (which is the container's 0.0.0.0:3000 listen address behind traefik).
  // See docs/adr/0019-auth-derives-external-origin-from-forwarded-host.md.
  const postLogoutRedirectUri =
    externalOrigin(request.headers) ?? request.nextUrl.origin;

  const params = new URLSearchParams({
    post_logout_redirect_uri: postLogoutRedirectUri,
    client_id: process.env.AUTH_KEYCLOAK_ID!,
  });

  if (session?.idToken) {
    params.set("id_token_hint", session.idToken);
  }

  const response = NextResponse.redirect(
    `${endSessionUrl}?${params.toString()}`
  );

  // Clear all Auth.js-related cookies (v5 uses "authjs" prefix)
  const cookieNames = request.cookies.getAll().map((c) => c.name);
  for (const name of cookieNames) {
    if (name.startsWith("authjs")) {
      response.cookies.delete(name);
    }
  }

  return response;
}
