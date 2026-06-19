'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/atoms/Button';
import { Input } from '@/app/components/atoms/Input';
import { ConfirmDialog } from '@/app/components/molecules/ConfirmDialog';
import type { TeamResource } from '@/app/types/api';

interface TeamsSectionProps {
  gameId: string;
  teams: TeamResource[];
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 6.527A2 2 0 0 0 5.848 13.5h4.304a2 2 0 0 0 1.983-1.473L12.95 5.5h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.788l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function TeamsSection({ gameId, teams }: TeamsSectionProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [teamToDelete, setTeamToDelete] = useState<TeamResource | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/games/${gameId}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? 'Failed to create team');
      }

      setName('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!teamToDelete) return;
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/admin/games/${gameId}/teams/${teamToDelete.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? 'Failed to delete team');
      }

      setTeamToDelete(null);
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <h2 className="mb-4 text-lg font-medium">Teams</h2>

      <form onSubmit={handleCreate} className="mb-4 flex gap-2">
        <Input
          placeholder="Team name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Button type="submit" disabled={loading} size="sm" className="shrink-0">
          {loading ? '…' : 'Add'}
        </Button>
      </form>

      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      {teams.length === 0 ? (
        <p className="text-sm text-zinc-500">No teams yet.</p>
      ) : (
        <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
          {teams.map((team) => (
            <div key={team.id} className="flex items-center justify-between px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">{team.name}</p>
                <p className="text-xs text-zinc-500">
                  {team.memberCount} members · {team.foundAgents.length} found
                </p>
              </div>
              <div className="flex items-center gap-1">
                <a
                  href={`/api/admin/games/${gameId}/teams/${team.id}/setup-qr`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="sm">
                    QR
                  </Button>
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDeleteError(null);
                    setTeamToDelete(team);
                  }}
                  aria-label={`Delete team ${team.name}`}
                  className="text-zinc-400 hover:text-red-600"
                >
                  <TrashIcon />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {teamToDelete && (
        <ConfirmDialog
          title="Delete team"
          description={`Delete "${teamToDelete.name}"? This team has ${teamToDelete.memberCount} member${teamToDelete.memberCount !== 1 ? 's' : ''} and ${teamToDelete.foundAgents.length} found agent${teamToDelete.foundAgents.length !== 1 ? 's' : ''}. This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => {
            if (!deleteLoading) {
              setTeamToDelete(null);
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
