import { NextRequest, NextResponse } from 'next/server';
import type { BoardResource } from '@/app/types/api';
import { tenantHeaders } from '@/app/lib/tenant';
import { logBackendError } from '@/app/lib/logger';

const API_URL = process.env.API_URL ?? 'http://localhost:8080';

// Public participant proxy (no Keycloak) — see docs/adr/0004-root-is-public-participant-surface.md.
// Returns the game's Playfield rectangle (cornerA/cornerB/grid) so the agent self-view can draw
// its Out-of-bounds map — see docs/adr/0012-agent-out-of-bounds-derived-client-side.md.
//
// Sourced from the public top-level GET /board, NOT /games/{gameId}/map: the latter now requires
// the operator's OAuth token (ADR 0014) and participants are tokenless. We return ONLY board.map
// and STRIP the agents server-side, so a participant device never receives Mister X's cell or any
// agent location — keeping the Board obfuscation intact. See ADR 0015.
export async function GET(req: NextRequest) {
  const gameId = req.nextUrl.searchParams.get('gameId');

  if (!gameId) {
    return NextResponse.json({ detail: 'gameId is required' }, { status: 400 });
  }

  const res = await fetch(`${API_URL}/board`, {
    headers: { 'X-GameId': gameId, ...(await tenantHeaders()) },
    cache: 'no-store',
  });

  if (!res.ok) {
    if (res.status >= 500) logBackendError('participant.map', { status: res.status, path: '/board' });
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    return NextResponse.json(error, { status: res.status });
  }

  // Return only the map (corners + grid); drop utilityAgents/misterxAgents before they reach the client.
  const board: BoardResource = await res.json();
  return NextResponse.json(board.map);
}
