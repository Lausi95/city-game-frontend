import { ReactNode } from 'react';

interface TooltipProps {
  /** Short label describing the wrapped control's action, e.g. "Bearbeiten". */
  label: string;
  children: ReactNode;
}

/**
 * Shows a small label below the wrapped control on hover or keyboard focus.
 *
 * CSS-only (no positioning library): the bubble sits below the control and is
 * anchored to its right edge, growing leftward — see ADR 0027. These controls
 * are right-edge row actions, so right-anchoring keeps the label inside its
 * (overflow-clipping) scroll container without per-call positioning. The label
 * is decorative (`aria-hidden`); screen readers rely on the control's own
 * `aria-label`.
 */
export function Tooltip({ label, children }: TooltipProps) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-full right-0 z-10 mt-1 whitespace-nowrap rounded-md border border-border-strong bg-surface-overlay px-2 py-1 text-xs font-medium text-foreground opacity-0 shadow-lg shadow-black/40 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}
