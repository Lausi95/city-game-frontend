import type {
  GameCollection,
  GameResource,
  MapResource,
  TeamCollection,
  AgentCollection,
} from '@/app/types/api';
import { authedFetch } from './authedFetch';
import { logBackendError } from './logger';

// All of these read `/games/**`, which requires the operator's access token
// (see docs/adr/0014-operator-access-token-on-games-endpoints.md). authedFetch
// attaches the Bearer token; these helpers run only in admin server components.
async function get<T>(path: string): Promise<T> {
  const res = await authedFetch(path, { cache: 'no-store' });
  if (!res.ok) {
    // The shared admin backend boundary — record the failure before it becomes
    // a thrown Error a few frames up (see docs/adr/0020).
    logBackendError('backend.get', { status: res.status, path });
    throw new Error(`Backend ${res.status}: ${path}`);
  }
  return res.json();
}

export function fetchGames(page = 0, size = 20): Promise<GameCollection> {
  return get<GameCollection>(`/games?page=${page}&size=${size}`);
}

export function fetchGame(gameId: string): Promise<GameResource> {
  return get<GameResource>(`/games/${gameId}`);
}

export function fetchMap(gameId: string): Promise<MapResource> {
  return get<MapResource>(`/games/${gameId}/map`);
}

export function fetchTeams(gameId: string, page = 0, size = 50): Promise<TeamCollection> {
  return get<TeamCollection>(`/games/${gameId}/teams?page=${page}&size=${size}`);
}

export function fetchAgents(gameId: string, page = 0, size = 50): Promise<AgentCollection> {
  return get<AgentCollection>(`/games/${gameId}/agents?page=${page}&size=${size}`);
}
