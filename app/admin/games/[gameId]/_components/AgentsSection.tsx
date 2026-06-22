'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, QrCode } from 'lucide-react';
import { Button } from '@/app/components/atoms/Button';
import { Input } from '@/app/components/atoms/Input';
import { Select } from '@/app/components/atoms/Select';
import { FormField } from '@/app/components/molecules/FormField';
import { Badge } from '@/app/components/atoms/Badge';
import { LastSeenIndicator } from '@/app/components/molecules/LastSeenIndicator';
import EditAgentDialog from '@/app/components/organisms/EditAgentDialog';
import { useAgents } from './AgentsProvider';
import type { AgentResource } from '@/app/types/api';

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

  // Live agent state + wall-clock are owned by AgentsProvider so the list and
  // the map share one polled source. See docs/adr/0003 and docs/adr/0006.
  const { agents, now } = useAgents();

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
        throw new Error(err.detail ?? 'Failed to create agent');
      }

      setForm(defaultForm);
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const set = (key: keyof typeof defaultForm, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium">Agents</h2>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setShowForm((v) => !v);
            setError(null);
          }}
        >
          {showForm ? 'Cancel' : 'Add Agent'}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-4 flex flex-col gap-3 rounded-lg border border-zinc-200 p-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <FormField label="First name" htmlFor="firstName" required>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                required
              />
            </FormField>
            <FormField label="Last name" htmlFor="lastName" required>
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
                placeholder="In-game alias"
              />
            </FormField>
            <FormField label="Phone number" htmlFor="phoneNumber" required>
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
            <FormField label="Type" htmlFor="type" required>
              <Select
                id="type"
                value={form.type}
                onChange={(e) => set('type', e.target.value as 'MISTERX' | 'UTILITY')}
              >
                <option value="MISTERX">MISTERX</option>
                <option value="UTILITY">UTILITY</option>
              </Select>
            </FormField>
            <FormField label="Active" htmlFor="active">
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="active"
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => set('active', e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                <label htmlFor="active" className="text-sm text-zinc-600">
                  Active
                </label>
              </div>
            </FormField>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={loading} size="sm">
              {loading ? 'Creating…' : 'Create Agent'}
            </Button>
          </div>
        </form>
      )}

      {agents.length === 0 ? (
        <p className="text-sm text-zinc-500">No agents yet.</p>
      ) : (
        <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
          {agents.map((agent) => (
            <div key={agent.id} className="flex items-center justify-between px-3 py-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{agent.alias}</p>
                  <Badge color={agent.type === 'MISTERX' ? 'red' : 'blue'}>{agent.type}</Badge>
                  {!agent.active && <Badge color="zinc">Inactive</Badge>}
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
                  aria-label={`Edit agent ${agent.alias}`}
                  className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
                <a
                  href={`/api/admin/games/${gameId}/agents/${agent.id}/setup-qr`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open setup QR for agent ${agent.alias}`}
                >
                  <Button variant="ghost" size="sm">
                    <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </a>
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
    </div>
  );
}
