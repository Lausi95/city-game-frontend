'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/app/components/atoms/Badge';
import { Button } from '@/app/components/atoms/Button';
import FindQrDialog from '@/app/components/organisms/FindQrDialog';
import { StatTile } from '@/app/components/molecules/StatTile';
import { LastSeenIndicator } from '@/app/components/molecules/LastSeenIndicator';
import {
  useAgentLocationReporting,
  type ReportingStatus,
} from '@/app/lib/useAgentLocationReporting';
import type { AgentResource } from '@/app/types/api';

interface AgentViewProps {
  gameId: string;
  agentId: string;
}

type Load = 'loading' | 'ready' | 'error';

const TYPE_LABELS: Record<AgentResource['type'], string> = {
  MISTERX: 'Mister X',
  UTILITY: 'Utility agent',
};

// Banner copy per reporting status. 'reporting' shows nothing (all good);
// 'prompting' is the brief pre-permission window.
const REPORTING_BANNER: Partial<Record<ReportingStatus, string>> = {
  prompting: 'Requesting location access… allow it so your position is reported.',
  denied:
    "Location access is off — your position isn't being reported. Enable location for this site to rejoin the map.",
  unavailable:
    "Can't read your location right now — your position may be going out of date.",
};

export default function AgentView({ gameId, agentId }: AgentViewProps) {
  const [load, setLoad] = useState<Load>('loading');
  const [agent, setAgent] = useState<AgentResource | null>(null);
  const [showFindQr, setShowFindQr] = useState(false);

  // Ticking wall-clock that recolors the "last seen" dot between polls, and the
  // 20s poll that refreshes the server's view of our own location. Mirrors
  // AgentsSection — see docs/adr/0003-client-polled-location-freshness.md. This
  // view is client-only (rendered post-hydration), so seeding `now` from the
  // clock at init is safe — no SSR mismatch.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const fetchAgent = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(
        `/api/participant/my-agent?gameId=${encodeURIComponent(gameId)}&agentId=${encodeURIComponent(agentId)}`,
      );
      if (!res.ok) return false;
      const data: AgentResource = await res.json();
      setAgent(data);
      return true;
    } catch {
      return false;
    }
  }, [gameId, agentId]);

  // Initial load.
  useEffect(() => {
    let active = true;
    (async () => {
      const ok = await fetchAgent();
      if (active) setLoad(ok ? 'ready' : 'error');
    })();
    return () => {
      active = false;
    };
  }, [fetchAgent]);

  // 20s poll: read our own location back from the server so freshness is truthful.
  useEffect(() => {
    const id = setInterval(() => {
      void fetchAgent();
    }, 20_000);
    return () => clearInterval(id);
  }, [fetchAgent]);

  // Report our position while this view is open (foreground-only).
  const reporting = useAgentLocationReporting(gameId, agentId);

  if (load === 'loading') {
    return (
      <Shell>
        <p className="animate-pulse text-sm text-zinc-400">Loading…</p>
      </Shell>
    );
  }

  if (load === 'error' || !agent) {
    return (
      <Shell>
        <p className="text-sm text-zinc-500">
          Couldn&apos;t load your agent details. Check your connection and try again.
        </p>
      </Shell>
    );
  }

  const banner = REPORTING_BANNER[reporting];

  // The find-QR is presented live by the hunted agent for a team to scan (ADR 0011).
  // Only an *active* Mister X is findable, so only they get the affordance.
  const canShowFindQr = agent.type === 'MISTERX' && agent.active;

  return (
    <div className="min-h-[calc(100vh-65px)] bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 py-8">
        <header className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            {agent.alias}
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {agent.active
              ? 'You are in play. Stay on the move.'
              : "You're currently inactive — the teams aren't hunting you right now."}
          </p>
        </header>

        {banner && (
          <p
            role="status"
            className="rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200"
          >
            {banner}
          </p>
        )}

        {canShowFindQr && (
          <Button className="w-full" onClick={() => setShowFindQr(true)}>
            Show find QR
          </Button>
        )}

        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Type">
            <Badge color={agent.type === 'MISTERX' ? 'red' : 'blue'}>
              {TYPE_LABELS[agent.type]}
            </Badge>
          </StatTile>
          <StatTile label="Status">
            <Badge color={agent.active ? 'green' : 'zinc'}>
              {agent.active ? 'Active' : 'Inactive'}
            </Badge>
          </StatTile>
          <StatTile label="Name">
            {agent.firstName} {agent.lastName}
          </StatTile>
          <StatTile label="Phone">{agent.phoneNumber}</StatTile>
          <div className="col-span-2">
            <StatTile label="Last seen">
              <LastSeenIndicator location={agent.location} now={now} />
            </StatTile>
          </div>
          {/* Variable-length list — span the full row, one row per team. */}
          <div className="col-span-2">
            <StatTile label="Found by">
              {agent.foundByTeams.length === 0 ? (
                <span className="text-zinc-500">Not yet found</span>
              ) : (
                <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
                  {agent.foundByTeams.map((team) => (
                    <li
                      key={team.id}
                      className="flex items-center justify-between gap-3 py-1.5 first:pt-0 last:pb-0"
                    >
                      <span>{team.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </StatTile>
          </div>
        </div>
      </main>

      {showFindQr && (
        <FindQrDialog
          gameId={gameId}
          agentId={agentId}
          onClose={() => setShowFindQr(false)}
        />
      )}
    </div>
  );
}

/** Centered shell for the loading/error states, matching the participant surfaces. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      {children}
    </div>
  );
}
