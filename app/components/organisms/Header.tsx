import Link from 'next/link';
import { auth } from '@/auth';

export default async function Header() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-6">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          City Game Admin
        </Link>
        {session && (
          <nav className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Games
            </Link>
          </nav>
        )}
      </div>
      {session && (
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-500">
            {session.user?.name ?? session.user?.email}
          </span>
          <a
            href="/api/auth/federated-logout"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Sign out
          </a>
        </div>
      )}
    </header>
  );
}
