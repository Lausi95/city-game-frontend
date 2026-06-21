import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:8080';

// Public proxy for the team ranking — see docs/adr/0009-leaderboard-split-surfaces-public-data.md.
// Forwards the gameId query param as the backend's required X-GameId header.
// Deliberately public (no Keycloak): the leaderboard is non-sensitive and the
// admin page reuses this same route — only the page is auth-gated, not the data.
export async function GET(req: NextRequest) {
  const gameId = req.nextUrl.searchParams.get('gameId');

  if (!gameId) {
    return NextResponse.json({ detail: 'gameId is required' }, { status: 400 });
  }

  const res = await fetch(`${API_URL}/leaderboard`, {
    headers: { 'X-GameId': gameId },
    cache: 'no-store',
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    return NextResponse.json(error, { status: res.status });
  }

  return NextResponse.json(await res.json());
}
