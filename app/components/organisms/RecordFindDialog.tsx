'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/atoms/Button';
import { Select } from '@/app/components/atoms/Select';
import { FormField } from '@/app/components/molecules/FormField';
import { Modal } from '@/app/components/molecules/Modal';
import type { AgentResource, TeamResource } from '@/app/types/api';

interface RecordFindDialogProps {
  gameId: string;
  team: TeamResource;
  /** Live roster, supplied by the caller (which owns the AgentsProvider context). */
  agents: AgentResource[];
  onClose: () => void;
}

// Operator manual find (see docs/adr/0013). A faithful fallback for a failed
// field scan: the operator picks an agent, confirms, and the find is recorded
// through the same write-side as a participant find.
export default function RecordFindDialog({ gameId, team, agents, onClose }: RecordFindDialogProps) {
  const router = useRouter();

  // Pre-filter to exactly what the backend accepts: active Mister X this team
  // hasn't found yet (the sole findable identity, ADR 0011). The operator can
  // never pick a losing option.
  const foundIds = useMemo(() => new Set(team.foundAgents.map((a) => a.id)), [team.foundAgents]);
  const findable = useMemo(
    () =>
      agents.filter((a) => a.type === 'MISTERX' && a.active && !foundIds.has(a.id)),
    [agents, foundIds],
  );

  const [agentId, setAgentId] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = findable.find((a) => a.id === agentId) ?? null;

  const handleRecord = async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/games/${gameId}/teams/${team.id}/find`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: selected.id }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? 'Fund konnte nicht erfasst werden');
      }

      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen');
      setLoading(false);
      setConfirming(false);
    }
  };

  if (confirming && selected) {
    return (
      <Modal title="Fund erfassen" onClose={() => !loading && onClose()}>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Erfassen, dass <span className="font-medium">{team.name}</span>{' '}
          <span className="font-medium">{selected.alias}</span> gefunden hat? Das kann nicht
          rückgängig gemacht werden.
        </p>
        {error && <p className="mb-4 text-xs text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setConfirming(false)}
            disabled={loading}
          >
            Zurück
          </Button>
          <Button type="button" size="sm" onClick={handleRecord} disabled={loading}>
            {loading ? '…' : 'Fund erfassen'}
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Fund erfassen — ${team.name}`} onClose={onClose}>
      {findable.length === 0 ? (
        <>
          <p className="mb-4 text-sm text-zinc-500">
            Für dieses Team gibt es gerade keine Agenten zum Finden.
          </p>
          <div className="flex justify-end">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Schließen
            </Button>
          </div>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (selected) setConfirming(true);
          }}
          className="flex flex-col gap-4"
        >
          <FormField label="Gefundener Agent" htmlFor="findAgent" required>
            <Select
              id="findAgent"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              required
              autoFocus
            >
              <option value="" disabled>
                Agent auswählen …
              </option>
              {findable.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.alias}
                </option>
              ))}
            </Select>
          </FormField>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Abbrechen
            </Button>
            <Button type="submit" size="sm" disabled={!selected}>
              Fund erfassen
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
