'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/atoms/Button';
import { Input } from '@/app/components/atoms/Input';
import { FormField } from '@/app/components/molecules/FormField';
import { Modal } from '@/app/components/molecules/Modal';
import { buildPatch } from '@/app/lib/patch';
import type { TeamResource } from '@/app/types/api';

interface EditTeamDialogProps {
  gameId: string;
  team: TeamResource;
  onClose: () => void;
}

export default function EditTeamDialog({ gameId, team, onClose }: EditTeamDialogProps) {
  const router = useRouter();
  const [name, setName] = useState(team.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = name.trim();
  const nameChanged = trimmed !== team.name.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed) return; // require non-empty

    // Nothing changed → close without a request (null ≡ omit ≡ no-change).
    if (!nameChanged) {
      onClose();
      return;
    }

    setLoading(true);
    setError(null);

    const body = buildPatch([{ key: 'name', value: trimmed, changed: nameChanged }]);

    try {
      const res = await fetch(`/api/admin/games/${gameId}/teams/${team.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? 'Team konnte nicht aktualisiert werden');
      }

      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen');
      setLoading(false);
    }
  };

  return (
    <Modal title="Team bearbeiten" onClose={() => !loading && onClose()}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Teamname" htmlFor="teamName" required>
          <Input
            id="teamName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </FormField>

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
          <Button type="submit" size="sm" disabled={loading || !trimmed}>
            {loading ? '…' : 'Speichern'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
