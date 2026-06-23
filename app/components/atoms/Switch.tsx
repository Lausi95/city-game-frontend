'use client';

interface SwitchProps {
  /** Label shown to the left of the track; selected when `checked` is false. */
  leftLabel: string;
  /** Label shown to the right of the track; selected when `checked` is true. */
  rightLabel: string;
  /** false = left label selected, true = right label selected. */
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/**
 * A labeled slider switch: `leftLabel ⟷ rightLabel`. The flanking labels are
 * clickable shortcuts to either side; the track toggles. Used for the game
 * map's Admin-Ansicht / Team-Ansicht spectator toggle (see CONTEXT.md →
 * Spectator view).
 */
export function Switch({ leftLabel, rightLabel, checked, onChange }: SwitchProps) {
  return (
    <div className="flex items-center gap-2 text-xs font-medium select-none">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`cursor-pointer transition-colors ${
          checked ? 'text-muted hover:text-foreground' : 'text-foreground'
        }`}
      >
        {leftLabel}
      </button>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={`${leftLabel} / ${rightLabel}`}
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full border border-border bg-surface-overlay transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-accent transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-1'
          }`}
        />
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`cursor-pointer transition-colors ${
          checked ? 'text-foreground' : 'text-muted hover:text-foreground'
        }`}
      >
        {rightLabel}
      </button>
    </div>
  );
}
