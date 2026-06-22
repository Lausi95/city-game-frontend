'use client';

import { useState, type ReactNode } from 'react';
import { Tabs } from '@/app/components/molecules/Tabs';

const TABS = [
  { id: 'karte', label: 'Karte & Agenten' },
  { id: 'teams', label: 'Teams' },
] as const;

type TabId = (typeof TABS)[number]['id'];

interface GameDetailTabsProps {
  karte: ReactNode;
  teams: ReactNode;
}

/**
 * Two client-state tabs for the game-detail body. Both panels stay mounted and
 * the inactive one is hidden with `hidden` rather than unmounted — the Karte
 * panel holds a Leaflet map that loses its zoom/pan (and re-inits with a
 * flicker) if torn down on every switch. Safe because Karte is the default
 * visible tab, so the map initialises at its correct size. See ADR 0025.
 */
export default function GameDetailTabs({ karte, teams }: GameDetailTabsProps) {
  const [active, setActive] = useState<TabId>('karte');

  return (
    <div>
      <Tabs tabs={TABS} activeId={active} onChange={(id) => setActive(id as TabId)} />

      <div className="pt-6">
        <div className={active === 'karte' ? undefined : 'hidden'}>{karte}</div>
        <div className={active === 'teams' ? undefined : 'hidden'}>{teams}</div>
      </div>
    </div>
  );
}
