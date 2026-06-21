# Find confirmation trusts the URL alias and never fetches the agent

The participant [Find](../../CONTEXT.md) surface (`/find?agentId=&alias=`, reached only by scanning a backend-minted find-QR) shows the agent's `alias` **straight from the URL** and lets the team member confirm against that. It deliberately does **not** call `GET /my-agent` (or any read endpoint) to look the agent up before recording the find.

A reader would reasonably expect the opposite: confirm screens elsewhere fetch first (`SetupAgent` reads `/my-agent` to show who the device is becoming). So the omission is recorded as a decision, not an oversight.

We never fetch because the device performing the find belongs to a **hunting [Team](../../CONTEXT.md)**, and `/my-agent` returns the agent's *exact* location plus real name and phone number. Handing that to a team would defeat the [Board](../../CONTEXT.md)'s core obfuscation — Mister X is shown only as a grid [Cell](../../CONTEXT.md), never a point (ADR 0008). The find-QR exists precisely so the team needs no query: the backend bakes the `alias` into the link, the team confirms it, and the backend alone validates the find (404 if the agent isn't in their game, 422 if it isn't findable). The client trusts the backend's QR and never reads the agent record.

Consequences:
- `/find` has **no loading phase** — it is confirm → POST → result, simpler than the setup-confirm flows.
- The confirm screen shows the `alias` only, never the agent [type](../../CONTEXT.md): the team must not learn whether they are about to find Mister X or a [Utility agent](../../CONTEXT.md) until the backend has counted it.

Hard to reverse in spirit, not in code: the same privacy stance as ADR 0008. Recorded so nobody "improves" the flow by fetching the agent to render richer detail.
