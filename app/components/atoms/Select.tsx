import { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export function Select({ error, className = '', children, ...props }: SelectProps) {
  return (
    <select
      className={`w-full rounded-md border bg-surface-raised px-3 py-2 text-sm text-foreground outline-none transition-colors focus:ring-2 focus:ring-accent ${
        error
          ? 'border-danger focus:ring-danger'
          : 'border-border-strong'
      } ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}
