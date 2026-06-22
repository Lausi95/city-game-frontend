import { NextRequest, NextResponse } from 'next/server';
import { authedFetch } from '@/app/lib/authedFetch';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string; agentId: string }> },
) {
  const { gameId, agentId } = await params;
  const body = await req.json();

  const res = await authedFetch(`/games/${gameId}/agents/${agentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    return NextResponse.json(error, { status: res.status });
  }

  const data = await res.json().catch(() => null);
  return data ? NextResponse.json(data) : new NextResponse(null, { status: 204 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ gameId: string; agentId: string }> },
) {
  const { gameId, agentId } = await params;

  const res = await authedFetch(`/games/${gameId}/agents/${agentId}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    return NextResponse.json(error, { status: res.status });
  }

  return new NextResponse(null, { status: 204 });
}
