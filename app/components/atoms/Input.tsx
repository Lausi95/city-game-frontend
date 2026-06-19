import { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export function Input({ error, className = '', ...props }: InputProps) {
  return (
    <input
      className={`w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-blue-500 ${
        error
          ? 'border-red-500 focus:ring-red-500'
          : 'border-zinc-300 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100'
      } ${className}`}
      {...props}
    />
  );
}
