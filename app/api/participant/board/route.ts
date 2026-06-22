import { NextRequest, NextResponse } from 'next/server';
import { tenantHeaders } from '@/app/lib/tenant';
import { logBackendError } from '@/app/lib/logger';

const API_URL = process.env.API_URL ?? 'http://localhost:8080';

// Public participant proxy (no Keycloak) — see docs/adr/0004-root-is-public-participant-surface.md.
// Forwards the gameId/teamId query params as the backend's X-GameId/X-TeamId headers.
// X-GameId is required; X-TeamId is optional but the team board always supplies it, so the
// backend hides the Mister X this team has already found (see CONTEXT.md → Board).
export async function GET(req: NextRequest) {
  const gameId = req.nextUrl.searchParams.get('gameId');
  const teamId = req.nextUrl.searchParams.get('teamId');

  if (!gameId) {
    return NextResponse.json({ detail: 'gameId is required' }, { status: 400 });
  }

  const headers: Record<string, string> = { 'X-GameId': gameId, ...(await tenantHeaders()) };
  if (teamId) headers['X-TeamId'] = teamId;

  const res = await fetch(`${API_URL}/board`, { headers, cache: 'no-store' });

  if (!res.ok) {
    if (res.status >= 500) logBackendError('participant.board', { status: res.status, path: '/board' });
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    return NextResponse.json(error, { status: res.status });
  }

  return NextResponse.json(await res.json());
}
