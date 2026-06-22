'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/atoms/Button';
import { Input } from '@/app/components/atoms/Input';
import { Select } from '@/app/components/atoms/Select';
import { FormField } from '@/app/components/molecules/FormField';
import { Modal } from '@/app/components/molecules/Modal';
import { buildPatch } from '@/app/lib/patch';
import type { AgentResource } from '@/app/types/api';

interface EditAgentDialogProps {
  gameId: string;
  agent: AgentResource;
  /** Whether the agent's type may still be changed (only before kickoff). */
  canEditType: boolean;
  onClose: () => void;
}

export default function EditAgentDialog({
  gameId,
  agent,
  canEditType,
  onClose,
}: EditAgentDialogProps) {
  const router = useRouter();
  const [type, setType] = useState(agent.type);
  const [firstName, setFirstName] = useState(agent.firstName);
  const [lastName, setLastName] = useState(agent.lastName);
  const [alias, setAlias] = useState(agent.alias);
  const [phoneNumber, setPhoneNumber] = useState(agent.phoneNumber);
  const [active, setActive] = useState(agent.active);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedFirst = firstName.trim();
  const trimmedLast = lastName.trim();
  const trimmedAlias = alias.trim();
  const trimmedPhone = phoneNumber.trim();

  const allRequiredFilled =
    trimmedFirst && trimmedLast && trimmedAlias && trimmedPhone;

  // type only ever changes when the control is enabled (before kickoff).
  const typeChanged = canEditType && type !== agent.type;
  const firstNameChanged = trimmedFirst !== agent.firstName.trim();
  const lastNameChanged = trimmedLast !== agent.lastName.trim();
  const aliasChanged = trimmedAlias !== agent.alias.trim();
  const phoneChanged = trimmedPhone !== agent.phoneNumber.trim();
  const activeChanged = active !== agent.active;

  const anyChanged =
    typeChanged ||
    firstNameChanged ||
    lastNameChanged ||
    aliasChanged ||
    phoneChanged ||
    activeChanged;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allRequiredFilled) return;

    // Nothing changed → close without a request (null ≡ omit ≡ no-change).
    if (!anyChanged) {
      onClose();
      return;
    }

    setLoading(true);
    setError(null);

    const body = buildPatch([
      { key: 'type', value: type, changed: typeChanged },
      { key: 'firstName', value: trimmedFirst, changed: firstNameChanged },
      { key: 'lastName', value: trimmedLast, changed: lastNameChanged },
      { key: 'alias', value: trimmedAlias, changed: aliasChanged },
      { key: 'phoneNumber', value: trimmedPhone, changed: phoneChanged },
      { key: 'active', value: active, changed: activeChanged },
    ]);

    try {
      const res = await fetch(`/api/admin/games/${gameId}/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? 'Agent konnte nicht aktualisiert werden');
      }

      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen');
      setLoading(false);
    }
  };

  return (
    <Modal title="Agent bearbeiten" onClose={() => !loading && onClose()}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Vorname" htmlFor="firstName" required>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              autoFocus
            />
          </FormField>
          <FormField label="Nachname" htmlFor="lastName" required>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Alias" htmlFor="alias" required>
            <Input
              id="alias"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              required
              placeholder="Alias im Spiel"
            />
          </FormField>
          <FormField label="Telefonnummer" htmlFor="phoneNumber" required>
            <Input
              id="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Typ" htmlFor="type" required>
            <Select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as 'MISTERX' | 'UTILITY')}
              disabled={!canEditType}
            >
              <option value="MISTERX">Mister X</option>
              <option value="UTILITY">Hilfsagent</option>
            </Select>
            {!canEditType && (
              <p className="mt-1 text-xs text-muted">
                Der Typ ist gesperrt, sobald das Spiel begonnen hat.
              </p>
            )}
          </FormField>
          <FormField label="Aktiv" htmlFor="active">
            <div className="flex items-center gap-2 pt-1">
              <input
                id="active"
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4 rounded border-border-strong"
              />
              <label htmlFor="active" className="text-sm text-muted">
                Aktiv
              </label>
            </div>
          </FormField>
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            Abbrechen
          </Button>
          <Button type="submit" size="sm" disabled={loading || !allRequiredFilled}>
            {loading ? '…' : 'Speichern'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
