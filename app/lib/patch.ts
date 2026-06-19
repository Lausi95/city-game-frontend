/**
 * Builds a PATCH body using the app-wide convention (see docs/adr/0001):
 * every field is present; unchanged fields are `null`, changed fields carry
 * their new value. The backend treats `null` as "leave unchanged".
 *
 * Comparison-agnostic by design: callers compute `changed` with whatever
 * comparator the field needs (trimmed string, Date.getTime(), deep compare),
 * so no equality logic ever lives in here.
 */
export type PatchField = {
  key: string;
  value: unknown;
  changed: boolean;
};

export function buildPatch(fields: PatchField[]): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const { key, value, changed } of fields) {
    body[key] = changed ? value : null;
  }
  return body;
}
