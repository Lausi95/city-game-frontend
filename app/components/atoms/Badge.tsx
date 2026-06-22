// Categorical chips. Game roles + status read as low-contrast tinted chips on
// the fog palette; transport-hued where the label is a category (ADR 0031).
type Color =
  | 'neutral'
  | 'utility'
  | 'misterx'
  | 'success'
  | 'warning'
  | 'danger';

interface BadgeProps {
  color?: Color;
  children: React.ReactNode;
}

const colorClasses: Record<Color, string> = {
  neutral: 'bg-surface-overlay text-muted ring-1 ring-inset ring-border',
  utility: 'bg-utility/15 text-utility',
  misterx: 'bg-misterx/15 text-misterx',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/15 text-danger',
};

export function Badge({ color = 'neutral', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide ${colorClasses[color]}`}
    >
      {children}
    </span>
  );
}
