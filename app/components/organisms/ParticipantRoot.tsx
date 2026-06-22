'use client';

import { useSyncExternalStore } from 'react';
import {
  getIdentitySnapshot,
  type ParticipantIdentity,
} from '@/app/lib/identity';
import ParticipantStub from '@/app/components/molecules/ParticipantStub';
import AgentView from '@/app/components/organisms/AgentView';
import TeamView from '@/app/components/organisms/TeamView';

// localStorage doesn't change underneath us during a page view, so there's
// nothing to subscribe to — the no-op subscribe keeps useSyncExternalStore happy.
const subscribe = () => () => {};

// 'loading' is the server + first-client-paint snapshot. useSyncExternalStore
// renders it during hydration (matching SSR → no mismatch), then re-renders
// with the real client value. This is what keeps a participant with a valid
// role from ever flashing the "no role set" state.
const getServerSnapshot = (): ParticipantIdentity | null | 'loading' => 'loading';

/**
 * Root participant surface. `role` lives in browser local storage (unavailable
 * to the server), so the view is chosen after hydration: a neutral loading
 * state first, then the agent view, the team-member view, or an explicit
 * "no role set" state.
 *
 * See docs/adr/0004-root-is-public-participant-surface.md.
 */
export default function ParticipantRoot() {
  const identity = useSyncExternalStore<ParticipantIdentity | null | 'loading'>(
    subscribe,
    getIdentitySnapshot,
    getServerSnapshot,
  );

  if (identity === 'loading') {
    return (
      <div className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <p className="animate-pulse text-sm text-zinc-400">Wird geladen …</p>
      </div>
    );
  }

  if (identity?.role === 'agent') {
    return <AgentView gameId={identity.gameId} agentId={identity.agentId} />;
  }

  if (identity?.role === 'team') {
    return <TeamView gameId={identity.gameId} teamId={identity.teamId} />;
  }

  return (
    <ParticipantStub
      title="Keine Rolle festgelegt"
      subtitle="Scanne deinen Setup-QR-Code, um als Agent oder Teammitglied an einem Spiel teilzunehmen."
    />
  );
}
