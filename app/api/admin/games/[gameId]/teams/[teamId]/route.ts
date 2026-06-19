import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:8080';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string; teamId: string }> },
) {
  const { gameId, teamId } = await params;
  const body = await req.json();

  const res = await fetch(`${API_URL}/games/${gameId}/teams/${teamId}`, {
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
  { params }: { params: Promise<{ gameId: string; teamId: string }> },
) {
  const { gameId, teamId } = await params;

  const res = await fetch(`${API_URL}/games/${gameId}/teams/${teamId}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    return NextResponse.json(error, { status: res.status });
  }

  return new NextResponse(null, { status: 204 });
}
