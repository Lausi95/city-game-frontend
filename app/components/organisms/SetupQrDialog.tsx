'use client';

import { useState } from 'react';
import Image from 'next/image';
import { QrCode } from 'lucide-react';
import { Button } from '@/app/components/atoms/Button';
import { Modal } from '@/app/components/molecules/Modal';

interface SetupQrDialogProps {
  kind: 'team' | 'agent';
  /** Backend-minted setup-QR PNG endpoint (e.g. /api/admin/games/.../setup-qr). */
  src: string;
  /** Printed on top of the sheet — the team name or the agent alias. */
  printName: string;
  onClose: () => void;
}

const QR_SIZE = 288;

const COPY = {
  team: {
    title: 'Setup-QR – Team',
    guidance:
      'Wenn ein Gerät diesen QR-Code scannt, wird es diesem Team zugewiesen. Drucke den Code am besten aus, damit Teammitglieder ihre Geräte unabhängig einrichten können – ohne das Admin-Panel zu öffnen.',
    caption: 'Scanne den QR-Code, um dein Gerät diesem Team hinzuzufügen.',
    alt: 'Setup-QR-Code des Teams',
  },
  agent: {
    title: 'Setup-QR – Agent',
    guidance:
      'Wenn ein Gerät diesen QR-Code scannt, wird es diesem Agenten zugewiesen. Der Code kann ausgedruckt werden, aber da jeder Agent einzigartig ist und sich ohnehin bei der Spielleitung meldet, wird empfohlen, ihn direkt vom Bildschirm zu scannen.',
    caption: 'Scanne den QR-Code, um dieses Gerät als Agent einzurichten.',
    alt: 'Setup-QR-Code des Agenten',
  },
} as const;

/**
 * Shows a backend-minted setup QR in a modal (see ADR 0024) — replaces the old
 * "open in a new tab" behaviour. The code is scanned off this screen (especially
 * for agents, which are scanned straight from the operator's display), so it
 * renders large on a forced-white background with a quiet zone, independent of
 * theme — same treatment as the find-QR (ADR 0011).
 *
 * "Drucken" prints a clean sheet carrying the name + QR + a self-explanatory
 * caption, for unattended setup. The print sheet reuses the very same PNG URL the
 * modal already displays, so it is served from cache and `window.print()` never
 * fires on a not-yet-decoded (blank) QR. The image is rendered plainly with no
 * `onLoad` gate: a cached PNG may never fire the event (see FindQrDialog).
 */
export default function SetupQrDialog({ kind, src, printName, onClose }: SetupQrDialogProps) {
  const [errored, setErrored] = useState(false);
  const copy = COPY[kind];

  return (
    <>
      <Modal
        title={
          <span className="inline-flex items-center gap-2">
            <QrCode className="h-4 w-4" aria-hidden="true" />
            {copy.title}
          </span>
        }
        onClose={onClose}
      >
        <div className="flex flex-col items-center gap-4">
          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">{copy.guidance}</p>

          <div
            className="flex items-center justify-center rounded-lg bg-white p-4"
            style={{ width: QR_SIZE + 32, height: QR_SIZE + 32 }}
          >
            {errored ? (
              <p className="px-2 text-center text-sm text-zinc-500">
                Der QR-Code konnte nicht geladen werden. Prüfe deine Verbindung und versuche es
                erneut.
              </p>
            ) : (
              <Image
                src={src}
                alt={copy.alt}
                width={QR_SIZE}
                height={QR_SIZE}
                unoptimized
                onError={() => setErrored(true)}
              />
            )}
          </div>

          <Button variant="secondary" size="sm" onClick={() => window.print()} disabled={errored}>
            Drucken
          </Button>
        </div>
      </Modal>

      {/*
        Print-only sheet — rendered as a sibling of the Modal, NOT inside it: the
        Modal is `position: fixed`, so an absolutely-positioned print block nested
        within it would resolve against the modal (and fixed ancestors print
        unpredictably). Hidden on screen; revealed only in @media print. Reuses the
        same PNG `src` the modal already displays, so it is served from cache and
        prints populated, not blank.
      */}
      <div className="setup-qr-print" aria-hidden="true">
        <p className="setup-qr-print__name">{printName}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="setup-qr-print__img" />
        <p className="setup-qr-print__caption">{copy.caption}</p>
      </div>

      <style>{`
        .setup-qr-print { display: none; }
        @media print {
          body * { visibility: hidden !important; }
          .setup-qr-print, .setup-qr-print * { visibility: visible !important; }
          .setup-qr-print {
            display: flex !important;
            flex-direction: column;
            align-items: center;
            gap: 24px;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            padding: 64px 24px;
            background: #fff;
            color: #000;
          }
          .setup-qr-print__name {
            font-size: 28px;
            font-weight: 700;
            text-align: center;
          }
          .setup-qr-print__img {
            width: 320px;
            height: 320px;
          }
          .setup-qr-print__caption {
            font-size: 16px;
            text-align: center;
            max-width: 360px;
          }
        }
      `}</style>
    </>
  );
}
