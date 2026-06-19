import { NextRequest, NextResponse } from 'next/server';
import type { CreateAgentRequest } from '@/app/types/api';

const API_URL = process.env.API_URL ?? 'http://localhost:8080';

// Client-callable read used by AgentsSection's location-freshness poll.
// See docs/adr/0003-client-polled-location-freshness.md.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const { gameId } = await params;

  const res = await fetch(`${API_URL}/games/${gameId}/agents?page=0&size=50`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    return NextResponse.json(error, { status: res.status });
  }

  return NextResponse.json(await res.json());
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const { gameId } = await params;
  const body: CreateAgentRequest = await req.json();

  const res = await fetch(`${API_URL}/games/${gameId}/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    return NextResponse.json(error, { status: res.status });
  }

  const agentId = res.headers.get('X-AgentId');
  return NextResponse.json({ id: agentId }, { status: 201 });
}
