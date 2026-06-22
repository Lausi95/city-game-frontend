'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import {
  getIdentitySnapshot,
  type ParticipantIdentity,
} from '@/app/lib/identity';
import Leaderboard from '@/app/components/organisms/Leaderboard';
import ParticipantStub from '@/app/components/molecules/ParticipantStub';

// localStorage doesn't change underneath us during a page view — see ParticipantRoot.
const subscribe = () => () => {};
const getServerSnapshot = (): ParticipantIdentity | null | 'loading' => 'loading';

/**
 * Public team-facing leaderboard. The `gameId` comes from the participant
 * identity in local storage (a team has no Keycloak login), so the view is
 * resolved after hydration — a neutral loading state first, then the ranking,
 * or the "no role set" stub when there is no identity to supply a gameId.
 *
 * Operators use /admin/games/[gameId]/leaderboard instead.
 * See docs/adr/0009-leaderboard-split-surfaces-public-data.md.
 */
export default function LeaderboardPage() {
  const identity = useSyncExternalStore<ParticipantIdentity | null | 'loading'>(
    subscribe,
    getIdentitySnapshot,
    getServerSnapshot,
  );

  if (identity === 'loading') {
    return (
      <div className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-background font-sans">
        <p className="animate-pulse text-sm text-muted">Wird geladen …</p>
      </div>
    );
  }

  // The public leaderboard is the team surface (operators use /admin). A team
  // carries the gameId that scopes the ranking; anything else — no identity, or
  // an agent who typed the URL — has no team context here, so show the stub.
  if (identity?.role !== 'team') {
    return (
      <ParticipantStub
        title="Kein Team festgelegt"
        subtitle="Scanne den Setup-QR-Code deines Teams, um an einem Spiel teilzunehmen — danach erscheint hier deine Rangliste."
      />
    );
  }

  return (
    <div className="min-h-[calc(100vh-65px)] bg-background font-sans">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <Link
          href="/"
          className="mb-3 inline-block text-sm text-muted transition-colors hover:text-foreground"
        >
          ← Spielbrett
        </Link>
        <h1 className="mb-4 text-2xl font-semibold tracking-tight text-foreground">
          Rangliste
        </h1>
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <Leaderboard gameId={identity.gameId} highlightTeamId={identity.teamId} />
        </div>
      </div>
    </div>
  );
}
