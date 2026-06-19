import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:8080';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ gameId: string; teamId: string }> },
) {
  const { gameId, teamId } = await params;

  const res = await fetch(`${API_URL}/games/${gameId}/teams/${teamId}/setup-qr`);

  if (!res.ok) {
    return new NextResponse(null, { status: res.status });
  }

  const image = await res.arrayBuffer();
  return new NextResponse(image, {
    status: 200,
    headers: { 'Content-Type': 'image/png' },
  });
}
