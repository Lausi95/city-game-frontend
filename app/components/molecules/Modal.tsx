'use client';

import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  title?: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function Modal({ title, onClose, children, className }: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-sm rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900 ${className ?? ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h3 className="mb-2 text-base font-semibold">{title}</h3>}
        {children}
      </div>
    </div>
  );
}
