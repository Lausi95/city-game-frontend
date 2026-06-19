'use client';

import { Button } from '@/app/components/atoms/Button';
import { Modal } from '@/app/components/molecules/Modal';

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
  loading = false,
  error,
}: ConfirmDialogProps) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      {error && <p className="mb-4 text-xs text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={loading} autoFocus>
          Cancel
        </Button>
        <Button variant="danger" size="sm" onClick={onConfirm} disabled={loading}>
          {loading ? '…' : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
