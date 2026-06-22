# Operator manual find reuses POST /find with a borrowed member

An [Operator](../../CONTEXT.md) can record a [Find](../../CONTEXT.md) on a team's behalf from the admin team list — a **faithful fallback** for when the field flow fails (dead phone, broken camera, no signal), not an authoritative override. A "record find" action on each team row opens a dialog, the operator picks an agent, confirms, and the find is recorded exactly as if a member had scanned the find-QR.

We deliberately **reuse the participant `POST /find` unchanged** rather than add an admin find endpoint. `POST /find` requires `X-MemberId` (a find is recorded *by* a member), but the [Found](../../CONTEXT.md) relation it establishes is team↔agent — the member is only the trigger record. So the admin proxy route looks up the team's members and **borrows one** (`members[0]`) to satisfy the header; the operator selects only the agent. A team with no members yet cannot record a find — the route surfaces that as an error.

Because it is a fallback and not an override, it respects every backend rule:

- The agent dropdown is **pre-filtered to exactly what the backend accepts** — active [Mister X](../../CONTEXT.md) the team hasn't found yet (the sole findable identity, ADR 0011). Empty set → disabled. The operator cannot pick a losing option.
- **Phase is the exception:** the button is always enabled and a non-_active_ [game](../../CONTEXT.md) is left to the backend's 422, surfaced in the dialog. The dropdown filter is static data already in hand; phase is a live clock value that would need new wiring into the team list for marginal benefit.
- A find is irreversible (there is no un-find; only deleting the team clears it) and counts on the [leaderboard](../../CONTEXT.md) immediately, so the dialog requires an **explicit confirm** ("Record that <team> found <alias>? This can't be undone.").

## Considered options

- **New backend endpoint** (member-optional, team-level find) — cleanest domain model, no borrowed member, but requires backend work that was out of scope.
- **Operator also selects the member** — accurate attribution, but adds UI the request didn't ask for, and the member isn't part of the [Found](../../CONTEXT.md) relation anyway.

We picked borrowed-member-via-`/find` to ship with no backend change while keeping the recorded relation byte-for-byte identical to a field find. Recorded because the borrowed `members[0]` is surprising on its own: a reader will wonder why the admin route reads team members at all. It is there solely to feed `X-MemberId`; the attribution is incidental.
