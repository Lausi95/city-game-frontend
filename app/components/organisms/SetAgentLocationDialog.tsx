'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button } from '@/app/components/atoms/Button';
import { Modal } from '@/app/components/molecules/Modal';
import type { AgentResource, MapResource } from '@/app/types/api';
import type { Point } from './SetAgentLocationMap';

// Leaflet touches `window` at import time, so the picker is client-only.
const SetAgentLocationMap = dynamic(() => import('./SetAgentLocationMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 w-full animate-pulse items-center justify-center rounded-md bg-surface-raised text-sm text-muted">
      Karte wird geladen …
    </div>
  ),
});

interface SetAgentLocationDialogProps {
  gameId: string;
  agent: AgentResource;
  map: MapResource;
  onClose: () => void;
}

/** True when the point lies outside the playfield rectangle (edges inclusive). */
function isOutOfBounds(map: MapResource, point: Point): boolean {
  const minLat = Math.min(map.cornerA.latitude, map.cornerB.latitude);
  const maxLat = Math.max(map.cornerA.latitude, map.cornerB.latitude);
  const minLng = Math.min(map.cornerA.longitude, map.cornerB.longitude);
  const maxLng = Math.max(map.cornerA.longitude, map.cornerB.longitude);
  return (
    point.latitude < minLat ||
    point.latitude > maxLat ||
    point.longitude < minLng ||
    point.longitude > maxLng
  );
}

// Operator manual location (see docs/adr/0035). A faithful fallback for an agent
// whose device cannot report: the operator clicks a point on the map and the fix
// is recorded through the same write-side as a participant report. No second
// confirm — the position is freely overwritten by the agent's next real fix, and
// the dialog's own "Position setzen" button is the deliberate action.
export default function SetAgentLocationDialog({
  gameId,
  agent,
  map,
  onClose,
}: SetAgentLocationDialogProps) {
  const router = useRouter();

  // Pre-seed the marker at the agent's current position so the operator can nudge
  // it; null when the agent has never reported (they pick a fresh point).
  const [point, setPoint] = useState<Point | null>(
    agent.location
      ? { latitude: agent.location.latitude, longitude: agent.location.longitude }
      : null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const outside = point !== null && isOutOfBounds(map, point);

  const handleSet = async () => {
    if (!point) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/games/${gameId}/agents/${agent.id}/location`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(point),
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? 'Position konnte nicht gesetzt werden');
      }

      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen');
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`Position setzen — ${agent.alias}`}
      onClose={() => !loading && onClose()}
      className="max-w-2xl"
    >
      <p className="mb-3 text-sm text-muted">
        Tippe auf die Karte, um die Position von{' '}
        <span className="font-medium">{agent.alias}</span> zu setzen. Sie wird wie
        eine vom Gerät gemeldete Position erfasst und ist sofort auf dem Spielbrett
        sichtbar.
      </p>

      <SetAgentLocationMap map={map} point={point} agentType={agent.type} onPick={setPoint} />

      <div className="mt-2 flex min-h-4 items-center gap-3 text-xs">
        {point ? (
          <span className="text-muted">
            {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
          </span>
        ) : (
          <span className="text-muted">Noch kein Punkt gewählt.</span>
        )}
        {outside && <span className="text-danger">Außerhalb des Spielfelds</span>}
      </div>

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={loading}>
          Abbrechen
        </Button>
        <Button type="button" size="sm" onClick={handleSet} disabled={!point || loading}>
          {loading ? '…' : 'Position setzen'}
        </Button>
      </div>
    </Modal>
  );
}
