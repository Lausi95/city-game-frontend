// Participant identity stored client-side. See docs/adr/0004-root-is-public-participant-surface.md.
//
// The backend has no participant login: a participant is identified only by the
// IDs they carry (X-GameId + X-AgentId, or X-GameId/X-TeamId/X-MemberId). The
// team-member identity is written here by the /setup-team flow (writeIdentity)
// once registration mints a memberId; the root page only reads it.

export type ParticipantRole = 'agent' | 'team';

export interface AgentIdentity {
  role: 'agent';
  gameId: string;
  agentId: string;
}

export interface TeamMemberIdentity {
  role: 'team';
  gameId: string;
  teamId: string;
  memberId: string;
}

export type ParticipantIdentity = AgentIdentity | TeamMemberIdentity;

/** Single local-storage key holding the whole identity blob, written atomically by `writeIdentity`. */
export const IDENTITY_STORAGE_KEY = 'cityGameIdentity';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Read and fully validate the participant identity from local storage.
 *
 * Returns `null` for every "not a usable identity" case — key absent,
 * unparseable JSON, unrecognized `role`, or a structurally-incomplete blob
 * (e.g. `role: 'agent'` with no `agentId`). We never return a partial identity:
 * the root page treats `null` as the "no role set" state.
 */
export function readIdentity(): ParticipantIdentity | null {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(IDENTITY_STORAGE_KEY);
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) return null;
  const blob = parsed as Record<string, unknown>;

  if (blob.role === 'agent') {
    if (isNonEmptyString(blob.gameId) && isNonEmptyString(blob.agentId)) {
      return { role: 'agent', gameId: blob.gameId, agentId: blob.agentId };
    }
    return null;
  }

  if (blob.role === 'team') {
    if (
      isNonEmptyString(blob.gameId) &&
      isNonEmptyString(blob.teamId) &&
      isNonEmptyString(blob.memberId)
    ) {
      return {
        role: 'team',
        gameId: blob.gameId,
        teamId: blob.teamId,
        memberId: blob.memberId,
      };
    }
    return null;
  }

  return null;
}

/**
 * Persist the participant identity as a single atomic blob. The reader
 * (`readIdentity`) validates the whole shape, so callers must pass a complete
 * identity — never a partial one. Written by the /setup-team flow after
 * registration succeeds; the redirect to `/` then re-reads it.
 */
export function writeIdentity(identity: ParticipantIdentity): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(identity));
}

// Cached snapshot for useSyncExternalStore. getSnapshot must return a stable
// reference between renders or React re-renders forever, so we recompute only
// when the raw stored string actually changes.
let snapshotRaw: string | null | undefined;
let snapshotValue: ParticipantIdentity | null = null;

/** Stable, render-safe read of the identity for `useSyncExternalStore`. */
export function getIdentitySnapshot(): ParticipantIdentity | null {
  const raw =
    typeof window === 'undefined'
      ? null
      : window.localStorage.getItem(IDENTITY_STORAGE_KEY);
  if (raw !== snapshotRaw) {
    snapshotRaw = raw;
    snapshotValue = readIdentity();
  }
  return snapshotValue;
}
