import { NextRequest, NextResponse } from 'next/server';
import { tenantHeaders } from '@/app/lib/tenant';

const API_URL = process.env.API_URL ?? 'http://localhost:8080';

// Public participant proxy (no Keycloak) — see docs/adr/0004-root-is-public-participant-surface.md.
// Records a Find (see CONTEXT.md): the finding team's identity comes from query
// params (gameId/teamId/memberId, read from the team-member localStorage identity)
// and the agent being found from agentId (carried by the find-QR). These are
// forwarded as the backend's X-* headers. The optional JSON body reports the
// member's own position at the moment of the find; it is passed through verbatim.
//
// Error statuses are surfaced unchanged so the client can tailor copy per status:
// 404 (not part of this game), 409 (already found — the client treats this as a
// soft success), 422 (game not active / agent not findable).
export async function POST(req: NextRequest) {
  const gameId = req.nextUrl.searchParams.get('gameId');
  const teamId = req.nextUrl.searchParams.get('teamId');
  const memberId = req.nextUrl.searchParams.get('memberId');
  const agentId = req.nextUrl.searchParams.get('agentId');

  if (!gameId || !teamId || !memberId || !agentId) {
    return NextResponse.json(
      { detail: 'gameId, teamId, memberId and agentId are required' },
      { status: 400 },
    );
  }

  // Best-effort location body: forward it only if the client sent a valid one.
  // A find is never blocked on location (see the Find organism), so an absent or
  // malformed body is fine — we just POST without one.
  const body = await req.json().catch(() => null);
  const hasLocation =
    body !== null &&
    typeof body === 'object' &&
    typeof body.latitude === 'number' &&
    typeof body.longitude === 'number';

  const res = await fetch(`${API_URL}/find`, {
    method: 'POST',
    headers: {
      'X-GameId': gameId,
      'X-TeamId': teamId,
      'X-MemberId': memberId,
      'X-AgentId': agentId,
      ...(await tenantHeaders()),
      ...(hasLocation ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(hasLocation
      ? { body: JSON.stringify({ latitude: body.latitude, longitude: body.longitude }) }
      : {}),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    return NextResponse.json(error, { status: res.status });
  }

  return NextResponse.json({ findId: res.headers.get('X-FindId') }, { status: 201 });
}
