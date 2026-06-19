import Link from 'next/link';
import { fetchGame, fetchMap, fetchTeams, fetchAgents } from '@/app/lib/backend';
import { Badge } from '@/app/components/atoms/Badge';
import TeamsSection from './_components/TeamsSection';
import AgentsSection from './_components/AgentsSection';
import GameMapClient from './_components/GameMapClient';

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

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Link href="/admin" className="mb-1 inline-block text-sm text-zinc-500 hover:text-zinc-700">
        ← Games
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{game.title}</h1>
          <p className="text-sm text-zinc-500">
            {new Date(game.startTime).toLocaleString()} –{' '}
            {new Date(game.endTime).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge color="blue">{game.teams} teams</Badge>
          <Badge color="zinc">{game.agents} agents</Badge>
        </div>
      </div>

      <section className="mb-8">
        <div className="mb-2 flex items-baseline gap-3">
          <h2 className="text-lg font-medium">Map</h2>
          <span className="text-xs text-zinc-500">
            {map.grid.rows} rows × {map.grid.columns} columns
          </span>
        </div>
        <GameMapClient map={map} />
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <TeamsSection gameId={gameId} teams={teams.content} />
        <AgentsSection gameId={gameId} agents={agents.content} />
      </div>
    </div>
  );
}
