# The root page is the public participant surface; identity is client-stored and header-claimed

The root page (`/`) stops being an operator landing page and becomes the **participant** surface for a running game. It renders one of two views — agent or team-member — chosen from a `role` field held in browser local storage. Operators move entirely to `/admin`. `/` is public (no Keycloak); `/admin` requires authentication.

## Context

The backend exposes a participant API with **no authentication**: `POST /location` (agent), `POST /team-register` and `POST /find` (team member). Identity is claimed entirely through headers — `X-GameId` + `X-AgentId` for an agent, `X-GameId` + `X-TeamId` (+ `X-MemberId`) for a member — which a participant obtains by scanning a setup QR code (`GET .../agents/{id}/setup-qr`, `GET .../teams/{id}/setup-qr`). There is no participant login and no server session for them.

This forces three coupled decisions:

- **`/` cannot sit behind Keycloak.** Participants never log in, so the route must be public. `proxy.ts` is currently a no-op ("auth disabled for local development"), but its matcher and CLAUDE.md describe an intent where *every* route is protected — which would lock participants out the moment auth is re-enabled.
- **Identity lives client-side.** Because the only identity is the IDs from the QR scan, they are stored in the browser, written "at a different point" (the setup/scan step, out of scope here) and only *read* by the root page.
- **The view is chosen on the client.** Local storage is browser-only, but `/` was an async server component, so the branch must happen after mount.

Alternatives considered:
- *Keep `/` operator-facing, add a separate participant route* — cleaner auth story, but the product decision is that `/` itself is the participant home; operators already have `/admin`.
- *Default unset/invalid role to a view* — rejected; it silently mislabels a participant whose role isn't set yet. We render an explicit "no role set" state instead.

## Decision

1. **Surface split.** `/` (and future `/api/participant/*` routes) are public; `/admin` + `/api/admin/*` require authentication. Encoded in `proxy.ts` now so the policy is correct whenever auth is re-enabled, even though the body stays a no-op for local dev.

2. **Admin authorization = authentication.** Any Keycloak-authenticated operator is authorized for `/admin`. There is **no** separate admin role check. This reverses the earlier CLAUDE.md guidance ("admin must hold a role beyond authentication"), which is updated to match.

3. **Identity contract.** One atomic local-storage object (the `role` field is the discriminator):
   - agent → `{ role: 'agent', gameId, agentId }`
   - team member → `{ role: 'team', gameId, teamId, memberId }`

   `memberId` is required. **(Amended — see note below.)** It is obtained when the team member opens `/setup-team?gameId=&teamId=` (the team setup QR carries only `gameId`+`teamId`) and taps "Join team", which performs `POST /team-register`; the returned `X-TeamMemberId` is written into this blob by `writeIdentity` before redirecting to `/`. Stored as a single blob so a reader never sees a role without its IDs. The reader validates the *whole* shape — unparseable JSON, an unrecognized `role`, or a structurally-incomplete blob (e.g. `role:'agent'` with no `agentId`) are all treated as "no role set", never as a half-usable identity.

4. **Rendering.** `page.tsx` stays a server component and delegates to a client organism (`ParticipantRoot`). Before mount it renders a neutral loading placeholder (identical on server and first client paint → no hydration mismatch); a `useEffect` then reads local storage and swaps to the agent view, the team-member view, or — if `role` is missing or unrecognized — an explicit "no role set" state (visually distinct from the loading placeholder, so participants with a valid role never flash "no role set").

Agreed implementation scope (built separately, in a later session): the branching shell, the identity contract, the public/protected policy, and **stub** views (role heading + the resolved identity + a "coming soon" placeholder). The header-claimed actions (location/find/register) and the QR-scan setup that writes the identity were out of scope *for that session*.

> **Amendment (team-member setup).** The team-member half of "the setup that writes the identity" has since been built as `/setup-team` (a public server page → `SetupTeam` client organism). It reads `gameId`+`teamId` from the QR URL, fetches the team via the public proxy `GET /api/participant/my-team` to confirm the team name, and on "Join team" calls the public proxy `POST /api/participant/team-register` to mint the `memberId`, then `writeIdentity` + redirect to `/`. This supersedes point 3's original phrasing ("the QR-scan setup is assumed to have already performed `POST /team-register`"): registration happens in-app at `/setup-team`, not before the scan. The agent setup page and the in-play actions remain out of scope.

> **Amendment (agent setup).** The agent half is now built as `/setup-agent` (a public server page → `SetupAgent` client organism), mirroring `/setup-team` but **simpler in one decisive way: there is nothing to register.** Unlike a team member (whose `memberId` is minted by `POST /team-register`), an agent already exists — the operator created it in `/admin`, and the setup QR carries its whole identity (`gameId`+`agentId`). The backend has no agent-registration endpoint; `GET /my-agent` requires both `X-GameId` and `X-AgentId`. So setup-agent is **read → confirm → write**, with no POST:
>
> - **URL contract.** `/setup-agent?gameId=&agentId=`. The QR may also carry a `type` param (`MISTERX`/`UTILITY`); the page **ignores it** — the type is read authoritatively from the fetched `AgentResource`, and a URL `type` would be untrusted, self-asserted duplication. (The backend is removing `type` from the link.) The QR URL is minted by the backend (`GET /games/{gameId}/agents/{agentId}/setup-qr`); it already targets `/setup-agent` with these param names — a dependency outside this frontend's control.
> - **"Confirm" is a human check, not a mutation.** The page fetches the agent via the new public proxy `GET /api/participant/my-agent` (forwarding `gameId`/`agentId` → `X-GameId`/`X-AgentId`, mirroring `my-team`), shows who it is, and on "This is me" simply `writeIdentity({ role: 'agent', gameId, agentId })` + redirect to `/`. No proxy POST exists.
> - **No `already` state.** `/setup-team` has one only to avoid minting a *duplicate* member on a re-scan; agent setup mints nothing, so re-writing the same blob is idempotent. The phases are just `loading → confirm → error` (the same single generic error screen on a bad link / unknown agent / failed fetch).
> - **`active` is not gated at setup.** An inactive agent can still be set up. Setup stores only `{ role, gameId, agentId }` — never `active`, which can flip after setup anyway — so a setup-time gate would be false enforcement. Any "in play" check belongs to the (still-stubbed) live agent view, re-read against current state.
>
> No change was needed to `identity.ts` (`AgentIdentity` already existed) or to `ParticipantRoot` (it already renders the agent branch). The feature is one page + one organism + one proxy. The in-play actions (location reporting) remain out of scope.

## Consequences

- A public `/` means the protection story now rests on the matcher, not on "everything is behind auth." When auth is re-enabled, verify `/admin` + `/api/admin/*` stay gated and `/` stays open.
- Dropping the admin role check is intentional, not an omission — recorded here so a future reader doesn't "restore" a gate that was deliberately removed.
- Identity is unauthenticated and self-asserted: whoever holds the IDs is that participant. Acceptable for a casual city game; if it ever isn't, the fix is a backend identity model, not a frontend one.
- This is the codebase's first client-rendered, client-state-driven page — a deliberate exception to the server-fetch-once convention, justified because the input (local storage) is unavailable to the server.
