import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const GET = auth(async function GET(req) {
  const keycloakIssuer = process.env.AUTH_KEYCLOAK_ISSUER;
  const endSessionUrl = `${keycloakIssuer}/protocol/openid-connect/logout`;
  const postLogoutRedirectUri =
    process.env.AUTH_URL ?? req.nextUrl.origin;

  const params = new URLSearchParams({
    post_logout_redirect_uri: postLogoutRedirectUri,
    client_id: process.env.AUTH_KEYCLOAK_ID!,
  });

  if (req.auth?.idToken) {
    params.set("id_token_hint", req.auth.idToken);
  }

  const response = NextResponse.redirect(
    `${endSessionUrl}?${params.toString()}`
  );

  // Clear all Auth.js-related cookies (v5 uses "authjs" prefix)
  const cookieNames = req.cookies.getAll().map((c) => c.name);
  for (const name of cookieNames) {
    if (name.startsWith("authjs")) {
      response.cookies.delete(name);
    }
  }

  return response;
});
