# Team board omits last-seen freshness

The team [Board](../../CONTEXT.md) (`GET /board`, rendered as the team-member view at `/`) deliberately shows **no last-seen freshness** for the agents it plots — no colored freshness dot, no relative age, no fading of stale sightings. A tap on a utility marker or a Mister X cell reveals the agent **alias(es) only**. The `lastSeenAt` field the endpoint returns is intentionally unused by the UI.

This is a deliberate deviation: [Last seen](../../CONTEXT.md) freshness is a first-class concept everywhere else — the admin map colors agent markers by freshness, the agent self-view surfaces it as a self-diagnostic, and ADR 0003 formalises the client-polled freshness model. A reader would reasonably assume the board does the same.

We chose to omit it for two reasons:

1. **Obfuscation.** Mister X is already obfuscated to a grid [Cell](../../CONTEXT.md) rather than a point; layering in "how fresh is this sighting" hands the hunting team more inference power than the game intends.
2. **Simplicity / readability.** The board is a full-screen, glanceable hunting surface on a phone. Freshness colors and ages compete with the red cells and the faded multi-agent counts for the player's attention; the cleaner map won.

Reversible if play-testing shows teams need staleness cues — `lastSeenAt` is already in the payload, so adding it later is a UI-only change. Recorded so the omission reads as a decision, not an oversight to "fix".
