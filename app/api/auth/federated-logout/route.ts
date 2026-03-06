import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });

  const keycloakIssuer = process.env.KEYCLOAK_ISSUER;
  const endSessionUrl = `${keycloakIssuer}/protocol/openid-connect/logout`;
  const postLogoutRedirectUri = process.env.NEXTAUTH_URL ?? request.nextUrl.origin;

  const params = new URLSearchParams({
    post_logout_redirect_uri: postLogoutRedirectUri,
    client_id: process.env.KEYCLOAK_CLIENT_ID!,
  });

  if (token?.idToken) {
    params.set("id_token_hint", token.idToken as string);
  }

  // Clear the NextAuth session cookie by redirecting through NextAuth signout
  // We set the next-auth session cookie to empty to clear it, then redirect to Keycloak logout
  const response = NextResponse.redirect(`${endSessionUrl}?${params.toString()}`);

  // Clear all NextAuth-related cookies
  const cookieNames = request.cookies.getAll().map((c) => c.name);
  for (const name of cookieNames) {
    if (name.startsWith("next-auth")) {
      response.cookies.delete(name);
    }
  }

  return response;
}
