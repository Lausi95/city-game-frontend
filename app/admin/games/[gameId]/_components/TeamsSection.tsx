'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, QrCode, Target, Trash2 } from 'lucide-react';
import { Button } from '@/app/components/atoms/Button';
import { Input } from '@/app/components/atoms/Input';
import { ConfirmDialog } from '@/app/components/molecules/ConfirmDialog';
import EditTeamDialog from '@/app/components/organisms/EditTeamDialog';
import RecordFindDialog from '@/app/components/organisms/RecordFindDialog';
import type { TeamResource } from '@/app/types/api';
import { useAgents } from './AgentsProvider';

interface TeamsSectionProps {
  gameId: string;
  teams: TeamResource[];
}

export default function TeamsSection({ gameId, teams }: TeamsSectionProps) {
  const router = useRouter();
  const { agents } = useAgents();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [teamToEdit, setTeamToEdit] = useState<TeamResource | null>(null);
  const [teamToRecordFind, setTeamToRecordFind] = useState<TeamResource | null>(null);
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTeamToRecordFind(team)}
                  aria-label={`Record find for team ${team.name}`}
                  className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  <Target className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTeamToEdit(team)}
                  aria-label={`Edit team ${team.name}`}
                  className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
                <a
                  href={`/api/admin/games/${gameId}/teams/${team.id}/setup-qr`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open setup QR for team ${team.name}`}
                >
                  <Button variant="ghost" size="sm">
                    <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
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
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {teamToEdit && (
        <EditTeamDialog
          gameId={gameId}
          team={teamToEdit}
          onClose={() => setTeamToEdit(null)}
        />
      )}

      {teamToRecordFind && (
        <RecordFindDialog
          gameId={gameId}
          team={teamToRecordFind}
          agents={agents}
          onClose={() => setTeamToRecordFind(null)}
        />
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
