'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/app/components/atoms/Button';
import { Tooltip } from '@/app/components/molecules/Tooltip';

interface ModalProps {
  title?: ReactNode;
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
        <div className="mb-2 flex items-start justify-between gap-2">
          {title ? <h3 className="text-base font-semibold">{title}</h3> : null}
          <div className="ml-auto">
            <Tooltip label="Schließen">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                aria-label="Schließen"
                className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Tooltip>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
