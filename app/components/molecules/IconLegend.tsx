'use client';

import { useId, useState, type ComponentType } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

export interface IconLegendEntry {
  /** The lucide icon rendered in the row — the same glyph used on the action button. */
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  /** The action label, matching the button's tooltip (e.g. "Position setzen"). */
  label: string;
  /** One or two sentences on what the action does and why it exists. */
  description: string;
}

interface IconLegendProps {
  entries: IconLegendEntry[];
}

/**
 * A collapsible reference for a list's per-row icon actions: each row shows the
 * icon, its label, and a short "what + why" so an operator can learn what the
 * glyphs mean without hovering each one. Complements the per-button hover
 * Tooltip (ADR 0027) — the tooltip gives the quick label, the legend gives the
 * rationale. Collapsed by default to keep the dense game-detail screen calm.
 *
 * Entries are passed in by each list section, so the legend stays generic and
 * only ever shows the icons that section actually renders.
 */
export function IconLegend({ entries }: IconLegendProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-md text-xs font-medium text-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"
      >
        <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
        Legende
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul id={panelId} className="mt-2 flex flex-col gap-2 rounded-lg border border-border p-3">
          {entries.map(({ icon: Icon, label, description }) => (
            <li key={label} className="flex items-start gap-2.5">
              <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
              <p className="text-xs text-muted">
                <span className="font-medium text-foreground">{label}</span> — {description}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
