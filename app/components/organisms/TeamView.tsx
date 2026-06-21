'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { BoardResource, TeamResource } from '@/app/types/api';

interface TeamViewProps {
  gameId: string;
  teamId: string;
}

type Load = 'loading' | 'ready' | 'error';

// Leaflet touches `window` at import time, so the map is client-only.
const BoardMap = dynamic(() => import('@/app/components/organisms/BoardMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-sm text-zinc-400 dark:bg-zinc-900">
      Loading map…
    </div>
  ),
});

/** "HH:MM:SS" (or "MM:SS" under an hour) from a positive millisecond span. */
function formatSpan(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Phase-aware countdown label derived from the board's game window. */
function countdownLabel(board: BoardResource, now: number): string {
  const start = Date.parse(board.game.startTime);
  const end = Date.parse(board.game.endTime);
  if (now < start) return `Starts in ${formatSpan(start - now)}`;
  if (now <= end) return `Ends in ${formatSpan(end - now)}`;
  return 'Ended';
}

export default function TeamView({ gameId, teamId }: TeamViewProps) {
  const [load, setLoad] = useState<Load>('loading');
  const [board, setBoard] = useState<BoardResource | null>(null);
  const [team, setTeam] = useState<TeamResource | null>(null);

  // Client-only view (rendered post-hydration), so seeding the clock from now
  // is safe — no SSR mismatch. Ticks the countdown between polls.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch the board and the team in parallel. Returns false only if the BOARD
  // fetch fails — the board is the view; a missing team name is survivable.
  const refresh = useCallback(async (): Promise<boolean> => {
    const q = `gameId=${encodeURIComponent(gameId)}&teamId=${encodeURIComponent(teamId)}`;
    const [boardRes, teamRes] = await Promise.allSettled([
      fetch(`/api/participant/board?${q}`),
      fetch(`/api/participant/my-team?${q}`),
    ]);

    if (teamRes.status === 'fulfilled' && teamRes.value.ok) {
      setTeam((await teamRes.value.json()) as TeamResource);
    }

    if (boardRes.status === 'fulfilled' && boardRes.value.ok) {
      setBoard((await boardRes.value.json()) as BoardResource);
      return true;
    }
    return false;
  }, [gameId, teamId]);

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

  // Poll every 10s. On a failed refresh we keep the last good board on screen
  // (resilient on flaky mobile data) rather than flashing an error.
  const ready = load === 'ready';
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      void refresh();
    }, 10_000);
    return () => clearInterval(id);
  }, [ready, refresh]);

  if (load === 'loading') {
    return (
      <Shell>
        <p className="animate-pulse text-sm text-zinc-400">Loading…</p>
      </Shell>
    );
  }

  if (load === 'error' || !board) {
    return <RetryError onRetry={() => void retryFromError(setLoad, refresh)} />;
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-black font-sans">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-50">
        <h1 className="truncate text-lg font-semibold tracking-tight">
          {team?.name ?? 'Your team'}
        </h1>
        <div className="flex shrink-0 items-center gap-4 text-sm">
          <span className="tabular-nums text-zinc-300">{countdownLabel(board, now)}</span>
          <span className="text-zinc-400">
            Found <span className="font-semibold text-zinc-100">{team?.foundAgents.length ?? 0}</span>
          </span>
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <BoardMap
          map={board.map}
          misterxAgents={board.misterxAgents}
          utilityAgents={board.utilityAgents}
        />
      </div>
    </div>
  );
}

/** Re-enter the loading state and retry; drop back to error if it fails again. */
async function retryFromError(
  setLoad: (l: Load) => void,
  refresh: () => Promise<boolean>,
) {
  setLoad('loading');
  const ok = await refresh();
  setLoad(ok ? 'ready' : 'error');
}

function RetryError({ onRetry }: { onRetry: () => void }) {
  return (
    <Shell>
      <div className="flex flex-col items-center gap-4 px-6 text-center">
        <p className="text-sm text-zinc-400">
          Couldn&apos;t load the board. Check your connection and try again.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-800"
        >
          Retry
        </button>
      </div>
    </Shell>
  );
}

/** Centered full-screen shell for the loading/error states. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[100dvh] items-center justify-center bg-black font-sans">
      {children}
    </div>
  );
}
