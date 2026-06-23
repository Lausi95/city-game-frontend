'use client';

import { useEffect, useState } from 'react';
import type { GeoLocation } from '@/app/types/api';

/**
 * Tracks this device's own position live via `navigator.geolocation.watchPosition`
 * and returns the latest fix (null until the first one, or when geolocation is
 * denied/unavailable). Foreground-only — a closed/backgrounded page stops watching.
 *
 * Deliberately has NO posting capability: the fix is for local situational
 * awareness only and never reaches the backend. That absence is the privacy
 * property — see docs/adr/0034-team-location-client-only.md. Contrast
 * `useAgentLocationReporting`, which DOES report (it is the game mechanic).
 */
export function useDeviceLocation(): GeoLocation | null {
  const [location, setLocation] = useState<GeoLocation | null>(null);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    let cancelled = false;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (cancelled) return;
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      },
      () => {
        // Denied / unavailable / timeout: keep the last fix (if any) and show no
        // marker until one arrives. The overlay is silent by design — no banner.
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 },
    );

    return () => {
      cancelled = true;
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return location;
}
