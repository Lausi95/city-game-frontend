import { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

// Gaslight brass primary; calm raised secondary; tube-red danger (ADR 0031).
const variantClasses: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-contrast hover:bg-accent-hover disabled:opacity-50',
  secondary:
    'bg-surface-raised text-foreground border border-border hover:bg-surface-overlay disabled:opacity-50',
  danger: 'bg-danger text-white hover:bg-danger-hover disabled:opacity-50',
  ghost:
    'bg-transparent text-muted hover:bg-surface-raised hover:text-foreground',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-md font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    />
  );
}
