import { NextRequest, NextResponse } from 'next/server';
import { tenantHeaders } from '@/app/lib/tenant';
import { logBackendError } from '@/app/lib/logger';

const API_URL = process.env.API_URL ?? 'http://localhost:8080';

// Public participant proxy (no Keycloak) — see docs/adr/0004-root-is-public-participant-surface.md.
// Forwards the gameId/teamId query params as the backend's X-GameId/X-TeamId headers.
// memberId is intentionally omitted: /setup-team calls this BEFORE the member is
// registered, just to confirm the team name. /my-team allows a missing X-MemberId.
export async function GET(req: NextRequest) {
  const gameId = req.nextUrl.searchParams.get('gameId');
  const teamId = req.nextUrl.searchParams.get('teamId');

  if (!gameId || !teamId) {
    return NextResponse.json(
      { detail: 'gameId and teamId are required' },
      { status: 400 },
    );
  }

  const res = await fetch(`${API_URL}/my-team`, {
    headers: { 'X-GameId': gameId, 'X-TeamId': teamId, ...(await tenantHeaders()) },
    cache: 'no-store',
  });

  if (!res.ok) {
    if (res.status >= 500) logBackendError('participant.my-team', { status: res.status, path: '/my-team' });
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    return NextResponse.json(error, { status: res.status });
  }

  return NextResponse.json(await res.json());
}
