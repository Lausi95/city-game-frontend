'use client';

import dynamic from 'next/dynamic';
import { useAgents } from './AgentsProvider';
import type { MapResource } from '@/app/types/api';

const GameMap = dynamic(() => import('@/app/components/organisms/GameMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-80 w-full animate-pulse items-center justify-center rounded-md bg-zinc-100 text-sm text-zinc-400">
      Karte wird geladen …
    </div>
  ),
});

export default function GameMapClient({
  map,
  className,
}: {
  map: MapResource;
  className?: string;
}) {
  const { agents, now } = useAgents();
  return <GameMap map={map} agents={agents} now={now} className={className} />;
}
