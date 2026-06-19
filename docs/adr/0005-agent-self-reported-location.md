# Agents report their own location; the agent self-view reads it back as a diagnostic

The [agent self-view](../../CONTEXT.md) (`/` for `role: agent`) both **reports** the device's position to the backend and **displays its own freshness read back from the server**. Reporting uses `navigator.geolocation.watchPosition` plus a 20-second heartbeat that re-sends the latest fix; freshness is shown by polling `GET /my-agent` (not computed locally) so the dot is a truthful "is my position actually reaching the server?" signal. This extends [ADR 0003](0003-client-polled-location-freshness.md) (the admin read-poll) to the participant write side.

## Context

[ADR 0003](0003-client-polled-location-freshness.md) built the *read* side for operators: a 20s poll + 1s tick recolors a [Last seen](../../CONTEXT.md) dot per agent. The *write* side — an agent's device actually reporting where it is — did not exist; the agent view was a stub. The backend already exposes `POST /location` (headers `X-GameId`/`X-AgentId`, body `{ latitude, longitude }`, `202`; the server stamps the timestamp). The only agent-facing read is `GET /my-agent`, which returns the agent's own record and **no game time window**.

The stated purpose was that "the agent knows the freshness of his location data" — a self-diagnostic, not decoration.

### Considered options

- **Reporting mechanism.** `getCurrentPosition` on a timer (predictable, stale-proof when still, but never fresher than the interval) vs `watchPosition` alone (freshest while moving, but a *stationary* agent emits nothing and decays to red) vs **`watchPosition` + heartbeat** (chosen): live updates while moving, and a timed re-POST of the last fix keeps a still agent green. More code (two paths feeding one "latest fix") for the best of both.
- **Freshness source.** Compute from the last *local* POST (always looks green — even while every POST silently fails server-side) vs **read back via `GET /my-agent`** (chosen): shows the timestamp the server actually holds, so a broken report path visibly decays. This is what makes the indicator a diagnostic rather than theatre, and it mirrors ADR 0003's read-poll shape.
- **Cadence.** Against the inherited ≤60s "fresh" bucket, a 30s heartbeat / 20s poll can stack to ~50s observed age and flicker yellow on a *healthy* agent. Chose **20s heartbeat / 20s poll / 1s tick** — worst-case ~40s, comfortably green, without widening the shared `LastSeenIndicator` buckets.
- **Phase gating.** ADR 0003 left the admin poll ungated. Gating reporting to the _active_ [phase](../../CONTEXT.md) would save battery, but `/my-agent` carries no time window, so it would need a new endpoint. Deferred — reporting runs whenever the view is open.

## Decision

A new public proxy `POST /api/participant/location` forwards `gameId`/`agentId` (from the client's stored identity) as `X-GameId`/`X-AgentId` to the backend `POST /location`. The agent self-view holds the latest fix in a ref, updated by `watchPosition`; a single 20s interval POSTs that fix (heartbeat), and `watchPosition` also POSTs immediately on a new fix. Freshness is rendered by reusing `LastSeenIndicator` against a 20s `GET /my-agent` poll + 1s tick — the same pattern as `AgentsSection`. Denied/unavailable geolocation surfaces a **non-blocking** banner; the identity tiles (alias, name, type, active, contact, found-by teams) render regardless.

## Consequences

- **Foreground-only.** A web page cannot report once closed or backgrounded, so an agent who locks their phone stops reporting and correctly goes stale. This is an inherent platform limit, not a bug — and the round-trip freshness makes it visible to the agent.
- **Second client-side write+poll surface.** ADR 0003 called itself "the codebase's first client-side read poll … not a precedent to copy unless a value is genuinely time-relative." Location freshness is exactly that, so this is a deliberate second instance, now on the public participant surface.
- **Browser clock, as in ADR 0003.** Freshness is measured against the agent's own device clock; a skewed clock skews the age.
- **No phase gating yet.** Reporting and polling run outside the active window where they buy nothing; gating is the first lever if battery/request volume matters, and would ride on a participant-side game-timing endpoint that does not yet exist.
