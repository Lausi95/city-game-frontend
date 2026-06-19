# Location freshness is derived live on the client, not server-rendered

The agent "last seen" indicator (a colored dot + relative age, e.g. 🟢 "12s ago") is computed **on the client against the browser clock**, refreshed by a short color re-tick (~1s) and a 20-second background poll of a dedicated read endpoint — rather than rendered once by the server like the rest of the page.

## Context

Every other piece of the game detail page is fetched once, server-side, in the `page.tsx` server component (`fetchGame`/`fetchMap`/`fetchTeams`/`fetchAgents`) and only re-fetched when an admin mutation calls `router.refresh()`. That convention works because the rest of the data is effectively static between edits.

[Last seen](../../CONTEXT.md) is different: it is a function of *now*. An agent reporting its position every few seconds in the field produces a `location.timestamp` that is only meaningful relative to the current clock. A value rendered server-side is correct for a single instant and then silently decays — a dot rendered "green" at page load would still read green an hour later, which is exactly the failure the indicator exists to prevent. The indicator is only truthful if both the *data* and the *clock* it's measured against keep moving.

The backend exposes agent locations only through the agents collection (`GET /games/{gameId}/agents`, each `AgentResource` carrying `location: { timestamp, latitude, longitude } | null`). There was no client-callable read route — only `POST` for creation.

Alternatives considered:
- **Snapshot at load** — compute the dot once server-side. Simplest, but stale the instant it renders; useless for live monitoring.
- **Tick the color only** — recolor the load-time timestamp on a client timer with no new data. Dots decay correctly but never recover: a still-reporting agent drifts to red until a manual refresh.
- **`router.refresh()` on a timer** — re-run the whole server render every 20s. No new endpoint, but re-fetches game + map + teams + agents each tick and risks re-rendering the Leaflet map.
- **Client poll + dedicated endpoint** (chosen) — surgical: only the agent list updates, the map never re-renders.

## Decision

Add `GET /api/admin/games/[gameId]/agents` returning the agents collection. `AgentsSection` seeds local state from its server-rendered props, then a 20-second `setInterval` poll merges fresh `location` data into that state. A separate ~1-second timer recomputes each dot's bucket from `Date.now() - timestamp` so a dot crossing the 1-min or 5-min line recolors between polls without a request. Mutations (create/edit) continue to use `router.refresh()`; a `useEffect` reseeds local state when props change so the two paths don't fight.

Freshness buckets, inclusive upper bounds:

| Bucket | Age | Dot |
|---|---|---|
| fresh | ≤ 60s | green |
| recent | ≤ 300s | yellow |
| stale | > 300s | red |
| no location | `location` is `null` | gray |

The 20s poll is unconditional while the page is open — no tab-visibility or game-phase gating — chosen for simplicity over minimizing idle requests.

## Consequences

- Freshness is measured against the **browser** clock, not the server clock. This deliberately diverges from [ADR 0002](0002-agent-type-immutable-after-kickoff.md), which preferred the server clock for the `type` gate. The trade-off is opposite here: a continuously-moving local clock with no round-trip beats a trustworthy-but-frozen render-time clock. An operator with a skewed system clock will see ages off by that skew; accepted.
- This is the codebase's first client-side read poll and first duplicate (client-callable) read endpoint. It is a deliberate, localized exception to the server-fetch-once convention — not a precedent to copy unless a value is genuinely time-relative.
- An always-on 20s poll keeps fetching in backgrounded tabs and outside the active phase, where it buys nothing. If request volume ever matters, gating on `document.visibilityState` and game phase is the first lever.
- The new endpoint returns the full agents collection though the poll only needs `{ id, location }`. If payload size becomes a concern, a lighter locations-only backend endpoint would be the follow-up.
