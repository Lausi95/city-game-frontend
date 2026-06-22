import { NextRequest, NextResponse } from 'next/server';
import type { CreateTeamRequest } from '@/app/types/api';
import { authedFetch } from '@/app/lib/authedFetch';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const { gameId } = await params;
  const body: CreateTeamRequest = await req.json();

  const res = await authedFetch(`/games/${gameId}/teams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    return NextResponse.json(error, { status: res.status });
  }

  const teamId = res.headers.get('X-TeamId');
  return NextResponse.json({ id: teamId }, { status: 201 });
}
