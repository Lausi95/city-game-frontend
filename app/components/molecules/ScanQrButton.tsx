'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/app/components/atoms/Button';
import QrScannerDialog from '@/app/components/organisms/QrScannerDialog';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ScanQrButtonProps {
  /** Heading shown in the scanner modal. */
  dialogTitle: string;
  /** Line above the camera telling the user which QR to point at. */
  hint: string;
  /** Trigger button contents (icon and/or label). */
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  'aria-label'?: string;
  title?: string;
}

/**
 * A button that opens the in-app {@link QrScannerDialog}. Used on the
 * "no role set" participant stub (not-set-up → Setup QR) and in the team-member
 * view (→ Find QR); agents never scan (see ADR 0032). Owns only the open/close
 * state so the dialog mounts lazily — and the camera only starts — on tap.
 */
export default function ScanQrButton({
  dialogTitle,
  hint,
  children,
  variant,
  size,
  className,
  ...rest
}: ScanQrButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
        {...rest}
      >
        {children}
      </Button>
      {open && (
        <QrScannerDialog title={dialogTitle} hint={hint} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
