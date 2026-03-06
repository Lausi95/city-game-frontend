import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET(request: NextRequest) {
  const session = await auth();

  const keycloakIssuer = process.env.AUTH_KEYCLOAK_ISSUER;
  const endSessionUrl = `${keycloakIssuer}/protocol/openid-connect/logout`;
  const postLogoutRedirectUri =
    process.env.AUTH_URL ?? request.nextUrl.origin;

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
