# Agent out-of-bounds is derived client-side from live GPS

The [Agent self-view](../../CONTEXT.md) tells an agent whether it is **Out of bounds** of the
**Playfield**. We compute this on the client from the agent's own live GPS fix — the same fix
`useAgentLocationReporting` already watches and reports — and compare it to the playfield
rectangle. There is no backend out-of-bounds field and no server round-trip in the decision.

The playfield rectangle is fetched through a new public participant proxy
`GET /api/participant/map?gameId=` → backend `GET /games/{gameId}/map`, mirroring the existing
participant-proxy pattern (`my-agent`, `board`). The response carries the grid too; the agent
view deliberately **ignores** it (the agent must not learn the grid or other agents — only the
outline and its own marker).

## Why

- **Consistency with the existing model.** Phase and Last seen are already derived on the client
  from present state, never stored. Out of bounds is the spatial sibling — a function of position,
  not a record. A backend OOB field would be the odd one out and add a write path for a purely
  derived fact.
- **Responsiveness.** "Go back into the playfield" must react to where the agent is *now*, not to
  a position read back ≤20s late. Using the live fix makes the banner, the marker, and the bounds
  decision instant and mutually consistent — they all derive from one fix, so they cannot disagree.
- **Self-contained.** No new backend contract beyond exposing the already-public map; the proxy is
  the only contract change, which is the genuinely hard-to-reverse part.

## Consequences

- Unknown is a real state: before the first fix, or when location is denied/unavailable, the
  relation is neither in nor out. We show no "go back" prompt then — the existing reporting banner
  already explains a denied/unavailable sensor, and we don't stack a second banner on top.
- The mini-map does not hard-lock `maxBounds` to the rectangle: when the agent is outside, the map
  fits both the rectangle and the marker so the way back is visible.
