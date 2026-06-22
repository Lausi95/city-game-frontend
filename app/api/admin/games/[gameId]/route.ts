import { NextRequest, NextResponse } from 'next/server';
import type { PatchGameRequest } from '@/app/types/api';
import { authedFetch } from '@/app/lib/authedFetch';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const { gameId } = await params;
  const body: PatchGameRequest = await req.json();

  const res = await authedFetch(`/games/${gameId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    return NextResponse.json(error, { status: res.status });
  }

  return new NextResponse(null, { status: 202 });
}
