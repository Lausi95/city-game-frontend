import { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export function Input({ error, className = '', ...props }: InputProps) {
  return (
    <input
      className={`w-full rounded-md border bg-surface-raised px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-faint focus:ring-2 focus:ring-accent ${
        error
          ? 'border-danger focus:ring-danger'
          : 'border-border-strong'
      } ${className}`}
      {...props}
    />
  );
}
