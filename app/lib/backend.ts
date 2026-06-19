import type {
  GameCollection,
  GameResource,
  MapResource,
  TeamCollection,
  AgentCollection,
} from '@/app/types/api';

const API_URL = process.env.API_URL ?? 'http://localhost:8080';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { cache: 'no-store' });
  if (!res.ok) {
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
