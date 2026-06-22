'use client';

import { ReactNode, useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/atoms/Button';
import {
  getIdentitySnapshot,
  type ParticipantIdentity,
} from '@/app/lib/identity';

// localStorage doesn't change underneath us during a page view (mirrors
// ParticipantRoot): a no-op subscribe with a 'loading' server snapshot keeps
// useSyncExternalStore happy and avoids an SSR/hydration mismatch.
const subscribe = () => () => {};
const getServerSnapshot = (): ParticipantIdentity | null | 'loading' => 'loading';

// After a recorded (or already-recorded) find we show the result briefly, then
// send the team back to their board so the caught Mister X drops off it.
const REDIRECT_DELAY_MS = 1_500;
// A find is never blocked on location, so the best-effort fix gets a short leash.
const GEO_TIMEOUT_MS = 4_000;

// The interaction phase. The precondition states (loading / no usable identity)
// are derived from the identity + link at render time, not held here.
type Phase =
  | 'confirm'
  | 'submitting'
  | 'success' // 201 newly recorded, or 409 already found — both land here (soft success)
  | 'error';

interface FindProps {
  agentId?: string;
  alias?: string;
}

interface Fix {
  latitude: number;
  longitude: number;
}

/** Shared centered shell, mirroring SetupAgent / SetupTeam so the surfaces match. */
function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-background font-sans">
      <main className="flex w-full max-w-md flex-col items-center gap-6 px-8 text-center">
        {children}
      </main>
    </div>
  );
}

function Heading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <h2 className="text-3xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="text-lg text-muted">{subtitle}</p>
    </div>
  );
}

/** Tailored copy per failure status (see the "Tailored per status" decision). */
function errorCopy(status: number): { title: string; subtitle: string } {
  if (status === 404) {
    return {
      title: 'Fund konnte nicht erfasst werden',
      subtitle:
        'Dieser Link ist möglicherweise veraltet, oder dein Team gehört nicht zu diesem Spiel. Prüfe deine Einrichtung und versuche es erneut.',
    };
  }
  if (status === 422) {
    return {
      title: 'Fund nicht verfügbar',
      subtitle:
        'Dieser Fund ist gerade nicht verfügbar — das Spiel läuft möglicherweise nicht, oder dieser Agent kann nicht gefunden werden.',
    };
  }
  return {
    title: 'Etwas ist schiefgelaufen',
    subtitle: 'Wir konnten diesen Fund nicht erfassen. Versuche es gleich noch einmal.',
  };
}

/**
 * Best-effort single GPS fix for the find body. Resolves null on denial, timeout,
 * or no geolocation — the find must never be blocked on it. Mirrors the non-fatal
 * stance of the agent location reporting (useAgentLocationReporting).
 */
function getFixBestEffort(): Promise<Fix | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, maximumAge: 0, timeout: GEO_TIMEOUT_MS },
    );
  });
}

/**
 * Find surface (see CONTEXT.md). Reached only by scanning a backend-minted find-QR
 * (`/find?agentId=&alias=`). The finding team's identity (gameId/teamId/memberId)
 * is read from localStorage; the agentId + alias come from the link. We never fetch
 * the agent record — the alias from the URL is shown verbatim so the team can't
 * learn Mister X's location or real identity (see ADR 0010), which is why there is
 * no loading phase: it is confirm → POST → result.
 */
export default function Find({ agentId, alias }: FindProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('confirm');
  // 201 vs 409 share the success phase but differ in copy.
  const [alreadyFound, setAlreadyFound] = useState(false);
  const [errorStatus, setErrorStatus] = useState(0);

  const stored = useSyncExternalStore(subscribe, getIdentitySnapshot, getServerSnapshot);
  // A usable find needs a team-member identity in localStorage (the link carries
  // no game/team IDs, so a device with none — or one set up as an agent — can't
  // be onboarded here) AND an agentId from the link.
  const identity = stored !== 'loading' && stored?.role === 'team' ? stored : null;

  const confirm = useCallback(async () => {
    if (!identity || !agentId) return;
    setPhase('submitting');

    const fix = await getFixBestEffort();
    try {
      const res = await fetch(
        `/api/participant/find?gameId=${encodeURIComponent(identity.gameId)}` +
          `&teamId=${encodeURIComponent(identity.teamId)}` +
          `&memberId=${encodeURIComponent(identity.memberId)}` +
          `&agentId=${encodeURIComponent(agentId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fix ?? {}),
        },
      );

      // 409 = the team already found this agent: a harmless re-scan, shown as a
      // soft success rather than an error.
      if (res.ok || res.status === 409) {
        setAlreadyFound(res.status === 409);
        setPhase('success');
        return;
      }

      setErrorStatus(res.status);
      setPhase('error');
    } catch {
      setErrorStatus(0); // network failure → generic copy
      setPhase('error');
    }
  }, [identity, agentId]);

  // On success (or already-found), return to the team board after a beat.
  useEffect(() => {
    if (phase !== 'success') return;
    const t = setTimeout(() => router.replace('/'), REDIRECT_DELAY_MS);
    return () => clearTimeout(t);
  }, [phase, router]);

  const aliasLabel = alias?.trim() || 'diesen Agenten';

  // Identity is read after hydration, so hold a neutral loading state until the
  // client snapshot resolves — mirrors ParticipantRoot, and avoids flashing the
  // "set up your team" message at a member who is in fact set up.
  if (stored === 'loading') {
    return (
      <Shell>
        <p className="animate-pulse text-sm text-muted">Wird geladen …</p>
      </Shell>
    );
  }

  // Precondition: no team-member identity, or a link with no agentId. Either way
  // there is nothing to onboard here — the find-QR carries no game/team IDs.
  if (!identity || !agentId) {
    return (
      <Shell>
        <Heading
          title="Richte zuerst dein Team ein"
          subtitle="Zum Erfassen eines Funds brauchst du ein Teammitglieds-Gerät. Scanne den Setup-QR deines Teams und dann diesen hier noch einmal."
        />
      </Shell>
    );
  }

  if (phase === 'submitting') {
    return (
      <Shell>
        <p className="animate-pulse text-sm text-muted">Fund wird erfasst …</p>
      </Shell>
    );
  }

  if (phase === 'success') {
    return (
      <Shell>
        <Heading
          title={alreadyFound ? 'Bereits gefunden' : `Du hast ${aliasLabel} gefunden!`}
          subtitle={
            alreadyFound
              ? `${aliasLabel} ist bereits auf deinem Spielbrett.`
              : 'Gut gemacht — du kommst zurück zu deinem Spielbrett.'
          }
        />
      </Shell>
    );
  }

  if (phase === 'error') {
    const { title, subtitle } = errorCopy(errorStatus);
    return (
      <Shell>
        <Heading title={title} subtitle={subtitle} />
        <Button variant="primary" size="lg" onClick={() => setPhase('confirm')}>
          Erneut versuchen
        </Button>
      </Shell>
    );
  }

  // confirm — alias only; we deliberately don't reveal the agent's type.
  return (
    <Shell>
      <Heading title={aliasLabel} subtitle="Bestätige, dass dein Team diesen Agenten gefunden hat." />
      <Button variant="primary" size="lg" onClick={confirm}>
        Fund bestätigen
      </Button>
    </Shell>
  );
}
