'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, QrCode } from 'lucide-react';
import { Button } from '@/app/components/atoms/Button';
import { Input } from '@/app/components/atoms/Input';
import { Select } from '@/app/components/atoms/Select';
import { FormField } from '@/app/components/molecules/FormField';
import { Pagination } from '@/app/components/molecules/Pagination';
import { Badge } from '@/app/components/atoms/Badge';
import { LastSeenIndicator } from '@/app/components/molecules/LastSeenIndicator';
import EditAgentDialog from '@/app/components/organisms/EditAgentDialog';
import SetupQrDialog from '@/app/components/organisms/SetupQrDialog';
import { useAgents } from './AgentsProvider';
import type { AgentResource } from '@/app/types/api';

const PAGE_SIZE = 10;

interface AgentsSectionProps {
  gameId: string;
  /** Whether agent types may still be changed (only before kickoff). */
  canEditType: boolean;
}

const defaultForm = {
  type: 'MISTERX' as 'MISTERX' | 'UTILITY',
  firstName: '',
  lastName: '',
  alias: '',
  phoneNumber: '',
  active: true,
};

export default function AgentsSection({ gameId, canEditType }: AgentsSectionProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [agentToEdit, setAgentToEdit] = useState<AgentResource | null>(null);
  const [agentToShowQr, setAgentToShowQr] = useState<AgentResource | null>(null);

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
      <p className="mb-4 text-xs text-zinc-500">
        QR-Code scannen, um ein Gerät diesem Agenten zuzuweisen. Da jeder Agent einzigartig ist und
        sich ohnehin bei der Spielleitung meldet, am besten direkt vom Bildschirm scannen.
      </p>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-4 flex flex-col gap-3 rounded-lg border border-zinc-200 p-4"
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
                  className="h-4 w-4 rounded border-zinc-300"
                />
                <label htmlFor="active" className="text-sm text-zinc-600">
                  Aktiv
                </label>
              </div>
            </FormField>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
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
        <p className="text-sm text-zinc-500">Noch keine Agenten.</p>
      ) : (
        <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
          {visibleAgents.map((agent) => (
            <div key={agent.id} className="flex items-center justify-between px-3 py-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{agent.alias}</p>
                  <Badge color={agent.type === 'MISTERX' ? 'red' : 'blue'}>
                    {agent.type === 'MISTERX' ? 'Mister X' : 'Hilfsagent'}
                  </Badge>
                  {!agent.active && <Badge color="zinc">Inaktiv</Badge>}
                  <LastSeenIndicator location={agent.location} now={now} />
                </div>
                <p className="text-xs text-zinc-500">
                  {agent.firstName} {agent.lastName} · {agent.phoneNumber}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAgentToEdit(agent)}
                  aria-label={`Agent ${agent.alias} bearbeiten`}
                  className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAgentToShowQr(agent)}
                  aria-label={`Setup-QR für Agent ${agent.alias} öffnen`}
                >
                  <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
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
    </div>
  );
}
