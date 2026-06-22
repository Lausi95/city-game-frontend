'use client';

import { useState } from 'react';
import Image from 'next/image';
import { QrCode } from 'lucide-react';
import { Modal } from '@/app/components/molecules/Modal';

interface FindQrDialogProps {
  gameId: string;
  agentId: string;
  onClose: () => void;
}

const QR_SIZE = 288;

/**
 * Shows the agent's live find-QR (see ADR 0011). Only an active Mister X reaches
 * this — the gate lives in the caller. The PNG is scanned off this screen by a
 * second phone, so it renders large on a forced-white background with a quiet zone,
 * independent of light/dark theme. The image is rendered plainly (no opacity/loading
 * gate): a same-origin PNG loads near-instantly, and gating on `onLoad` would leave
 * the QR invisible whenever the browser serves it from cache and the event never fires.
 */
export default function FindQrDialog({ gameId, agentId, onClose }: FindQrDialogProps) {
  const [errored, setErrored] = useState(false);

  const src = `/api/participant/find-qr?gameId=${encodeURIComponent(gameId)}&agentId=${encodeURIComponent(agentId)}`;

  return (
    <Modal
      title={
        <span className="inline-flex items-center gap-2">
          <QrCode className="h-4 w-4" aria-hidden="true" />
          Fund-QR
        </span>
      }
      onClose={onClose}
    >
      <div className="flex flex-col items-center gap-4">
        <p className="text-center text-sm text-muted">
          Zeig das einem Team, damit es ihn scannen und seinen Fund erfassen kann.
        </p>

        <div
          className="flex items-center justify-center rounded-lg bg-white p-4"
          style={{ width: QR_SIZE + 32, height: QR_SIZE + 32 }}
        >
          {errored ? (
            <p className="px-2 text-center text-sm text-muted">
              Dein QR-Code konnte nicht geladen werden. Prüfe deine Verbindung und versuche es erneut.
            </p>
          ) : (
            <Image
              src={src}
              alt="Dein Fund-QR-Code"
              width={QR_SIZE}
              height={QR_SIZE}
              unoptimized
              onError={() => setErrored(true)}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}
