'use client';

export interface TabDescriptor {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: readonly TabDescriptor[];
  activeId: string;
  onChange: (id: string) => void;
}

/**
 * Horizontal tab bar with an underline-active style. Renders only the bar —
 * the caller owns the active state and the panels (see the game-detail page,
 * which keeps both panels mounted and toggles visibility; ADR 0025).
 */
export function Tabs({ tabs, activeId, onChange }: TabsProps) {
  return (
    <div className="flex gap-6 border-b border-zinc-200" role="tablist">
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={`-mb-px cursor-pointer border-b-2 px-1 pb-2.5 text-sm font-medium transition-colors ${
              active
                ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
