'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LeaderboardEntry, LeaderboardResource } from '@/app/types/api';

interface LeaderboardProps {
  gameId: string;
  /** When set, the matching team's row is visually marked as "you". Team surface only. */
  highlightTeamId?: string;
}

type Load = 'loading' | 'ready' | 'error';

/** Wall-clock time of a catch, e.g. "14:02". */
function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Relative age of a catch, e.g. "68m ago". Games run a few hours, so minutes
 * are the natural unit; we only fold into hours past the two-hour mark.
 */
function relativeAge(iso: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - Date.parse(iso)) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 120) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m ago`;
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
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="h-14 animate-pulse bg-zinc-100/60 dark:bg-zinc-900/60" />
        ))}
      </ul>
    );
  }

  if (load === 'error' || !data) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Couldn&apos;t load the leaderboard. Check your connection and try again.
        </p>
        <button
          type="button"
          onClick={() => {
            setLoad('loading');
            void refresh().then((ok) => setLoad(ok ? 'ready' : 'error'));
          }}
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          Retry
        </button>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <p className="px-6 py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
        No teams in this game yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
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
                ? 'border-l-2 border-l-blue-500 bg-blue-50 dark:bg-blue-950/30'
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
                  ? 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  : 'cursor-default'
              }`}
            >
              <span className="w-6 shrink-0 text-center text-sm font-semibold tabular-nums text-zinc-400 dark:text-zinc-500">
                {rank ?? '—'}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium text-zinc-900 dark:text-zinc-100">
                {team.teamName}
                {isYou && (
                  <span className="ml-2 text-xs font-normal text-blue-600 dark:text-blue-400">
                    you
                  </span>
                )}
              </span>
              <span className="shrink-0 text-sm text-zinc-500 dark:text-zinc-400">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {team.foundCount}
                </span>{' '}
                found
              </span>
              <span
                className={`w-4 shrink-0 text-center text-zinc-400 transition-transform dark:text-zinc-500 ${
                  isExpandable ? '' : 'invisible'
                } ${isOpen ? 'rotate-90' : ''}`}
                aria-hidden
              >
                ›
              </span>
            </button>

            {isExpandable && isOpen && (
              <ul className="space-y-1 bg-zinc-50/60 px-4 pb-3 pl-13 dark:bg-zinc-900/40">
                {team.agents.map((agent, j) => (
                  <li
                    key={`${agent.alias}-${j}`}
                    className="flex items-baseline justify-between gap-3 text-sm"
                  >
                    <span className="truncate text-zinc-700 dark:text-zinc-300">
                      🎭 {agent.alias}
                    </span>
                    <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">
                      {clockTime(agent.foundAt)}{' '}
                      <span className="text-zinc-400 dark:text-zinc-500">
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
