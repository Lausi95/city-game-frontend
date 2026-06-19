import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Auth disabled for local development
export function proxy(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - auth/signin (custom sign-in page to avoid redirect loop)
     * - api/auth (NextAuth routes needed for the login flow itself)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!auth/signin|api/auth|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
