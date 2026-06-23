# Operator manual location reuses POST /location with no borrowed identity

An [Operator](../../CONTEXT.md) can set an [Agent](../../CONTEXT.md)'s position by hand from the admin agent list — a **faithful fallback** for when the agent's own [Location reporting](../../CONTEXT.md) fails (dead phone, no signal, denied GPS) and a debugging convenience, not an authoritative override. A "set position" action on each agent row opens a dialog with the [Playfield](../../CONTEXT.md) map; the operator clicks a point, confirms, and the fix is recorded exactly as if the agent's device had reported it.

We **reuse the participant `POST /location` unchanged** rather than add an admin location endpoint — the same move as [operator manual find](0013-operator-manual-find-reuses-find-endpoint.md). Location is keyed on the agent alone (`X-GameId`+`X-AgentId`, body `{ latitude, longitude }`, timestamp stamped server-side), so unlike find there is **no borrowed member** to satisfy — the admin proxy route attaches the two identity headers and `tenantHeaders()` and posts. The result is byte-for-byte a [Last seen](../../CONTEXT.md) fix indistinguishable from a device report.

Decisions folded in here, each a deliberate departure from the manual-find shape:

- **Every agent row, any type or `active` state** — location reporting is a per-agent capability ([Utility agents](../../CONTEXT.md) appear on the [Board](../../CONTEXT.md) at their exact point too), so the button is not Mister-X-only.
- **One-shot, not a sticky pin.** Nothing re-sends the fix, so a manually-set position decays _fresh_ → _recent_ → _stale_ like any real fix that stopped updating. This matches "as if the agent sent the update" (one update) and avoids the background-timer / un-pin machinery a live pin would need. If the agent is still stuck, the operator sets it again.
- **No second confirm** — unlike find. A find is irreversible and counts on the [leaderboard](../../CONTEXT.md) immediately; a position is freely overwritten by the agent's next real fix and is re-settable, so there is nothing to regret. The fix being **immediately visible to hunting teams on the [Board](../../CONTEXT.md)** (exact point for a utility agent, [Cell](../../CONTEXT.md) for [Mister X](../../CONTEXT.md)) is the *intended* effect, not a hazard to guard against. The dialog's own "set position" button is the deliberate action.
- **No bounds restriction.** A click outside the playfield is accepted — [Out of bounds](../../CONTEXT.md) is a legitimate agent state, and the backend takes any coordinate. The picker draws the playfield outline for context and may note when the point is outside, but never blocks.
- **No [Phase](../../CONTEXT.md) gate** — reporting is never phase-gated, so neither is this.

## Considered options

- **Sticky auto-refreshing pin** — keeps the agent green until un-pinned; a meaningfully larger feature (server-side pin state, a background re-sender, an un-pin affordance) for a fallback that only needs to place a fix once. Rejected.
- **New admin location endpoint** — cleaner than reusing a tokenless participant write from an operator-gated route, but requires backend work that was out of scope, for no change to the recorded fix.

We picked one-shot-via-`POST /location` to ship with no backend change while keeping the recorded fix identical to a field report. Recorded because an operator writing a position "as if the agent" is a real trust capability (an operator can place any agent anywhere on the live board), and because reusing a participant endpoint from an admin route — without the borrowed-member step that 0013 needed — is worth pinning down next to its sibling.
