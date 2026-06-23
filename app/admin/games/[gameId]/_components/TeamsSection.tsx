'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, QrCode, Target, Trash2 } from 'lucide-react';
import { Button } from '@/app/components/atoms/Button';
import { Input } from '@/app/components/atoms/Input';
import { Pagination } from '@/app/components/molecules/Pagination';
import { Tooltip } from '@/app/components/molecules/Tooltip';
import { IconLegend, type IconLegendEntry } from '@/app/components/molecules/IconLegend';
import { ConfirmDialog } from '@/app/components/molecules/ConfirmDialog';
import EditTeamDialog from '@/app/components/organisms/EditTeamDialog';
import RecordFindDialog from '@/app/components/organisms/RecordFindDialog';
import SetupQrDialog from '@/app/components/organisms/SetupQrDialog';
import type { TeamResource } from '@/app/types/api';
import { useAgents } from './AgentsProvider';

const PAGE_SIZE = 10;

const LEGEND: IconLegendEntry[] = [
  {
    icon: QrCode,
    label: 'Setup-QR anzeigen',
    description:
      'Öffnet den Setup-QR des Teams; am besten ausdrucken, damit Mitglieder ihre Geräte selbst einrichten.',
  },
  {
    icon: Target,
    label: 'Fund erfassen',
    description:
      'Erfasst manuell, dass das Team einen Agenten gefunden hat. Notlösung, wenn das Team den Find-QR nicht selbst scannen kann.',
  },
  {
    icon: Pencil,
    label: 'Bearbeiten',
    description: 'Ändert den Teamnamen.',
  },
  {
    icon: Trash2,
    label: 'Löschen',
    description: 'Entfernt das Team dauerhaft. Nicht umkehrbar.',
  },
];

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
  const [teamToShowQr, setTeamToShowQr] = useState<TeamResource | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<TeamResource | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Client-side pagination over the server-rendered teams. See docs/adr/0026.
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(teams.length / PAGE_SIZE));
  // Clamp when the current page empties (e.g. after deleting its last team).
  useEffect(() => {
    if (page > totalPages - 1) setPage(totalPages - 1);
  }, [page, totalPages]);
  const visibleTeams = teams.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

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
        throw new Error(err.detail ?? 'Team konnte nicht erstellt werden');
      }

      setName('');
      // Land on the page the new team will occupy so the operator sees it.
      setPage(Math.ceil((teams.length + 1) / PAGE_SIZE) - 1);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen');
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
        throw new Error(err.detail ?? 'Team konnte nicht gelöscht werden');
      }

      setTeamToDelete(null);
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <h2 className="mb-1 text-lg font-medium">Teams</h2>
      <p className="mb-4 text-xs text-muted">
        QR-Code scannen, um ein Gerät diesem Team zuzuweisen. Am besten ausdrucken, damit
        Teammitglieder ihre Geräte selbst einrichten können.
      </p>

      <IconLegend entries={LEGEND} />

      <form onSubmit={handleCreate} className="mb-4 flex gap-2">
        <Input
          placeholder="Teamname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Button type="submit" disabled={loading} size="sm" className="shrink-0">
          {loading ? '…' : 'Hinzufügen'}
        </Button>
      </form>

      {error && <p className="mb-2 text-xs text-danger">{error}</p>}

      {teams.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(0, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
        />
      )}

      {teams.length === 0 ? (
        <p className="text-sm text-muted">Noch keine Teams.</p>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {visibleTeams.map((team) => (
            <div key={team.id} className="flex items-center justify-between px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">{team.name}</p>
                <p className="text-xs text-muted">
                  {team.memberCount} {team.memberCount === 1 ? 'Mitglied' : 'Mitglieder'} ·{' '}
                  {team.foundAgents.length} gefunden
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Tooltip label="Setup-QR anzeigen">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTeamToShowQr(team)}
                    aria-label={`Setup-QR für Team ${team.name} öffnen`}
                  >
                    <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </Tooltip>
                <Tooltip label="Fund erfassen">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTeamToRecordFind(team)}
                    aria-label={`Fund für Team ${team.name} erfassen`}
                    className="text-muted hover:text-foreground"
                  >
                    <Target className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </Tooltip>
                <Tooltip label="Bearbeiten">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTeamToEdit(team)}
                    aria-label={`Team ${team.name} bearbeiten`}
                    className="text-muted hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </Tooltip>
                <Tooltip label="Löschen">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDeleteError(null);
                      setTeamToDelete(team);
                    }}
                    aria-label={`Team ${team.name} löschen`}
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

      {teamToShowQr && (
        <SetupQrDialog
          kind="team"
          src={`/api/admin/games/${gameId}/teams/${teamToShowQr.id}/setup-qr`}
          printName={teamToShowQr.name}
          onClose={() => setTeamToShowQr(null)}
        />
      )}

      {teamToDelete && (
        <ConfirmDialog
          title="Team löschen"
          description={`„${teamToDelete.name}" löschen? Dieses Team hat ${teamToDelete.memberCount} ${teamToDelete.memberCount !== 1 ? 'Mitglieder' : 'Mitglied'} und ${teamToDelete.foundAgents.length} ${teamToDelete.foundAgents.length !== 1 ? 'gefundene Agenten' : 'gefundenen Agenten'}. Das kann nicht rückgängig gemacht werden.`}
          confirmLabel="Löschen"
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
