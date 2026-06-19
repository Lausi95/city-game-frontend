# Agent `type` is immutable once the game has started

In the agent edit UI, the `type` field (`MISTERX` / `UTILITY`) may only be changed **before kickoff** (`now < game.startTime`). Once the game is active — and forever after — `type` is locked. Every other agent field (`firstName`, `lastName`, `alias`, `phoneNumber`, `active`) is always editable.

## Context

An agent's `type` is not a cosmetic attribute: `MISTERX` is *the* hunted identity in a Scotland-Yard-style game, and teams accumulate the agents they have *found* (`foundByTeams`). Flipping a Utility agent to Mister X mid-game would retroactively rewrite who the teams were hunting and corrupt the meaning of an existing "found" relation — e.g. a team that found a decoy would suddenly have "found Mister X."

The backend imposes no such restriction: `PATCH /games/{gameId}/agents/{agentId}` (`UpdateAgentRequest`) accepts `type` at any time. `GameResource` exposes no lifecycle status field — only `startTime` / `endTime` — so phase is purely time-derived.

The alternatives considered:
- **Allow `type` edits anytime** — matches the backend, but lets an operator silently corrupt in-flight game state.
- **Make `type` immutable always** (edit only via create) — safe, but needlessly blocks fixing a setup mistake before the game has even begun.
- **Lock `type` at kickoff** (chosen) — permits pre-game correction, forbids the destructive in-game case.

## Decision

Gate the `type` control on phase. The page computes a `canEditType = now < startTime` boolean **server-side** (the server clock is more trustworthy than the browser's and needs no client timer) and passes it down to the edit dialog. When `canEditType` is false, the `type` selector renders **disabled** with the current value and a one-line hint ("Type is locked once the game has started") — rather than being hidden, so the operator understands the field exists and why it can't change.

This is a frontend-only guard; the backend remains permissive.

## Consequences

- The gate is evaluated once at server render. If an operator keeps the page open across the kickoff moment, the control is stale until the next `router.refresh()`. Accepted as negligible.
- Because `type` can only change before any team could have found an agent, the otherwise-thorny "edit a found agent's type" case cannot arise — no `foundByTeams` reconciliation logic is needed.
- The rule lives only in the admin UI. A future non-UI client could still retype an active agent; if that becomes a real risk, the invariant should move to the backend.
