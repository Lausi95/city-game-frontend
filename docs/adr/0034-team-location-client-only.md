# Team member location is client-only situational awareness

The team-member view plots the [Member](../../CONTEXT.md)'s **own** device location as a low-distraction marker on the team [Board](../../CONTEXT.md), tracked live in the browser with `navigator.geolocation.watchPosition`. That fix is used **only** to draw the marker — it is **never sent to the backend**. There is no team-side `POST /location`, no heartbeat, no proxy; the coordinate never leaves the device.

This is a deliberate asymmetry with the [Agent](../../CONTEXT.md). An agent **reports** its position as a game mechanic ([Location reporting](../../CONTEXT.md), `POST /location`, ADR 0005) — being plotted is the point of being the hunted. A team is the **hunter**; its position is private situational awareness ("where am I on the board relative to the agents I'm chasing"), not game state anyone else may read. A future reader who sees the agent's report-and-read-back path (ADR 0005) would reasonably assume the team mirrors it — it deliberately does not, and sending team coordinates to the server would be a privacy regression, not a missing feature.

## Decision

- A new minimal client hook (`useDeviceLocation`) watches the browser geolocation and returns the latest `GeoLocation | null`. It has **no** posting capability — the absence of a `post` path is what enforces the client-only property, not discipline at the call site.
- `TeamView` owns the hook (mirroring how `AgentView` owns its location hook) and passes the fix into `BoardMap` as an optional `selfLocation` prop. `BoardMap` renders it as a plain `CircleMarker` in a colour outside the [Mister X](../../CONTEXT.md) brass / [Utility agent](../../CONTEXT.md) fog palette so it reads as "you" without competing with the game pieces.

## Considered options / consequences

- **Render at true coordinates, no out-of-bounds handling.** Unlike the [Agent self-view](../../CONTEXT.md)'s out-of-bounds map (ADR 0012, ADR 0015), `BoardMap` keeps its hard `maxBounds` lock on the [Playfield](../../CONTEXT.md) extent. The self-marker is plotted at its real position; if the member strays outside the playfield the dot simply falls outside the pannable area and is not visible. We chose this over suppressing or clamping the marker — a clamped dot would misrepresent position, and a team is expected to play inside the boundary, so the in-bounds case is the norm.
- **The dot never moves the camera.** The board stays framed on the grid; live fixes update the marker only, never `fitBounds`. The map exists to show the board, not to follow the player.
- **Silent when there is no fix.** Permission denied / unavailable / not-yet-acquired → no marker and no chrome. The dot is a convenience overlay, not core to play (contrast the agent, whose reporting status *is* surfaced because it is the mechanic), so no status banner is shown; the browser's own permission prompt is the only UI.
- **Foreground-only**, like all browser geolocation here — the watch stops when the page is backgrounded. Acceptable: a hidden dot for a hidden page costs nothing.

Sits alongside ADR 0005 (agents report), ADR 0008 (the board withholds inference power from the hunting team) and ADR 0017 (the tenant boundary) as part of the deliberate split over what participant location data the backend does and does not receive.
