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
        <h1 className="text-2xl font-semibold">Spiele</h1>
        <Link href="/admin/games/new">
          <Button>Neues Spiel</Button>
        </Link>
      </div>

      {games.empty ? (
        <div className="rounded-lg border border-dashed border-border-strong p-12 text-center text-muted">
          Noch keine Spiele. Erstelle dein erstes Spiel.
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {games.content.map((game) => (
            <Link
              key={game.id}
              href={`/admin/games/${game.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-surface"
            >
              <div>
                <p className="font-medium">{game.title}</p>
                <p className="text-sm text-muted">
                  {new Date(game.startTime).toLocaleString('de-DE')} –{' '}
                  {new Date(game.endTime).toLocaleString('de-DE')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge color="utility">{game.teams} Teams</Badge>
                <Badge color="neutral">{game.agents} Agenten</Badge>
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
                Zurück
              </Button>
            </Link>
          )}
          <span className="text-sm text-muted">
            Seite {page + 1} von {games.totalPages}
          </span>
          {!games.last && (
            <Link href={`/admin?page=${page + 1}`}>
              <Button variant="secondary" size="sm">
                Weiter
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
