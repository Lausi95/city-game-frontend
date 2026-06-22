import { NextRequest, NextResponse } from 'next/server';
import { tenantHeaders } from '@/app/lib/tenant';

const API_URL = process.env.API_URL ?? 'http://localhost:8080';

// Public participant proxy (no Keycloak) — see docs/adr/0004-root-is-public-participant-surface.md.
// Forwards the gameId/agentId query params as the backend's X-GameId/X-AgentId headers and
// streams back the PNG. The find-QR is presented live by an active Mister X for a team to
// scan (see ADR 0011); the backend mints it and we relay the image untouched.
export async function GET(req: NextRequest) {
  const gameId = req.nextUrl.searchParams.get('gameId');
  const agentId = req.nextUrl.searchParams.get('agentId');

  if (!gameId || !agentId) {
    return NextResponse.json(
      { detail: 'gameId and agentId are required' },
      { status: 400 },
    );
  }

  const res = await fetch(`${API_URL}/find-qr`, {
    headers: { 'X-GameId': gameId, 'X-AgentId': agentId, ...(await tenantHeaders()) },
    cache: 'no-store',
  });

  if (!res.ok) {
    return new NextResponse(null, { status: res.status });
  }

  const image = await res.arrayBuffer();
  return new NextResponse(image, {
    status: 200,
    headers: { 'Content-Type': 'image/png' },
  });
}
