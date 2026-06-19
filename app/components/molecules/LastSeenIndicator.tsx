import type { AgentLocationResource } from '@/app/types/api';

interface LastSeenIndicatorProps {
  location: AgentLocationResource | null;
  /** Shared, ticking wall-clock from the parent (ms). 0 means "not yet mounted". */
  now: number;
}

const FRESH_MS = 60_000; // ≤ 1 min → green
const RECENT_MS = 300_000; // ≤ 5 min → yellow

type Bucket = 'fresh' | 'recent' | 'stale' | 'none' | 'pending';

const dotClass: Record<Bucket, string> = {
  fresh: 'bg-green-500',
  recent: 'bg-yellow-500',
  stale: 'bg-red-500',
  none: 'bg-zinc-400',
  pending: 'bg-zinc-300 dark:bg-zinc-600',
};

function bucketFor(ageMs: number): Bucket {
  // A negative age (agent clock ahead of the browser) is clamped to fresh.
  if (ageMs <= FRESH_MS) return 'fresh';
  if (ageMs <= RECENT_MS) return 'recent';
  return 'stale';
}

function formatAge(ageMs: number): string {
  const seconds = Math.max(0, Math.round(ageMs / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

/**
 * "Last seen" freshness of an agent's most recent location fix.
 * See CONTEXT.md and docs/adr/0003-client-polled-location-freshness.md.
 */
export function LastSeenIndicator({ location, now }: LastSeenIndicatorProps) {
  if (location === null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
        <span className={`h-2 w-2 rounded-full ${dotClass.none}`} aria-hidden="true" />
        <span>no location</span>
      </span>
    );
  }

  // Before the client clock has mounted, render a neutral placeholder so server
  // and first client render agree (no hydration mismatch).
  if (now <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
        <span className={`h-2 w-2 rounded-full ${dotClass.pending}`} aria-hidden="true" />
        <span>…</span>
      </span>
    );
  }

  const ageMs = now - Date.parse(location.timestamp);
  const bucket = bucketFor(ageMs);
  const label = formatAge(ageMs);

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-zinc-500"
      aria-label={`Last seen ${label}`}
    >
      <span className={`h-2 w-2 rounded-full ${dotClass[bucket]}`} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
