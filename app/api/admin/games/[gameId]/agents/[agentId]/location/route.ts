import { NextRequest, NextResponse } from 'next/server';
import { tenantHeaders } from '@/app/lib/tenant';
import { logBackendError } from '@/app/lib/logger';

const API_URL = process.env.API_URL ?? 'http://localhost:8080';

// Operator manual location — a faithful fallback for when an agent's own
// device cannot report (dead phone, no signal, denied GPS), and a debugging
// convenience (see docs/adr/0035-operator-manual-location-reuses-location-endpoint.md).
// It reuses the participant `POST /location` unchanged — the same move as the
// operator manual find (ADR 0013). Unlike find, location is keyed on the agent
// alone, so there is no member to borrow: we attach X-GameId/X-AgentId and pass
// the {latitude, longitude} body through. The backend stamps the timestamp, so
// the fix lands indistinguishable from a device report. It is a one-shot write —
// nothing re-sends it, so a manually-set position decays like any real fix.
//
// `POST /location` is the tokenless participant endpoint, so this stays a raw
// fetch with X-* headers, NOT authedFetch (no operator Bearer token).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string; agentId: string }> },
) {
  const { gameId, agentId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }

  const res = await fetch(`${API_URL}/location`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-GameId': gameId,
      'X-AgentId': agentId,
      ...(await tenantHeaders()),
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    if (res.status >= 500) logBackendError('admin.agentLocation', { status: res.status, path: '/location' });
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    return NextResponse.json(error, { status: res.status });
  }

  // Backend answers 202 with no body; mirror the status without forcing a parse.
  return new NextResponse(null, { status: res.status });
}
