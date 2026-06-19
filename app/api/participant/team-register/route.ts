import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:8080';

// Public participant proxy (no Keycloak) — see docs/adr/0004-root-is-public-participant-surface.md.
// Forwards the gameId/teamId query params as the backend's X-GameId/X-TeamId headers
// and returns the minted memberId (the backend's X-TeamMemberId response header) as JSON,
// mirroring how the admin teams route surfaces X-TeamId.
export async function POST(req: NextRequest) {
  const gameId = req.nextUrl.searchParams.get('gameId');
  const teamId = req.nextUrl.searchParams.get('teamId');

  if (!gameId || !teamId) {
    return NextResponse.json(
      { detail: 'gameId and teamId are required' },
      { status: 400 },
    );
  }

  const res = await fetch(`${API_URL}/team-register`, {
    method: 'POST',
    headers: { 'X-GameId': gameId, 'X-TeamId': teamId },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    return NextResponse.json(error, { status: res.status });
  }

  const memberId = res.headers.get('X-TeamMemberId');
  if (!memberId) {
    return NextResponse.json(
      { detail: 'Registration succeeded but no member id was returned' },
      { status: 502 },
    );
  }

  return NextResponse.json({ memberId }, { status: 201 });
}
