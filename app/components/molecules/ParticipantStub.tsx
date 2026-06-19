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
}: ParticipantStubProps) {
  return (
    <div className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-md flex-col items-center gap-6 px-8 text-center">
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            {title}
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">{subtitle}</p>
        </div>

        {fields && fields.length > 0 && (
          <dl className="w-full divide-y divide-zinc-200 rounded-lg border border-zinc-200 text-left dark:divide-zinc-800 dark:border-zinc-800">
            {fields.map((field) => (
              <div
                key={field.label}
                className="flex items-center justify-between gap-4 px-4 py-2.5"
              >
                <dt className="text-sm text-zinc-500">{field.label}</dt>
                <dd className="font-mono text-sm text-zinc-800 dark:text-zinc-200">
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {comingSoon && (
          <p className="rounded-md border border-dashed border-zinc-300 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-700">
            {comingSoon}
          </p>
        )}
      </main>
    </div>
  );
}
