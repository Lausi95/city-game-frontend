'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { AgentResource, AgentCollection } from '@/app/types/api';

interface AgentsContextValue {
  /** Latest agents, seeded from the server render and refreshed by the poll. */
  agents: AgentResource[];
  /** Shared, ticking wall-clock (ms). 0 means "not yet mounted" (SSR-safe). */
  now: number;
}

const AgentsContext = createContext<AgentsContextValue | null>(null);

/**
 * Single source of truth for live agent data on the game detail page.
 *
 * Owns the 20s location poll and the 1s wall-clock tick so that the agents
 * list AND the map both read one moving copy of agent state. Lifted out of
 * AgentsSection so the map's markers stay coherent with the list's "last seen"
 * ages. See docs/adr/0003 and docs/adr/0006.
 */
export function AgentsProvider({
  gameId,
  initial,
  children,
}: {
  gameId: string;
  initial: AgentResource[];
  children: React.ReactNode;
}) {
  // Local copy so the poll can update consumers without a full page refresh.
  // Reseeded from props whenever a mutation triggers router.refresh().
  const [agents, setAgents] = useState(initial);
  useEffect(() => {
    setAgents(initial);
  }, [initial]);

  // Ticking wall-clock that recolors "last seen" dots between polls.
  // Starts at 0 (matches SSR) and is set client-side to avoid hydration mismatch.
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Poll fresh location data every 20s. See docs/adr/0003-client-polled-location-freshness.md.
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/games/${gameId}/agents`);
        if (!res.ok) return;
        const data: AgentCollection = await res.json();
        setAgents(data.content);
      } catch {
        // Transient network error — the next tick retries.
      }
    }, 20_000);
    return () => clearInterval(id);
  }, [gameId]);

  return <AgentsContext.Provider value={{ agents, now }}>{children}</AgentsContext.Provider>;
}

export function useAgents(): AgentsContextValue {
  const ctx = useContext(AgentsContext);
  if (ctx === null) {
    throw new Error('useAgents must be used within an AgentsProvider');
  }
  return ctx;
}
