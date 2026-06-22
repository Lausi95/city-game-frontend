import { Circle } from 'lucide-react';
import type { AgentLocationResource } from '@/app/types/api';

interface LastSeenIndicatorProps {
  location: AgentLocationResource | null;
  /** Shared, ticking wall-clock from the parent (ms). 0 means "not yet mounted". */
  now: number;
}

const FRESH_MS = 60_000; // ≤ 1 min → green
const RECENT_MS = 300_000; // ≤ 5 min → yellow

type Bucket = 'fresh' | 'recent' | 'stale' | 'none' | 'pending';

// Ordered freshness ramp — kept good→bad, re-skinned to the fog palette (ADR 0031).
const dotClass: Record<Bucket, string> = {
  fresh: 'text-success',
  recent: 'text-warning',
  stale: 'text-danger',
  none: 'text-faint',
  pending: 'text-faint',
};

function bucketFor(ageMs: number): Bucket {
  // A negative age (agent clock ahead of the browser) is clamped to fresh.
  if (ageMs <= FRESH_MS) return 'fresh';
  if (ageMs <= RECENT_MS) return 'recent';
  return 'stale';
}

export function formatAge(ageMs: number): string {
  const seconds = Math.max(0, Math.round(ageMs / 1000));
  if (seconds < 60) return `vor ${seconds} Sek.`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  return `vor ${hours} Std.`;
}

/**
 * "Last seen" freshness of an agent's most recent location fix.
 * See CONTEXT.md and docs/adr/0003-client-polled-location-freshness.md.
 */
export function LastSeenIndicator({ location, now }: LastSeenIndicatorProps) {
  if (location === null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted">
        <Circle className={`h-2 w-2 fill-current ${dotClass.none}`} aria-hidden="true" />
        <span>kein Standort</span>
      </span>
    );
  }

  // Before the client clock has mounted, render a neutral placeholder so server
  // and first client render agree (no hydration mismatch).
  if (now <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted">
        <Circle className={`h-2 w-2 fill-current ${dotClass.pending}`} aria-hidden="true" />
        <span>…</span>
      </span>
    );
  }

  const ageMs = now - Date.parse(location.timestamp);
  const bucket = bucketFor(ageMs);
  const label = formatAge(ageMs);

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-muted"
      aria-label={`Zuletzt gesehen ${label}`}
    >
      <Circle className={`h-2 w-2 fill-current ${dotClass[bucket]}`} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
