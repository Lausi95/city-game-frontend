import { ReactNode } from 'react';

interface StatTileProps {
  label: string;
  /** Tile body — a string, a Badge, the LastSeenIndicator, etc. */
  children: ReactNode;
}

/**
 * One cell in the agent self-view's responsive stat grid: a small label above
 * its value. Kept presentational so identity fields, badges, and the
 * LastSeenIndicator all render the same way. See docs/adr/0005-agent-self-reported-location.md.
 */
export function StatTile({ label, children }: StatTileProps) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </span>
      <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
        {children}
      </div>
    </div>
  );
}
