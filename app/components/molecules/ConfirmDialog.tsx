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
  confirmLabel = 'Bestätigen',
  onConfirm,
  onCancel,
  loading = false,
  error,
}: ConfirmDialogProps) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="mb-4 text-sm text-muted">{description}</p>
      {error && <p className="mb-4 text-xs text-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={loading} autoFocus>
          Abbrechen
        </Button>
        <Button variant="danger" size="sm" onClick={onConfirm} disabled={loading}>
          {loading ? '…' : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
