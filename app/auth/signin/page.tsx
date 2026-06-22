"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function SignInRedirect() {
  const searchParams = useSearchParams();
  // Default to /admin, not the public participant root: this is the operator
  // login page, and an operator's home is the admin surface. The proxy always
  // supplies a callbackUrl for deep links; this default only bites a direct
  // visit to /auth/signin (e.g. a bookmark).
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin";

  useEffect(() => {
    signIn("keycloak", { callbackUrl });
  }, [callbackUrl]);

  return null;
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-8 text-center">
      <span
        aria-hidden="true"
        className="h-3 w-3 animate-pulse rounded-full bg-accent shadow-[0_0_12px_var(--color-accent)]"
      />
      <h1 className="font-display text-2xl tracking-wide text-foreground">
        City Game <span className="text-accent">Admin</span>
      </h1>
      <p className="text-muted">Weiterleitung zur Anmeldung …</p>
      <Suspense>
        <SignInRedirect />
      </Suspense>
    </div>
  );
}
