import Link from 'next/link';
import { fetchGame } from '@/app/lib/backend';
import Leaderboard from '@/app/components/organisms/Leaderboard';

// Operator leaderboard. Auth-protected (under /admin), gameId from the route.
// Reuses the public /api/participant/leaderboard proxy — the data is not
// sensitive, only the page is gated. See ADR 0009.
export default async function GameLeaderboardPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const game = await fetchGame(gameId);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Link
        href={`/admin/games/${gameId}`}
        className="mb-1 inline-block text-sm text-zinc-500 hover:text-zinc-700"
      >
        ← {game.title}
      </Link>
      <h1 className="mb-4 text-2xl font-semibold">Leaderboard</h1>
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <Leaderboard gameId={gameId} />
      </div>
    </div>
  );
}
