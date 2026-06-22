import { NextRequest, NextResponse } from 'next/server';
import { tenantHeaders } from '@/app/lib/tenant';
import { logBackendError } from '@/app/lib/logger';

const API_URL = process.env.API_URL ?? 'http://localhost:8080';

// Public participant proxy (no Keycloak) — see docs/adr/0004-root-is-public-participant-surface.md
// and docs/adr/0005-agent-self-reported-location.md. The agent's own device reports its
// position here; we forward the gameId/agentId query params (from the device's stored
// identity) as the backend's X-GameId/X-AgentId headers and pass the {latitude, longitude}
// body through to POST /location. The backend stamps the timestamp and answers 202.
export async function POST(req: NextRequest) {
  const gameId = req.nextUrl.searchParams.get('gameId');
  const agentId = req.nextUrl.searchParams.get('agentId');

  if (!gameId || !agentId) {
    return NextResponse.json(
      { detail: 'gameId and agentId are required' },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }

  const res = await fetch(`${API_URL}/location`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-GameId': gameId,
      'X-AgentId': agentId,
      ...(await tenantHeaders()),
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    if (res.status >= 500) logBackendError('participant.location', { status: res.status, path: '/location' });
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    return NextResponse.json(error, { status: res.status });
  }

  // Backend answers 202 with no body; mirror the status without forcing a JSON parse.
  return new NextResponse(null, { status: res.status });
}
