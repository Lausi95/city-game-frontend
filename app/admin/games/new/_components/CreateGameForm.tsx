'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button } from '@/app/components/atoms/Button';
import { Input } from '@/app/components/atoms/Input';
import { FormField } from '@/app/components/molecules/FormField';
import type { Corner } from '@/app/components/organisms/MapSelector';

const MapSelector = dynamic(() => import('@/app/components/organisms/MapSelector'), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 w-full animate-pulse items-center justify-center rounded-md bg-surface-raised text-sm text-muted">
      Karte wird geladen …
    </div>
  ),
});

export default function CreateGameForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [cornerA, setCornerA] = useState<Corner | null>(null);
  const [cornerB, setCornerB] = useState<Corner | null>(null);
  const [rows, setRows] = useState(5);
  const [columns, setColumns] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

    const body = {
      title,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      map: {
        // Normalize to SW/NE regardless of click order
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
    };

    try {
      const res = await fetch('/api/admin/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? 'Spiel konnte nicht erstellt werden');
      }

      const { id } = await res.json();
      router.push(`/admin/games/${id}`);
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
        <FormField label="Startzeit" htmlFor="startTime" required>
          <Input
            id="startTime"
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </FormField>
        <FormField label="Endzeit" htmlFor="endTime" required>
          <Input
            id="endTime"
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </FormField>
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
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Abbrechen
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Wird erstellt …' : 'Spiel erstellen'}
        </Button>
      </div>
    </form>
  );
}
