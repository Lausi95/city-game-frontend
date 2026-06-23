'use client';

import { useEffect, useRef, useState } from 'react';
import { QrCode } from 'lucide-react';
import QrScanner from 'qr-scanner';
import { Modal } from '@/app/components/molecules/Modal';

interface QrScannerDialogProps {
  /** Modal heading. */
  title: string;
  /** Short line above the camera telling the user what to point at. */
  hint: string;
  onClose: () => void;
}

type State = 'starting' | 'scanning' | 'error';

/**
 * In-app QR scanner (see ADR 0032). Opens the camera in a modal and, on a
 * successful read, navigates to the decoded URL — exactly what the phone's
 * camera app does — so the existing /setup-team, /setup-agent and /find pages
 * do all the role-specific work.
 *
 * The decoded value is an arbitrary absolute URL with NO same-origin guard (a
 * deliberate, recorded decision — ADR 0032), so navigation is a full page load
 * via `window.location.href`, not a client `router.push`.
 *
 * Decoding uses the `qr-scanner` library because iOS WebKit lacks the native
 * BarcodeDetector (ADR 0033). When the camera is unavailable (permission
 * denied, no camera, insecure context) we fall back to telling the user to use
 * their phone's camera app — the always-available escape hatch.
 */
export default function QrScannerDialog({ title, hint, onClose }: QrScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<State>('starting');
  // A decode can fire after we've already navigated; guard so we act once.
  const handledRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const scanner = new QrScanner(
      video,
      (result) => {
        if (handledRef.current) return;
        handledRef.current = true;
        scanner.stop();
        // No URL guard — reproduce the camera app verbatim (ADR 0032).
        window.location.href = result.data;
      },
      {
        preferredCamera: 'environment',
        highlightScanRegion: true,
        highlightCodeOutline: true,
      },
    );

    let cancelled = false;
    scanner
      .start()
      .then(() => {
        if (!cancelled) setState('scanning');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });

    return () => {
      cancelled = true;
      scanner.destroy();
    };
  }, []);

  return (
    <Modal
      title={
        <span className="inline-flex items-center gap-2">
          <QrCode className="h-4 w-4" aria-hidden="true" />
          {title}
        </span>
      }
      onClose={onClose}
    >
      <div className="flex flex-col items-center gap-4">
        {state === 'error' ? (
          <p className="px-2 text-center text-sm text-muted">
            Auf die Kamera kann nicht zugegriffen werden. Erlaube den Kamerazugriff und versuche es
            erneut – oder scanne den QR-Code mit der Kamera-App deines Handys.
          </p>
        ) : (
          <>
            <p className="text-center text-sm text-muted">{hint}</p>
            {/*
              The video sits in its own wrapper so React never reorders its
              children: qr-scanner injects its scan-region highlight as a sibling
              of the <video>, and a conditionally-rendered overlay nested in the
              same parent would make React and qr-scanner fight over the DOM.
              The "starting" overlay therefore lives in the OUTER container.
            */}
            <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-black">
              <div className="h-full w-full">
                <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
              </div>
              {state === 'starting' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="animate-pulse text-sm text-white/80">Kamera wird gestartet …</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
