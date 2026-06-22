'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { QrCode } from 'lucide-react';
import { Badge } from '@/app/components/atoms/Badge';
import { Button } from '@/app/components/atoms/Button';
import FindQrDialog from '@/app/components/organisms/FindQrDialog';
import { StatTile } from '@/app/components/molecules/StatTile';
import { LastSeenIndicator } from '@/app/components/molecules/LastSeenIndicator';
import {
  useAgentLocationReporting,
  type ReportingStatus,
} from '@/app/lib/useAgentLocationReporting';
import type { AgentResource, GeoLocation, MapDto } from '@/app/types/api';

// Leaflet touches `window` at import time, so the bounds map is client-only.
const AgentBoundsMap = dynamic(
  () => import('@/app/components/organisms/AgentBoundsMap'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-sm text-zinc-400 dark:bg-zinc-900">
        Karte wird geladen …
      </div>
    ),
  },
);

/** Where the agent sits relative to the playfield. `unknown` = no fix or no map yet. */
type Bounds = 'unknown' | 'in' | 'out';

/** Inside the playfield rectangle, edges inclusive; corner order normalised. */
function computeBounds(map: MapDto | null, fix: GeoLocation | null): Bounds {
  if (!map || !fix) return 'unknown';
  const minLat = Math.min(map.cornerA.latitude, map.cornerB.latitude);
  const maxLat = Math.max(map.cornerA.latitude, map.cornerB.latitude);
  const minLng = Math.min(map.cornerA.longitude, map.cornerB.longitude);
  const maxLng = Math.max(map.cornerA.longitude, map.cornerB.longitude);
  const inside =
    fix.latitude >= minLat &&
    fix.latitude <= maxLat &&
    fix.longitude >= minLng &&
    fix.longitude <= maxLng;
  return inside ? 'in' : 'out';
}

interface AgentViewProps {
  gameId: string;
  agentId: string;
}

type Load = 'loading' | 'ready' | 'error';

const TYPE_LABELS: Record<AgentResource['type'], string> = {
  MISTERX: 'Mister X',
  UTILITY: 'Hilfsagent',
};

// Banner copy per reporting status. 'reporting' shows nothing (all good);
// 'prompting' is the brief pre-permission window.
const REPORTING_BANNER: Partial<Record<ReportingStatus, string>> = {
  prompting: 'Standortzugriff wird angefragt … erlaube ihn, damit deine Position übermittelt wird.',
  denied:
    'Standortzugriff ist aus — deine Position wird nicht übermittelt. Aktiviere den Standort für diese Seite, um wieder auf der Karte zu erscheinen.',
  unavailable:
    'Dein Standort kann gerade nicht gelesen werden — deine Position ist möglicherweise nicht mehr aktuell.',
};

export default function AgentView({ gameId, agentId }: AgentViewProps) {
  const [load, setLoad] = useState<Load>('loading');
  const [agent, setAgent] = useState<AgentResource | null>(null);
  const [map, setMap] = useState<MapDto | null>(null);
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

  // The playfield rectangle is fixed for a game, so fetch it once. Its absence only
  // hides the bounds map/banner — it never blocks the rest of the self-view.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(
          `/api/participant/map?gameId=${encodeURIComponent(gameId)}`,
        );
        if (res.ok && active) setMap(await res.json());
      } catch {
        // Non-fatal: no playfield map this load; the bounds UI simply stays hidden.
      }
    })();
    return () => {
      active = false;
    };
  }, [gameId]);

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

  // Report our position while this view is open (foreground-only). The same live
  // fix drives the Out-of-bounds check, so marker/banner/server can't disagree.
  const { status: reportingStatus, fix } = useAgentLocationReporting(gameId, agentId);
  // Only trust the fix while we're actively reporting. After a sensor loss the hook
  // keeps the last fix (for the heartbeat) but flips status to unavailable/denied —
  // a stale fix must read as 'unknown', not keep asserting in/out (see ADR 0012).
  const bounds = reportingStatus === 'reporting' ? computeBounds(map, fix) : 'unknown';

  if (load === 'loading') {
    return (
      <Shell>
        <p className="animate-pulse text-sm text-zinc-400">Wird geladen …</p>
      </Shell>
    );
  }

  if (load === 'error' || !agent) {
    return (
      <Shell>
        <p className="text-sm text-zinc-500">
          Deine Agentendaten konnten nicht geladen werden. Prüfe deine Verbindung und versuche es erneut.
        </p>
      </Shell>
    );
  }

  const banner = REPORTING_BANNER[reportingStatus];

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
              ? 'Du bist im Spiel. Bleib in Bewegung.'
              : 'Du bist derzeit inaktiv — die Teams jagen dich gerade nicht.'}
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

        {/* Out-of-bounds is only claimed when we have a real fix outside the playfield;
            an unknown position falls back to the reporting banner above. */}
        {bounds === 'out' && (
          <p
            role="alert"
            className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          >
            Du bist außerhalb des Spielfelds — geh zurück ins Spielgebiet.
          </p>
        )}

        {canShowFindQr && (
          <Button
            className="flex w-full items-center justify-center gap-2"
            onClick={() => setShowFindQr(true)}
          >
            <QrCode className="h-4 w-4" aria-hidden="true" />
            Fund-QR anzeigen
          </Button>
        )}

        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Typ">
            <Badge color={agent.type === 'MISTERX' ? 'red' : 'blue'}>
              {TYPE_LABELS[agent.type]}
            </Badge>
          </StatTile>
          <StatTile label="Status">
            <Badge color={agent.active ? 'green' : 'zinc'}>
              {agent.active ? 'Aktiv' : 'Inaktiv'}
            </Badge>
          </StatTile>
          <StatTile label="Name">
            {agent.firstName} {agent.lastName}
          </StatTile>
          <StatTile label="Telefon">{agent.phoneNumber}</StatTile>
          <div className="col-span-2">
            <StatTile label="Zuletzt gesehen">
              <LastSeenIndicator location={agent.location} now={now} />
            </StatTile>
          </div>
          {/* Playfield bounds — shown only once the playfield rectangle has loaded.
              'unknown' (no fix yet) reads as "Locating…", never "Out of bounds". */}
          {map && (
            <>
              <div className="col-span-2">
                <StatTile label="Spielfeld">
                  {bounds === 'in' ? (
                    <Badge color="green">Im Spielfeld</Badge>
                  ) : bounds === 'out' ? (
                    <Badge color="red">Außerhalb</Badge>
                  ) : (
                    <span className="text-zinc-500">Wird geortet …</span>
                  )}
                </StatTile>
              </div>
              <div className="col-span-2 h-56 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                <AgentBoundsMap
                  map={map}
                  position={fix}
                  outOfBounds={bounds === 'out'}
                />
              </div>
            </>
          )}
          {/* Variable-length list — span the full row, one row per team. */}
          <div className="col-span-2">
            <StatTile label="Gefunden von">
              {agent.foundByTeams.length === 0 ? (
                <span className="text-zinc-500">Noch nicht gefunden</span>
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
