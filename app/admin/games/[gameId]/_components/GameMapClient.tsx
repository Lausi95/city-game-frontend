'use client';

import dynamic from 'next/dynamic';
import type { MapResource } from '@/app/types/api';

const GameMap = dynamic(() => import('@/app/components/organisms/GameMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 w-full animate-pulse items-center justify-center rounded-md bg-zinc-100 text-sm text-zinc-400">
      Loading map…
    </div>
  ),
});

export default function GameMapClient({ map }: { map: MapResource }) {
  return <GameMap map={map} />;
}
