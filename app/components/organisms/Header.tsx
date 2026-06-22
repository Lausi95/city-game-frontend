import Link from 'next/link';
import { auth } from '@/auth';

export default async function Header() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-surface/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-6">
        <Link
          href="/admin"
          className="group flex items-center gap-2 font-display text-lg tracking-wide text-foreground"
        >
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]"
          />
          City Game <span className="text-accent">Admin</span>
        </Link>
        {session && (
          <nav className="flex items-center gap-4">
            <Link
              href="/admin"
              className="font-display text-sm uppercase tracking-wide text-muted transition-colors hover:text-foreground"
            >
              Spiele
            </Link>
          </nav>
        )}
      </div>
      {session && (
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted">
            {session.user?.name ?? session.user?.email}
          </span>
          <a
            href="/api/auth/federated-logout"
            className="text-sm text-muted transition-colors hover:text-foreground"
          >
            Abmelden
          </a>
        </div>
      )}
    </header>
  );
}
