'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Pencil, QrCode, Trash2 } from 'lucide-react';
import { Button } from '@/app/components/atoms/Button';
import { Tooltip } from '@/app/components/molecules/Tooltip';
import { IconLegend, type IconLegendEntry } from '@/app/components/molecules/IconLegend';
import { Input } from '@/app/components/atoms/Input';
import { Select } from '@/app/components/atoms/Select';
import { FormField } from '@/app/components/molecules/FormField';
import { Pagination } from '@/app/components/molecules/Pagination';
import { Badge } from '@/app/components/atoms/Badge';
import { LastSeenIndicator } from '@/app/components/molecules/LastSeenIndicator';
import EditAgentDialog from '@/app/components/organisms/EditAgentDialog';
import SetupQrDialog from '@/app/components/organisms/SetupQrDialog';
import SetAgentLocationDialog from '@/app/components/organisms/SetAgentLocationDialog';
import { ConfirmDialog } from '@/app/components/molecules/ConfirmDialog';
import { useAgents } from './AgentsProvider';
import type { AgentResource, MapResource } from '@/app/types/api';

const PAGE_SIZE = 10;

const LEGEND: IconLegendEntry[] = [
  {
    icon: QrCode,
    label: 'Setup-QR anzeigen',
    description:
      'Öffnet den Setup-QR des Agenten; direkt vom Bildschirm scannen, um ein Gerät zuzuweisen.',
  },
  {
    icon: MapPin,
    label: 'Position setzen',
    description:
      'Setzt den Standort des Agenten manuell. Notlösung, wenn sein Gerät keinen oder einen falschen Standort meldet (z. B. Seite geschlossen).',
  },
  {
    icon: Pencil,
    label: 'Bearbeiten',
    description:
      'Ändert die Agentendaten (Name, Alias, Telefon, Typ, Aktiv-Status). Der Typ ist nur vor Spielstart änderbar.',
  },
  {
    icon: Trash2,
    label: 'Löschen',
    description: 'Entfernt den Agenten dauerhaft. Nicht umkehrbar.',
  },
];

interface AgentsSectionProps {
  gameId: string;
  /** Whether agent types may still be changed (only before kickoff). */
  canEditType: boolean;
  /** Playfield, for the manual "set position" picker. */
  map: MapResource;
}

const defaultForm = {
  type: 'MISTERX' as 'MISTERX' | 'UTILITY',
  firstName: '',
  lastName: '',
  alias: '',
  phoneNumber: '',
  active: true,
};

export default function AgentsSection({ gameId, canEditType, map }: AgentsSectionProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [agentToEdit, setAgentToEdit] = useState<AgentResource | null>(null);
  const [agentToShowQr, setAgentToShowQr] = useState<AgentResource | null>(null);
  const [agentToLocate, setAgentToLocate] = useState<AgentResource | null>(null);
  const [agentToDelete, setAgentToDelete] = useState<AgentResource | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Live agent state + wall-clock are owned by AgentsProvider so the list and
  // the map share one polled source. See docs/adr/0003 and docs/adr/0006.
  const { agents, now } = useAgents();

  // Client-side pagination over the polled set (the map still gets all agents).
  // See docs/adr/0026.
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(agents.length / PAGE_SIZE));
  // Clamp if the set shrinks (e.g. a poll returns fewer agents than the page index).
  useEffect(() => {
    if (page > totalPages - 1) setPage(totalPages - 1);
  }, [page, totalPages]);
  const visibleAgents = agents.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/games/${gameId}/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? 'Agent konnte nicht erstellt werden');
      }

      setForm(defaultForm);
      setShowForm(false);
      // Land on the page the new agent will occupy so the operator sees it.
      setPage(Math.ceil((agents.length + 1) / PAGE_SIZE) - 1);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!agentToDelete) return;
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/admin/games/${gameId}/agents/${agentToDelete.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? 'Agent konnte nicht gelöscht werden');
      }

      setAgentToDelete(null);
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen');
    } finally {
      setDeleteLoading(false);
    }
  };

  const set = (key: keyof typeof defaultForm, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-lg font-medium">Agenten</h2>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setShowForm((v) => !v);
            setError(null);
          }}
        >
          {showForm ? 'Abbrechen' : 'Agent hinzufügen'}
        </Button>
      </div>
      <p className="mb-4 text-xs text-muted">
        QR-Code scannen, um ein Gerät diesem Agenten zuzuweisen. Da jeder Agent einzigartig ist und
        sich ohnehin bei der Spielleitung meldet, am besten direkt vom Bildschirm scannen.
      </p>

      <IconLegend entries={LEGEND} />

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-4 flex flex-col gap-3 rounded-lg border border-border p-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Vorname" htmlFor="firstName" required>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                required
              />
            </FormField>
            <FormField label="Nachname" htmlFor="lastName" required>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                required
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Alias" htmlFor="alias" required>
              <Input
                id="alias"
                value={form.alias}
                onChange={(e) => set('alias', e.target.value)}
                required
                placeholder="Alias im Spiel"
              />
            </FormField>
            <FormField label="Telefonnummer" htmlFor="phoneNumber" required>
              <Input
                id="phoneNumber"
                type="tel"
                value={form.phoneNumber}
                onChange={(e) => set('phoneNumber', e.target.value)}
                required
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Typ" htmlFor="type" required>
              <Select
                id="type"
                value={form.type}
                onChange={(e) => set('type', e.target.value as 'MISTERX' | 'UTILITY')}
              >
                <option value="MISTERX">Mister X</option>
                <option value="UTILITY">Hilfsagent</option>
              </Select>
            </FormField>
            <FormField label="Aktiv" htmlFor="active">
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="active"
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => set('active', e.target.checked)}
                  className="h-4 w-4 rounded border-border-strong"
                />
                <label htmlFor="active" className="text-sm text-muted">
                  Aktiv
                </label>
              </div>
            </FormField>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={loading} size="sm">
              {loading ? 'Wird erstellt …' : 'Agent erstellen'}
            </Button>
          </div>
        </form>
      )}

      {agents.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(0, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
        />
      )}

      {agents.length === 0 ? (
        <p className="text-sm text-muted">Noch keine Agenten.</p>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {visibleAgents.map((agent) => (
            <div key={agent.id} className="flex items-center justify-between px-3 py-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{agent.alias}</p>
                  <Badge color={agent.type === 'MISTERX' ? 'misterx' : 'utility'}>
                    {agent.type === 'MISTERX' ? 'Mister X' : 'Hilfsagent'}
                  </Badge>
                  {!agent.active && <Badge color="neutral">Inaktiv</Badge>}
                  <LastSeenIndicator location={agent.location} now={now} />
                </div>
                <p className="text-xs text-muted">
                  {agent.firstName} {agent.lastName} · {agent.phoneNumber}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Tooltip label="Setup-QR anzeigen">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAgentToShowQr(agent)}
                    aria-label={`Setup-QR für Agent ${agent.alias} öffnen`}
                  >
                    <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </Tooltip>
                <Tooltip label="Position setzen">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAgentToLocate(agent)}
                    aria-label={`Position von Agent ${agent.alias} setzen`}
                    className="text-muted hover:text-foreground"
                  >
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </Tooltip>
                <Tooltip label="Bearbeiten">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAgentToEdit(agent)}
                    aria-label={`Agent ${agent.alias} bearbeiten`}
                    className="text-muted hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </Tooltip>
                <Tooltip label="Löschen">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAgentToDelete(agent)}
                    aria-label={`Agent ${agent.alias} löschen`}
                    className="text-muted hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
      )}

      {agentToEdit && (
        <EditAgentDialog
          gameId={gameId}
          agent={agentToEdit}
          canEditType={canEditType}
          onClose={() => setAgentToEdit(null)}
        />
      )}

      {agentToShowQr && (
        <SetupQrDialog
          kind="agent"
          src={`/api/admin/games/${gameId}/agents/${agentToShowQr.id}/setup-qr`}
          printName={agentToShowQr.alias}
          onClose={() => setAgentToShowQr(null)}
        />
      )}

      {agentToLocate && (
        <SetAgentLocationDialog
          gameId={gameId}
          agent={agentToLocate}
          map={map}
          onClose={() => setAgentToLocate(null)}
        />
      )}

      {agentToDelete && (
        <ConfirmDialog
          title="Agent löschen"
          description={`„${agentToDelete.alias}" (${agentToDelete.firstName} ${agentToDelete.lastName}) löschen? Das kann nicht rückgängig gemacht werden.`}
          confirmLabel="Löschen"
          onConfirm={handleDelete}
          onCancel={() => {
            if (!deleteLoading) {
              setAgentToDelete(null);
              setDeleteError(null);
            }
          }}
          loading={deleteLoading}
          error={deleteError}
        />
      )}
    </div>
  );
}
