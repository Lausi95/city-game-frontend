# PATCH requests send `null` for unchanged fields

When editing a resource (teams, games) we send **every** field in the PATCH body, setting unchanged fields to `null` and changed fields to their new value. We do **not** omit unchanged fields.

## Context

The backend's `Update*Request` / `Patch*Request` schemas (e.g. `UpdateTeamRequest`, `PatchGameRequest`) mark **no field as nullable** in the OpenAPI spec, which makes deliberately sending `null` look wrong. Empirical probing of the running backend (2026-06) showed the opposite: for both `PATCH /games/{id}/teams/{id}` and `PATCH /games/{id}`, the three cases are equivalent —

- `{field: null}` → field **preserved** (no change)
- `{}` (field omitted) → field **preserved** (no change)
- `{field: "value"}` → field updated

So at the backend, **`null` ≡ omit ≡ "leave unchanged."** Neither convention can wipe a field; the spec's non-nullable typing does not reflect runtime behaviour.

## Decision

Use the explicit-`null` convention everywhere, encapsulated in a shared `buildPatch` helper. The helper is **comparison-agnostic**: callers pass `{ key, value, changed }[]` (having computed `changed` with whatever comparator the field needs), and it emits `{ key: changed ? value : null }`. This keeps field-specific equality logic (trimmed-string for a team name, `Date.getTime()` for game times, deep-compare for the game map) in the forms, never inside the helper.

## Consequences

- Choosing `null` over omit is a stylistic/consistency choice, **not** a correctness one — proven equivalent above. We picked `null` so a future reader sees intent ("this field was considered and left unchanged") rather than absence.
- `EditGameForm` was migrated from its original omit logic onto `buildPatch`. This is runtime-invisible to the backend; the risk was purely client-side (its bespoke time/map change-detection had to be preserved when feeding `changed` into the helper).
- `buildPatch` stays primitive-only — no speculative nested-object diffing for fields that don't yet exist.
