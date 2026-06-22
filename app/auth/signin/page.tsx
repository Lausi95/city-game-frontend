"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function SignInRedirect() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

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
