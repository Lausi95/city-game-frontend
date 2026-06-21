'use client';

import { useEffect, useRef, useState } from 'react';

// How often a stationary agent re-sends its last fix so "last seen" stays fresh.
// Paired with the 20s /my-agent poll against the ≤60s "fresh" bucket — see
// docs/adr/0005-agent-self-reported-location.md.
const HEARTBEAT_MS = 20_000;

/** Why the device might not be reporting — surfaced to the agent, not swallowed. */
export type ReportingStatus = 'prompting' | 'reporting' | 'denied' | 'unavailable';

export interface Fix {
  latitude: number;
  longitude: number;
}

/** The hook's output: reporting status plus the latest live fix (null until the first one). */
export interface Reporting {
  status: ReportingStatus;
  fix: Fix | null;
}

/**
 * Reports the agent's own position while the agent view is open (foreground-only —
 * a closed/backgrounded page cannot report). Uses `watchPosition` for fresh fixes
 * while moving PLUS a heartbeat that re-POSTs the latest fix so a stationary agent
 * stays green. The displayed freshness is read back from the server elsewhere
 * (the /my-agent poll), so POST failures here are intentionally non-fatal — they
 * simply let the indicator decay, which is the whole point.
 *
 * Also returns the latest live fix so the view can derive Out-of-bounds from the
 * SAME position it reports — marker, banner, and server "last seen" can never
 * disagree. See docs/adr/0005-agent-self-reported-location.md and
 * docs/adr/0012-agent-out-of-bounds-derived-client-side.md.
 */
export function useAgentLocationReporting(
  gameId: string,
  agentId: string,
): Reporting {
  // Geolocation availability is known at first render (this hook is client-only),
  // so seed it lazily rather than setting state inside the effect.
  const [status, setStatus] = useState<ReportingStatus>(() =>
    typeof navigator !== 'undefined' && navigator.geolocation ? 'prompting' : 'unavailable',
  );
  // The live fix, mirrored to state so consumers (the bounds map/banner) re-render on it.
  const [fix, setFix] = useState<Fix | null>(null);
  // Same fix the heartbeat re-sends; a ref so updating it never restarts the effect.
  const latestFix = useRef<Fix | null>(null);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    let cancelled = false;

    const post = (fix: Fix) => {
      void fetch(
        `/api/participant/location?gameId=${encodeURIComponent(gameId)}&agentId=${encodeURIComponent(agentId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fix),
          keepalive: true,
        },
      ).catch(() => {
        // Transient failure — the next watch fix or heartbeat retries, and the
        // freshness indicator (server round-trip) reveals the gap meanwhile.
      });
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (cancelled) return;
        const next = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        latestFix.current = next;
        setFix(next);
        setStatus('reporting');
        post(next); // fresh fix while moving
      },
      (err) => {
        if (cancelled) return;
        // Permission denial is sticky; position-unavailable / timeout is environmental.
        setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 },
    );

    // Heartbeat: keep a still agent green by re-sending the last known fix.
    const heartbeat = setInterval(() => {
      if (latestFix.current) post(latestFix.current);
    }, HEARTBEAT_MS);

    return () => {
      cancelled = true;
      navigator.geolocation.clearWatch(watchId);
      clearInterval(heartbeat);
    };
  }, [gameId, agentId]);

  return { status, fix };
}
