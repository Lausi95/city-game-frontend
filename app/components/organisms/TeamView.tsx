'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { QrCode, Trophy } from 'lucide-react';
import type { BoardResource, TeamResource } from '@/app/types/api';
import ScanQrButton from '@/app/components/molecules/ScanQrButton';

interface TeamViewProps {
  gameId: string;
  teamId: string;
}

type Load = 'loading' | 'ready' | 'error';

// Leaflet touches `window` at import time, so the map is client-only.
const BoardMap = dynamic(() => import('@/app/components/organisms/BoardMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-surface-raised text-sm text-muted">
      Karte wird geladen …
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
  if (now < start) return `Beginnt in ${formatSpan(start - now)}`;
  if (now <= end) return `Endet in ${formatSpan(end - now)}`;
  return 'Beendet';
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
        <p className="animate-pulse text-sm text-muted">Wird geladen …</p>
      </Shell>
    );
  }

  if (load === 'error' || !board) {
    return <RetryError onRetry={() => void retryFromError(setLoad, refresh)} />;
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-background font-sans">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 text-foreground">
        <h1 className="truncate text-lg font-semibold tracking-tight">
          {team?.name ?? 'Dein Team'}
        </h1>
        <div className="flex shrink-0 items-center gap-4 text-sm">
          <span className="tabular-nums text-muted">{countdownLabel(board, now)}</span>
          <span className="text-muted">
            Gefunden <span className="font-semibold text-foreground">{team?.foundAgents.length ?? 0}</span>
          </span>
          <ScanQrButton
            dialogTitle="QR-Code scannen"
            hint="Richte die Kamera auf den Finde-QR-Code des Agenten."
            variant="ghost"
            size="sm"
            aria-label="QR scannen"
            title="QR scannen"
            className="px-1.5 text-muted hover:text-foreground"
          >
            <QrCode className="h-5 w-5" aria-hidden="true" />
          </ScanQrButton>
          <Link
            href="/leaderboard"
            aria-label="Rangliste"
            title="Rangliste"
            className="text-muted transition-colors hover:text-foreground"
          >
            <Trophy className="h-5 w-5" aria-hidden="true" />
          </Link>
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
        <p className="text-sm text-muted">
          Das Spielbrett konnte nicht geladen werden. Prüfe deine Verbindung und versuche es erneut.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-border-strong bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-raised"
        >
          Erneut versuchen
        </button>
      </div>
    </Shell>
  );
}

/** Centered full-screen shell for the loading/error states. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[100dvh] items-center justify-center bg-background font-sans">
      {children}
    </div>
  );
}
