import Link from 'next/link';
import { fetchGame, fetchMap } from '@/app/lib/backend';
import EditGameForm from './_components/EditGameForm';

export default async function EditGamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const [game, map] = await Promise.all([fetchGame(gameId), fetchMap(gameId)]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href={`/admin/games/${gameId}`}
        className="mb-4 inline-block text-sm text-zinc-500 hover:text-zinc-700"
      >
        ← {game.title}
      </Link>
      <h1 className="mb-6 text-2xl font-semibold">Spiel bearbeiten</h1>
      <EditGameForm
        gameId={gameId}
        initialTitle={game.title}
        initialStartTime={game.startTime}
        initialEndTime={game.endTime}
        initialCornerA={{ lat: map.cornerA.latitude, lng: map.cornerA.longitude }}
        initialCornerB={{ lat: map.cornerB.latitude, lng: map.cornerB.longitude }}
        initialRows={map.grid.rows}
        initialColumns={map.grid.columns}
      />
    </div>
  );
}
