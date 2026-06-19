import { NextRequest, NextResponse } from 'next/server';
import type { PatchGameRequest } from '@/app/types/api';

const API_URL = process.env.API_URL ?? 'http://localhost:8080';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const { gameId } = await params;
  const body: PatchGameRequest = await req.json();

  const res = await fetch(`${API_URL}/games/${gameId}`, {
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
