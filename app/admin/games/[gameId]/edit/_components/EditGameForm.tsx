'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button } from '@/app/components/atoms/Button';
import { Input } from '@/app/components/atoms/Input';
import { FormField } from '@/app/components/molecules/FormField';
import { buildPatch } from '@/app/lib/patch';
import type { Corner } from '@/app/components/organisms/MapSelector';

const MapSelector = dynamic(() => import('@/app/components/organisms/MapSelector'), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 w-full animate-pulse items-center justify-center rounded-md bg-surface-raised text-sm text-muted">
      Karte wird geladen …
    </div>
  ),
});

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

interface EditGameFormProps {
  gameId: string;
  initialTitle: string;
  initialStartTime: string;
  initialEndTime: string;
  initialCornerA: Corner;
  initialCornerB: Corner;
  initialRows: number;
  initialColumns: number;
}

export default function EditGameForm({
  gameId,
  initialTitle,
  initialStartTime,
  initialEndTime,
  initialCornerA,
  initialCornerB,
  initialRows,
  initialColumns,
}: EditGameFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [startTime, setStartTime] = useState(() => toDatetimeLocal(initialStartTime));
  const [endTime, setEndTime] = useState(() => toDatetimeLocal(initialEndTime));
  const [cornerA, setCornerA] = useState<Corner | null>(initialCornerA);
  const [cornerB, setCornerB] = useState<Corner | null>(initialCornerB);
  const [rows, setRows] = useState(initialRows);
  const [columns, setColumns] = useState(initialColumns);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const now = new Date();
  const startInPast = startTime !== '' && new Date(startTime) < now;
  const endInPast = endTime !== '' && new Date(endTime) < now;

  const handleCornersChange = useCallback((a: Corner | null, b: Corner | null) => {
    setCornerA(a);
    setCornerB(b);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cornerA || !cornerB) {
      setError('Bitte wähle beide Ecken auf der Karte');
      return;
    }

    setLoading(true);
    setError(null);

    const startTimeChanged =
      new Date(startTime).getTime() !== new Date(initialStartTime).getTime();
    const endTimeChanged = new Date(endTime).getTime() !== new Date(initialEndTime).getTime();
    const mapChanged =
      cornerA.lat !== initialCornerA.lat ||
      cornerA.lng !== initialCornerA.lng ||
      cornerB.lat !== initialCornerB.lat ||
      cornerB.lng !== initialCornerB.lng ||
      rows !== initialRows ||
      columns !== initialColumns;

    const body = buildPatch([
      { key: 'title', value: title, changed: title !== initialTitle },
      {
        key: 'startTime',
        value: new Date(startTime).toISOString(),
        changed: startTimeChanged,
      },
      { key: 'endTime', value: new Date(endTime).toISOString(), changed: endTimeChanged },
      {
        key: 'map',
        value: {
          cornerA: {
            latitude: Math.min(cornerA.lat, cornerB.lat),
            longitude: Math.min(cornerA.lng, cornerB.lng),
          },
          cornerB: {
            latitude: Math.max(cornerA.lat, cornerB.lat),
            longitude: Math.max(cornerA.lng, cornerB.lng),
          },
          grid: { rows, columns },
        },
        changed: mapChanged,
      },
    ]);

    try {
      const res = await fetch(`/api/admin/games/${gameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? 'Spiel konnte nicht aktualisiert werden');
      }

      router.push(`/admin/games/${gameId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <FormField label="Titel" htmlFor="title" required>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Spieltitel"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <FormField label="Startzeit" htmlFor="startTime" required>
            <Input
              id="startTime"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </FormField>
          {startInPast && (
            <p className="rounded-md bg-warning/15 px-3 py-2 text-xs text-warning">
              Dieses Datum liegt in der Vergangenheit und hat keine echte Wirkung.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <FormField label="Endzeit" htmlFor="endTime" required>
            <Input
              id="endTime"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </FormField>
          {endInPast && (
            <p className="rounded-md bg-warning/15 px-3 py-2 text-xs text-warning">
              Dieses Datum liegt in der Vergangenheit und hat keine echte Wirkung.
            </p>
          )}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium text-muted">Spielfeld</h3>
        <div className="mb-3 grid grid-cols-2 gap-4">
          <FormField label="Zeilen" htmlFor="rows">
            <Input
              id="rows"
              type="number"
              min={1}
              max={50}
              value={rows}
              onChange={(e) => setRows(Number(e.target.value))}
            />
          </FormField>
          <FormField label="Spalten" htmlFor="columns">
            <Input
              id="columns"
              type="number"
              min={1}
              max={50}
              value={columns}
              onChange={(e) => setColumns(Number(e.target.value))}
            />
          </FormField>
        </div>
        <MapSelector
          cornerA={cornerA}
          cornerB={cornerB}
          rows={rows}
          columns={columns}
          onChange={handleCornersChange}
        />
      </div>

      {error && (
        <p className="rounded-md bg-danger/15 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push(`/admin/games/${gameId}`)}
        >
          Abbrechen
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Wird gespeichert …' : 'Änderungen speichern'}
        </Button>
      </div>
    </form>
  );
}
