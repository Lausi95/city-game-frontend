# The agent out-of-bounds map is sourced from the public `/board`, not `/games/{gameId}/map`

The agent self-view draws its [out-of-bounds](../../CONTEXT.md) outline from the public, top-level `GET /board` — a participant proxy fetches it server-side and returns **only** `board.map` (the playfield corners + grid), **stripping the agents**. The previously-used `GET /games/{gameId}/map` is no longer called by any participant flow; it stays an authenticated `/games/**` endpoint used only by the operator admin pages.

## Context

Out-of-bounds (ADR 0012) is derived client-side from the agent's own GPS against the playfield's `cornerA`/`cornerB` rectangle, so the agent self-view needs the playfield corners. It fetched them from `GET /games/{gameId}/map` via a public participant proxy.

ADR 0014 makes every `/games/**` endpoint require the operator's OAuth token. Participants are definitionally tokenless, so this single participant call under `/games/**` had to go somewhere — otherwise the otherwise-absolute rule needs a carve-out.

Among existing endpoints, the only other source of the playfield corners is `GET /board` (top-level, public), whose `BoardResource` embeds `map: MapDto` alongside the live agents.

## Decision

Repoint the agent self-view at a public participant proxy over `GET /board`. The proxy returns **only `board.map`**, dropping `utilityAgents` and `misterxAgents` server-side before responding. No participant flow touches `/games/**`, so ADR 0014's rule stays exception-free.

### Considered and rejected

- **A public exception for `GET /games/{gameId}/map`.** Leaves a carve-out in an otherwise absolute `/games/**` rule, complicating both the backend allow-list and the auth story.
- **Routing the agent view at `/board` raw.** Hands every participant device the full spectator board — Mister X's cell and every utility agent's exact `geoLocation` land in the JSON, readable in devtools. This breaks the [Board](../../CONTEXT.md) obfuscation that exists precisely to hide Mister X. Rejected.

## Consequences

- **The server-side strip is load-bearing.** Forwarding `/board` raw to a participant device reintroduces the leak; the proxy must return only `map`. This is the whole reason the change is safe.
- `/games/{gameId}/map` is now operator-only (authenticated via `backend.ts`), and `/games/**` is uniformly behind the token with zero public exceptions.
- The agent bounds map now depends on `/board`; the corners it yields are identical to those `…/map` returned.
