import Link from 'next/link';
import { fetchGame, fetchMap, fetchTeams, fetchAgents } from '@/app/lib/backend';
import { Badge } from '@/app/components/atoms/Badge';
import TeamsSection from './_components/TeamsSection';
import AgentsSection from './_components/AgentsSection';
import GameMapClient from './_components/GameMapClient';
import GameDetailTabs from './_components/GameDetailTabs';
import { AgentsProvider } from './_components/AgentsProvider';

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;

  const [game, map, teams, agents] = await Promise.all([
    fetchGame(gameId),
    fetchMap(gameId),
    fetchTeams(gameId),
    fetchAgents(gameId),
  ]);

  // Agent type may only be changed before the game kicks off.
  const canEditType = new Date(game.startTime) > new Date();

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Link href="/admin" className="mb-1 inline-block text-sm text-zinc-500 hover:text-zinc-700">
        ← Spiele
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{game.title}</h1>
          <p className="text-sm text-zinc-500">
            {new Date(game.startTime).toLocaleString('de-DE')} –{' '}
            {new Date(game.endTime).toLocaleString('de-DE')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge color="blue">{game.teams} Teams</Badge>
          <Badge color="zinc">{game.agents} Agenten</Badge>
          <Link
            href={`/admin/games/${gameId}/leaderboard`}
            className="inline-flex cursor-pointer items-center justify-center rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-900 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            Rangliste
          </Link>
          <Link
            href={`/admin/games/${gameId}/edit`}
            className="inline-flex cursor-pointer items-center justify-center rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-900 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            Bearbeiten
          </Link>
        </div>
      </div>

      <AgentsProvider gameId={gameId} initial={agents.content}>
        <GameDetailTabs
          karte={
            <div className="grid h-[calc(100vh-220px)] min-h-[32rem] grid-cols-[3fr_2fr] gap-8">
              <section className="flex min-h-0 flex-col">
                <div className="mb-2 flex items-baseline gap-3">
                  <h2 className="text-lg font-medium">Karte</h2>
                  <span className="text-xs text-zinc-500">
                    {map.grid.rows} Zeilen × {map.grid.columns} Spalten
                  </span>
                </div>
                <div className="min-h-0 flex-1">
                  <GameMapClient map={map} className="h-full" />
                </div>
              </section>

              <div className="min-h-0 overflow-y-auto pr-1">
                <AgentsSection gameId={gameId} canEditType={canEditType} />
              </div>
            </div>
          }
          teams={
            <div className="max-w-3xl">
              <TeamsSection gameId={gameId} teams={teams.content} />
            </div>
          }
        />
      </AgentsProvider>
    </div>
  );
}
