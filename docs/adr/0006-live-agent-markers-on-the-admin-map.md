# Live agent markers on the admin map, fed by lifted shared state

The game detail map plots each **active, located** agent as a colored point that updates live; hovering a point shows the agent's alias and last-seen age. The 20s location poll and 1s wall-clock tick that previously lived inside `AgentsSection` are lifted into a shared `AgentsProvider` (React context), so the agent list and the map read **one** moving copy of agent state.

## Context

[ADR 0003](0003-client-polled-location-freshness.md) chose a client poll + dedicated read endpoint "surgical: only the agent list updates, **the map never re-renders**." Read literally, that line looks like it forbids what we just did. It does not: 0003's concern was re-running the *server component* via `router.refresh()`, which would **remount** the entire Leaflet `MapContainer` (expensive, and it would reset pan/zoom). Updating `CircleMarker` children inside an *already-mounted* `MapContainer` is ordinary React reconciliation — cheap, and no remount. So live markers are compatible with 0003's intent, not a reversal of it. This ADR exists mainly to stop a future reader from "fixing" the live markers in the name of 0003.

A static map beside the live list was the alternative, and it is visibly incoherent: a dot frozen at its load-time position next to a list row reading "4m ago". Since the list already polls, the only real question was *where the polled state lives*.

### Considered options

- **Duplicate the poll** — give the map its own 20s poll of the same endpoint. Two requests, two copies of agent state that can drift. Rejected.
- **Lift state into a shared provider** (chosen) — `AgentsProvider` owns the poll + tick and exposes `{ agents, now }`; `AgentsSection` and `GameMapClient` both consume it. One source of truth; the page stays a server component for everything static.
- **Color encoding** — the marker can carry only one color language. Corners were red/green, the type Badge is red/blue, freshness is green/yellow/red. Chose to encode **type** (red `MISTERX` / blue `UTILITY`, matching the Badge the list already teaches) so the map answers "where is Mister X vs the decoys?", and moved freshness into the hover tooltip. Corner markers were recolored to neutral slate so red unambiguously means Mister X. (This sub-choice is easily reversible and not itself ADR-worthy; recorded here only for the rationale behind the corner recolor.)

## Decision

- Add `AgentsProvider` wrapping the game detail body; it owns the 20s poll of `GET /api/admin/games/[gameId]/agents`, the 1s tick, and prop-reseed on `router.refresh()`.
- `GameMap` renders a `CircleMarker` + non-permanent `Tooltip` for each agent with `active === true && location !== null`. Color = type. Tooltip = alias + last-seen age.
- Inactive agents and agents that have never reported are not plotted (no coordinates to place, or not in play).

## Consequences

- **Markers and the list can no longer drift** — they share one polled array. `AgentsSection` no longer polls on its own.
- **Foreground/staleness behavior is inherited** from ADR 0003 / [0005](0005-agent-self-reported-location.md): a marker reflects the last reported fix and is only as fresh as the device's reporting. Freshness is in the tooltip, not the marker color, so a stale agent is not visually flagged on the map at a glance — accepted, since the list carries the freshness dot.
- **"The map never re-renders" (ADR 0003) is now read as "never *remounts*."** This ADR is the deliberate clarification of that line.
