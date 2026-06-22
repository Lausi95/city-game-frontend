'use client';

import { ReactNode, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/atoms/Button';
import { writeIdentity } from '@/app/lib/identity';
import type { AgentResource } from '@/app/types/api';

type Phase = 'loading' | 'confirm' | 'error';

interface SetupAgentProps {
  gameId?: string;
  agentId?: string;
}

const TYPE_LABELS: Record<AgentResource['type'], string> = {
  MISTERX: 'Mister X',
  UTILITY: 'Hilfsagent',
};

/** Shared centered shell, mirroring SetupTeam / ParticipantStub so the surfaces match. */
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
 * Agent setup. Unlike SetupTeam there is nothing to register: the agent already
 * exists and the setup QR carries its whole identity (gameId+agentId). So this
 * is read → confirm → write. It fetches the agent (via the public /my-agent
 * proxy) to show who the device is about to become, and on "This is me" simply
 * writes the identity and redirects to `/`. Re-scanning is idempotent, so there
 * is no "already" state. Any `active` gating belongs to the live agent view, not
 * here. A `type` param in the URL is ignored — the type is read off the fetched
 * agent. See docs/adr/0004-root-is-public-participant-surface.md.
 */
export default function SetupAgent({ gameId, agentId }: SetupAgentProps) {
  const router = useRouter();
  const hasParams = Boolean(gameId && agentId);
  const [phase, setPhase] = useState<Phase>('loading');
  const [agent, setAgent] = useState<AgentResource | null>(null);
  const [confirming, setConfirming] = useState(false);
  // Bumped by "Try again" to re-run the load effect.
  const [reloadKey, setReloadKey] = useState(0);

  // Load: fetch the agent to confirm the link. All setState happens after an
  // await, so the load never triggers a synchronous cascade from the effect body.
  useEffect(() => {
    if (!gameId || !agentId) return;
    let active = true;

    (async () => {
      try {
        const res = await fetch(
          `/api/participant/my-agent?gameId=${encodeURIComponent(gameId)}&agentId=${encodeURIComponent(agentId)}`,
        );
        if (!active) return;
        if (!res.ok) {
          setPhase('error');
          return;
        }
        const data: AgentResource = await res.json();
        if (!active) return;

        setAgent(data);
        setPhase('confirm');
      } catch {
        if (active) setPhase('error');
      }
    })();

    return () => {
      active = false;
    };
  }, [gameId, agentId, reloadKey]);

  const retry = useCallback(() => {
    setPhase('loading');
    setReloadKey((k) => k + 1);
  }, []);

  // Confirm is a pure write — no backend mutation. Keep `confirming` true through
  // the navigation so the button never re-enables.
  const confirm = useCallback(() => {
    if (!gameId || !agentId) return;
    setConfirming(true);
    writeIdentity({ role: 'agent', gameId, agentId });
    router.replace('/');
  }, [gameId, agentId, router]);

  // A link with no gameId/agentId is unrecoverable — show the generic error.
  if (!hasParams || phase === 'error') {
    return (
      <Shell>
        <Heading
          title="Etwas ist schiefgelaufen"
          subtitle="Wir konnten dich nicht als diesen Agenten einrichten. Prüfe deinen Setup-Link und versuche es erneut."
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

  // confirm
  return (
    <Shell>
      <Heading
        title={agent?.alias ?? 'Agenten-Einrichtung'}
        subtitle={
          agent
            ? `${TYPE_LABELS[agent.type]} — bestätige, dass du das bist.`
            : 'Bestätige, dass du das bist.'
        }
      />
      <Button
        variant="primary"
        size="lg"
        onClick={confirm}
        disabled={confirming}
      >
        {confirming ? 'Wird eingerichtet …' : 'Das bin ich'}
      </Button>
    </Shell>
  );
}
