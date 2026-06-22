import { NextRequest, NextResponse } from 'next/server';
import { authedFetch } from '@/app/lib/authedFetch';

// The members lookup goes through authedFetch (it reads `/games/**`, which now
// requires the operator token — see ADR 0014). The `/find` write below stays
// tokenless: it is the public participant endpoint (see ADR 0013), reused here
// unchanged, and carries identity via X-* headers, not a Bearer token.
const API_URL = process.env.API_URL ?? 'http://localhost:8080';

// Operator manual find — a faithful fallback for when the field flow fails
// (see docs/adr/0013-operator-manual-find-reuses-find-endpoint.md). It reuses
// the participant `POST /find` unchanged. That endpoint requires X-MemberId
// (a find is recorded *by* a member), but the operator only picks the agent —
// so we look up the team's members and borrow one to satisfy the header. The
// borrowed member is incidental: the Found relation it establishes is
// team↔agent. A team with no members yet cannot record a find.
//
// Backend error statuses pass through unchanged so the dialog can surface them:
// 404 (agent not in this game), 409 (already found), 422 (game not active /
// agent not findable).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string; teamId: string }> },
) {
  const { gameId, teamId } = await params;
  const body = await req.json().catch(() => null);
  const agentId =
    body && typeof body === 'object' && typeof body.agentId === 'string'
      ? body.agentId
      : null;

  if (!agentId) {
    return NextResponse.json({ detail: 'agentId is required' }, { status: 400 });
  }

  // Borrow a member to satisfy X-MemberId — we only need one.
  const membersRes = await authedFetch(
    `/games/${gameId}/teams/${teamId}/members?page=0&size=1`,
  );
  if (!membersRes.ok) {
    const error = await membersRes.json().catch(() => ({ detail: membersRes.statusText }));
    return NextResponse.json(error, { status: membersRes.status });
  }
  const members = await membersRes.json().catch(() => null);
  const memberId = members?.content?.[0]?.id;

  if (!memberId) {
    return NextResponse.json(
      { detail: 'This team has no members yet, so a find cannot be recorded.' },
      { status: 422 },
    );
  }

  const res = await fetch(`${API_URL}/find`, {
    method: 'POST',
    headers: {
      'X-GameId': gameId,
      'X-TeamId': teamId,
      'X-MemberId': memberId,
      'X-AgentId': agentId,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    return NextResponse.json(error, { status: res.status });
  }

  return NextResponse.json({ findId: res.headers.get('X-FindId') }, { status: 201 });
}
