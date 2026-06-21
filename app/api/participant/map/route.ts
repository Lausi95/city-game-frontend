import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:8080';

// Public participant proxy (no Keycloak) — see docs/adr/0004-root-is-public-participant-surface.md.
// Returns the game's Playfield rectangle (cornerA/cornerB/grid) so the agent self-view can draw
// its Out-of-bounds map — see docs/adr/0012-agent-out-of-bounds-derived-client-side.md.
// Keyed by gameId alone: the backend's /games/{gameId}/map carries no agent/team identity, and
// the rectangle is not secret (the grid it also returns is ignored by the agent view).
export async function GET(req: NextRequest) {
  const gameId = req.nextUrl.searchParams.get('gameId');

  if (!gameId) {
    return NextResponse.json({ detail: 'gameId is required' }, { status: 400 });
  }

  const res = await fetch(`${API_URL}/games/${encodeURIComponent(gameId)}/map`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    return NextResponse.json(error, { status: res.status });
  }

  return NextResponse.json(await res.json());
}
