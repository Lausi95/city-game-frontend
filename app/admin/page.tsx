import Link from 'next/link';
import { fetchGames } from '@/app/lib/backend';
import { Button } from '@/app/components/atoms/Button';
import { Badge } from '@/app/components/atoms/Badge';

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = parseInt(pageParam ?? '0', 10);
  const games = await fetchGames(page);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Games</h1>
        <Link href="/admin/games/new">
          <Button>New Game</Button>
        </Link>
      </div>

      {games.empty ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center text-zinc-500">
          No games yet. Create your first game.
        </div>
      ) : (
        <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
          {games.content.map((game) => (
            <Link
              key={game.id}
              href={`/admin/games/${game.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              <div>
                <p className="font-medium">{game.title}</p>
                <p className="text-sm text-zinc-500">
                  {new Date(game.startTime).toLocaleString()} –{' '}
                  {new Date(game.endTime).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge color="blue">{game.teams} teams</Badge>
                <Badge color="zinc">{game.agents} agents</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}

      {games.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          {!games.first && (
            <Link href={`/admin?page=${page - 1}`}>
              <Button variant="secondary" size="sm">
                Previous
              </Button>
            </Link>
          )}
          <span className="text-sm text-zinc-500">
            Page {page + 1} of {games.totalPages}
          </span>
          {!games.last && (
            <Link href={`/admin?page=${page + 1}`}>
              <Button variant="secondary" size="sm">
                Next
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
