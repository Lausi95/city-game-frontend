import { NextRequest, NextResponse } from 'next/server';
import type { CreateGameRequest } from '@/app/types/api';

const API_URL = process.env.API_URL ?? 'http://localhost:8080';

export async function POST(req: NextRequest) {
  const body: CreateGameRequest = await req.json();

  const res = await fetch(`${API_URL}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    return NextResponse.json(error, { status: res.status });
  }

  const gameId = res.headers.get('X-GameId');
  return NextResponse.json({ id: gameId }, { status: 201 });
}
