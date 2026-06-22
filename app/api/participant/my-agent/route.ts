import { NextRequest, NextResponse } from 'next/server';
import { tenantHeaders } from '@/app/lib/tenant';
import { logBackendError } from '@/app/lib/logger';

const API_URL = process.env.API_URL ?? 'http://localhost:8080';

// Public participant proxy (no Keycloak) — see docs/adr/0004-root-is-public-participant-surface.md.
// Forwards the gameId/agentId query params as the backend's X-GameId/X-AgentId headers.
// Both are required: unlike a team member, an agent already exists and the setup QR
// carries its whole identity, so /setup-agent always has both before it calls this.
export async function GET(req: NextRequest) {
  const gameId = req.nextUrl.searchParams.get('gameId');
  const agentId = req.nextUrl.searchParams.get('agentId');

  if (!gameId || !agentId) {
    return NextResponse.json(
      { detail: 'gameId and agentId are required' },
      { status: 400 },
    );
  }

  const res = await fetch(`${API_URL}/my-agent`, {
    headers: { 'X-GameId': gameId, 'X-AgentId': agentId, ...(await tenantHeaders()) },
    cache: 'no-store',
  });

  if (!res.ok) {
    if (res.status >= 500) logBackendError('participant.my-agent', { status: res.status, path: '/my-agent' });
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    return NextResponse.json(error, { status: res.status });
  }

  return NextResponse.json(await res.json());
}
