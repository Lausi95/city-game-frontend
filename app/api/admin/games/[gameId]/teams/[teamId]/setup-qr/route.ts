import { NextRequest, NextResponse } from 'next/server';
import { authedFetch } from '@/app/lib/authedFetch';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ gameId: string; teamId: string }> },
) {
  const { gameId, teamId } = await params;

  const res = await authedFetch(`/games/${gameId}/teams/${teamId}/setup-qr`);

  if (!res.ok) {
    return new NextResponse(null, { status: res.status });
  }

  const image = await res.arrayBuffer();
  return new NextResponse(image, {
    status: 200,
    headers: { 'Content-Type': 'image/png' },
  });
}
