"use client";

import { useSession, signOut } from "next-auth/react";

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="flex items-center justify-between border-b border-black/[.08] bg-white px-6 py-4 dark:border-white/[.145] dark:bg-black">
      <h1 className="text-lg font-semibold text-black dark:text-zinc-50">
        City Game Admin
      </h1>
      {session?.user && (
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {session.user.name ?? session.user.email}
          </span>
          <button
            onClick={() => signOut()}
            className="rounded-full border border-black/[.08] px-4 py-1.5 text-sm font-medium text-black transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:text-zinc-50 dark:hover:bg-[#1a1a1a]"
          >
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
