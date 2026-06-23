'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useAgents } from './AgentsProvider';
import { Switch } from '@/app/components/atoms/Switch';
import type { BoardLayers } from '@/app/components/organisms/GameMap';
import type { MapResource, TeamResource, BoardResource } from '@/app/types/api';

const GameMap = dynamic(() => import('@/app/components/organisms/GameMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-80 w-full animate-pulse items-center justify-center rounded-md bg-surface-raised text-sm text-muted">
      Karte wird geladen …
    </div>
  ),
});

// "Alle Teams" = the unfiltered board (no X-TeamId), so no found Mister X is hidden.
const ALL_TEAMS = '';

/**
 * The operator's game map with a spectator toggle (see CONTEXT.md → Spectator view).
 * Admin-Ansicht draws the privileged exact-coordinate view (agents from the shared
 * AgentsProvider poll). Team-Ansicht draws the team Board: defaults to "Alle Teams"
 * (full picture) and can be narrowed to one team's perspective. The board is fetched
 * from the public participant route and re-polled every 10s while shown (ADR 0037).
 */
export default function GameMapClient({
  gameId,
  map,
  teams,
  className,
}: {
  gameId: string;
  map: MapResource;
  teams: TeamResource[];
  className?: string;
}) {
  const { agents, now } = useAgents();
  const [teamView, setTeamView] = useState(false);
  const [teamId, setTeamId] = useState<string>(ALL_TEAMS);
  const [board, setBoard] = useState<BoardLayers | null>(null);

  // Fetch + poll the board only while Team-Ansicht is shown; refetch on team change.
  useEffect(() => {
    if (!teamView) return;
    let cancelled = false;

    async function load() {
      try {
        const qs = new URLSearchParams({ gameId });
        if (teamId) qs.set('teamId', teamId);
        const res = await fetch(`/api/participant/board?${qs}`);
        if (!res.ok) return;
        const data: BoardResource = await res.json();
        if (!cancelled) {
          setBoard({ misterxAgents: data.misterxAgents, utilityAgents: data.utilityAgents });
        }
      } catch {
        // Transient network error — keep the last board; the next tick retries.
      }
    }

    load();
    const id = setInterval(load, 10_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [teamView, teamId, gameId]);

  return (
    <div className="relative h-full w-full">
      <GameMap
        map={map}
        mode={teamView ? 'team' : 'admin'}
        agents={agents}
        board={board}
        now={now}
        className={className}
      />
      <div className="absolute right-3 top-3 z-[1000] flex flex-col items-end gap-2">
        <div className="rounded-md border border-border bg-surface-raised/95 px-3 py-2 shadow-lg backdrop-blur">
          <Switch
            leftLabel="Admin-Ansicht"
            rightLabel="Team-Ansicht"
            checked={teamView}
            onChange={setTeamView}
          />
        </div>
        {teamView && (
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="cursor-pointer rounded-md border border-border bg-surface-raised/95 px-2 py-1.5 text-xs font-medium text-foreground shadow-lg outline-none backdrop-blur focus-visible:ring-2 focus-visible:ring-accent"
          >
            <option value={ALL_TEAMS}>Alle Teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
