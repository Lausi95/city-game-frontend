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
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <p className="text-zinc-600 dark:text-zinc-400">
        Redirecting to login...
      </p>
      <Suspense>
        <SignInRedirect />
      </Suspense>
    </div>
  );
}
