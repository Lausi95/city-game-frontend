import { ReactNode } from 'react';

export interface IdentityField {
  label: string;
  value: string;
}

interface ParticipantStubProps {
  title: string;
  subtitle: string;
  /** Resolved identity IDs, shown so the branch + contract are visibly verifiable. */
  fields?: IdentityField[];
  /** Placeholder for the action this view will eventually offer. */
  comingSoon?: ReactNode;
  /** Primary action for this state (e.g. a "scan QR" button). */
  action?: ReactNode;
}

/**
 * Presentational shell for the root participant surface. Stub for now — see
 * docs/adr/0004-root-is-public-participant-surface.md (header-claimed actions
 * are a later session).
 */
export default function ParticipantStub({
  title,
  subtitle,
  fields,
  comingSoon,
  action,
}: ParticipantStubProps) {
  return (
    <div className="flex min-h-[calc(100vh-65px)] items-center justify-center">
      <main className="flex w-full max-w-md flex-col items-center gap-6 px-8 text-center">
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-3xl tracking-tight text-foreground">
            {title}
          </h2>
          <p className="text-lg text-muted">{subtitle}</p>
        </div>

        {fields && fields.length > 0 && (
          <dl className="w-full divide-y divide-border rounded-lg border border-border bg-surface text-left">
            {fields.map((field) => (
              <div
                key={field.label}
                className="flex items-center justify-between gap-4 px-4 py-2.5"
              >
                <dt className="text-sm text-muted">{field.label}</dt>
                <dd className="font-mono text-sm text-foreground">
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {action}

        {comingSoon && (
          <p className="rounded-md border border-dashed border-border-strong px-4 py-3 text-sm text-muted">
            {comingSoon}
          </p>
        )}
      </main>
    </div>
  );
}
