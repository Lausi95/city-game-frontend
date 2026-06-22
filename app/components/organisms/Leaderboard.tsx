'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, VenetianMask } from 'lucide-react';
import type { LeaderboardEntry, LeaderboardResource } from '@/app/types/api';

interface LeaderboardProps {
  gameId: string;
  /** When set, the matching team's row is visually marked as "you". Team surface only. */
  highlightTeamId?: string;
}

type Load = 'loading' | 'ready' | 'error';

/** Wall-clock time of a catch, e.g. "14:02". */
function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Relative age of a catch, e.g. "68m ago". Games run a few hours, so minutes
 * are the natural unit; we only fold into hours past the two-hour mark.
 */
function relativeAge(iso: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - Date.parse(iso)) / 1000));
  if (seconds < 60) return 'gerade eben';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 120) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  return `vor ${hours} Std. ${minutes % 60} Min.`;
}

/**
 * Rank derived from `foundCount`, never array position: ties share a rank with
 * a gap after (1, 2, 2, 4), and a zero-find team is unranked (`null` → dash),
 * since the backend gives those teams no meaningful order. See CONTEXT.md.
 */
function ranksFor(teams: LeaderboardEntry[]): (number | null)[] {
  return teams.map((team) => {
    if (team.foundCount === 0) return null;
    const ahead = teams.filter((t) => t.foundCount > team.foundCount).length;
    return ahead + 1;
  });
}

/**
 * The leaderboard list. Shared by the public team page (`/leaderboard`) and the
 * operator page (`/admin/games/[id]/leaderboard`) — both fetch the same public
 * proxy. See docs/adr/0009-leaderboard-split-surfaces-public-data.md.
 */
export default function Leaderboard({ gameId, highlightTeamId }: LeaderboardProps) {
  const [load, setLoad] = useState<Load>('loading');
  const [data, setData] = useState<LeaderboardResource | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Client-only relative-age clock; a 30s tick is fine for minute-resolution ages.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Returns false only on a failed fetch — callers keep the last good list on screen.
  const refresh = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(
        `/api/participant/leaderboard?gameId=${encodeURIComponent(gameId)}`,
      );
      if (!res.ok) return false;
      setData((await res.json()) as LeaderboardResource);
      return true;
    } catch {
      return false;
    }
  }, [gameId]);

  // Initial load.
  useEffect(() => {
    let active = true;
    (async () => {
      const ok = await refresh();
      if (active) setLoad(ok ? 'ready' : 'error');
    })();
    return () => {
      active = false;
    };
  }, [refresh]);

  // Poll every 10s once ready (matches the board). Keep the last good list on a
  // failed refresh rather than flashing an error.
  const ready = load === 'ready';
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => void refresh(), 10_000);
    return () => clearInterval(id);
  }, [ready, refresh]);

  const teams = useMemo(() => data?.teams ?? [], [data]);
  const ranks = useMemo(() => ranksFor(teams), [teams]);

  const toggle = (teamId: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });

  if (load === 'loading') {
    return (
      <ul className="divide-y divide-border">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="h-14 animate-pulse bg-surface-raised" />
        ))}
      </ul>
    );
  }

  if (load === 'error' || !data) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
        <p className="text-sm text-muted">
          Die Rangliste konnte nicht geladen werden. Prüfe deine Verbindung und versuche es erneut.
        </p>
        <button
          type="button"
          onClick={() => {
            setLoad('loading');
            void refresh().then((ok) => setLoad(ok ? 'ready' : 'error'));
          }}
          className="rounded-md border border-border-strong bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-raised"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <p className="px-6 py-16 text-center text-sm text-muted">
        Noch keine Teams in diesem Spiel.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {teams.map((team, i) => {
        const rank = ranks[i];
        const isExpandable = team.foundCount > 0;
        const isOpen = expanded.has(team.teamId);
        const isYou = highlightTeamId === team.teamId;

        return (
          <li
            key={team.teamId}
            className={
              isYou
                ? 'border-l-2 border-l-accent bg-utility/15'
                : undefined
            }
          >
            <button
              type="button"
              onClick={() => isExpandable && toggle(team.teamId)}
              aria-expanded={isExpandable ? isOpen : undefined}
              disabled={!isExpandable}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                isExpandable
                  ? 'cursor-pointer hover:bg-surface-raised'
                  : 'cursor-default'
              }`}
            >
              <span className="w-6 shrink-0 text-center text-sm font-semibold tabular-nums text-muted">
                {rank ?? '—'}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                {team.teamName}
                {isYou && (
                  <span className="ml-2 text-xs font-normal text-accent">
                    du
                  </span>
                )}
              </span>
              <span className="shrink-0 text-sm text-muted">
                <span className="font-semibold text-foreground">
                  {team.foundCount}
                </span>{' '}
                gefunden
              </span>
              <ChevronRight
                className={`h-4 w-4 shrink-0 text-muted transition-transform ${
                  isExpandable ? '' : 'invisible'
                } ${isOpen ? 'rotate-90' : ''}`}
                aria-hidden="true"
              />
            </button>

            {isExpandable && isOpen && (
              <ul className="space-y-1 bg-surface-raised px-4 pb-3 pl-13">
                {team.agents.map((agent, j) => (
                  <li
                    key={`${agent.alias}-${j}`}
                    className="flex items-baseline justify-between gap-3 text-sm"
                  >
                    <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-muted">
                      <VenetianMask className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
                      {agent.alias}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted">
                      {clockTime(agent.foundAt)}{' '}
                      <span className="text-muted">
                        ({relativeAge(agent.foundAt, now)})
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
