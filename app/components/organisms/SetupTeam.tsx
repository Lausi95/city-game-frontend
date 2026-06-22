'use client';

import { ReactNode, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/atoms/Button';
import { readIdentity, writeIdentity } from '@/app/lib/identity';
import type { TeamResource } from '@/app/types/api';

type Phase = 'loading' | 'confirm' | 'already' | 'error';

interface SetupTeamProps {
  gameId?: string;
  teamId?: string;
}

/** Shared centered shell, mirroring ParticipantStub so the two surfaces match. */
function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-md flex-col items-center gap-6 px-8 text-center">
        {children}
      </main>
    </div>
  );
}

function Heading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <h2 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
        {title}
      </h2>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">{subtitle}</p>
    </div>
  );
}

/**
 * Team-member setup. Confirms the team (via the public /my-team proxy), then
 * registers on an explicit "Join team" tap (the public /team-register proxy
 * mints the memberId). On success it writes the identity and redirects to `/`.
 *
 * A device already registered for THIS team skips straight to a "Continue"
 * state (no duplicate registration); a different team / game shows normal Join
 * and overwrites the stored identity. Any failure — bad link, unknown team, or
 * a failed join — collapses to one generic error screen with a retry.
 */
export default function SetupTeam({ gameId, teamId }: SetupTeamProps) {
  const router = useRouter();
  const hasParams = Boolean(gameId && teamId);
  const [phase, setPhase] = useState<Phase>('loading');
  const [team, setTeam] = useState<TeamResource | null>(null);
  const [joining, setJoining] = useState(false);
  // Bumped by "Try again" to re-run the load effect.
  const [reloadKey, setReloadKey] = useState(0);

  // Load: fetch the team to confirm the link, then decide whether this device
  // is already a member of it. All setState happens after an await, so the load
  // never triggers a synchronous cascade from the effect body.
  useEffect(() => {
    if (!gameId || !teamId) return;
    let active = true;

    (async () => {
      try {
        const res = await fetch(
          `/api/participant/my-team?gameId=${encodeURIComponent(gameId)}&teamId=${encodeURIComponent(teamId)}`,
        );
        if (!active) return;
        if (!res.ok) {
          setPhase('error');
          return;
        }
        const data: TeamResource = await res.json();
        if (!active) return;

        const identity = readIdentity();
        const alreadyMember =
          identity?.role === 'team' &&
          identity.gameId === gameId &&
          identity.teamId === teamId;

        setTeam(data);
        setPhase(alreadyMember ? 'already' : 'confirm');
      } catch {
        if (active) setPhase('error');
      }
    })();

    return () => {
      active = false;
    };
  }, [gameId, teamId, reloadKey]);

  const retry = useCallback(() => {
    setPhase('loading');
    setReloadKey((k) => k + 1);
  }, []);

  const join = useCallback(async () => {
    if (!gameId || !teamId) return;
    setJoining(true);
    try {
      const res = await fetch(
        `/api/participant/team-register?gameId=${encodeURIComponent(gameId)}&teamId=${encodeURIComponent(teamId)}`,
        { method: 'POST' },
      );
      if (!res.ok) {
        setJoining(false);
        setPhase('error');
        return;
      }
      const { memberId } = (await res.json()) as { memberId: string };
      writeIdentity({ role: 'team', gameId, teamId, memberId });
      // Keep `joining` true through the navigation so the button never re-enables.
      router.replace('/');
    } catch {
      setJoining(false);
      setPhase('error');
    }
  }, [gameId, teamId, router]);

  // A link with no gameId/teamId is unrecoverable — show the generic error.
  if (!hasParams || phase === 'error') {
    return (
      <Shell>
        <Heading
          title="Etwas ist schiefgelaufen"
          subtitle="Wir konnten dich nicht für dieses Team einrichten. Prüfe deinen Setup-Link und versuche es erneut."
        />
        <Button variant="primary" size="lg" onClick={retry}>
          Erneut versuchen
        </Button>
      </Shell>
    );
  }

  if (phase === 'loading') {
    return (
      <Shell>
        <p className="animate-pulse text-sm text-zinc-400">Wird geladen …</p>
      </Shell>
    );
  }

  if (phase === 'already') {
    return (
      <Shell>
        <Heading
          title="Du bist bereits in diesem Team"
          subtitle="Dein Gerät ist eingerichtet. Geh zurück und jage weiter."
        />
        <Button variant="primary" size="lg" onClick={() => router.replace('/')}>
          Weiter
        </Button>
      </Shell>
    );
  }

  // confirm
  return (
    <Shell>
      <Heading
        title={team?.name ?? 'Team beitreten'}
        subtitle="Du wurdest eingeladen, diesem Team beizutreten. Tippe unten, um loszuspielen."
      />
      <Button
        variant="primary"
        size="lg"
        onClick={() => void join()}
        disabled={joining}
      >
        {joining ? 'Tritt bei …' : 'Team beitreten'}
      </Button>
    </Shell>
  );
}
