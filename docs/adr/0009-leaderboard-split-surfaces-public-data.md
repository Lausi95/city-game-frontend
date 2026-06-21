# Leaderboard: two surfaces, one public data route

The [Leaderboard](../../CONTEXT.md) (`GET /leaderboard`, `X-GameId`) is reached from **two different routes** for its two audiences:

- **Teams** read it at the public, top-level `/leaderboard`. It takes no params; the `gameId` comes from the team's local-storage participant identity. Reached via a link in the team [Board](../../CONTEXT.md) view's header.
- **Operators** read it at `/admin/games/[gameId]/leaderboard` — auth-protected, with `gameId` from the route. Reached via a link on the game detail page.

Both render the **same leaderboard organism**, and both fetch the **same public proxy route** `GET /api/participant/leaderboard?gameId=…`, which forwards `X-GameId` to the backend (mirroring `/api/participant/board`). There is no `/api/admin/.../leaderboard`.

## Why this is worth recording

The original request was "a leaderboard page under `/leaderboard`" — one page for everyone. We deliberately split it, and the result has a surprising shape a future reader would question: **a protected admin page fetches a _public_ participant endpoint.**

The reasons:

1. **The two audiences resolve `gameId` differently.** A team carries its `gameId` in local storage (it has no Keycloak login — see [ADR 0004](0004-root-is-public-participant-surface.md)); an operator has no participant identity and works inside the `/admin/games/[gameId]` context. Forcing both through one route means either leaking a `?gameId=` query contract onto the team page or inventing an identity for the operator. Splitting the *page* lets each surface use its natural `gameId` source.
2. **The split honours the existing public/protected policy** encoded in `proxy.ts`: operator surfaces live under `/admin`, participant surfaces under `/`. A top-level `/leaderboard` that an operator also used would blur that line; `/admin/games/[id]/leaderboard` keeps the operator surface wholly under `/admin`.
3. **The data is not sensitive, so the route need not be duplicated.** Teams already see the full ranking; there is nothing on the leaderboard an operator may see that a team may not. Adding a second, auth-gated `/api/admin/.../leaderboard` that forwards the identical `X-GameId` would be pure duplication. The page-level auth on `/admin/games/[id]/leaderboard` is enough; the data fetch can safely reuse the public proxy.

## Display rules (settled here, detailed in the glossary)

- **Rank** is derived on the client from `foundCount`, not array position: ties share a rank with a gap after (`1, 2, 2, 4`); zero-find teams render unranked (a dash). The backend's order among tied and zero-find teams carries no meaning, so the UI does not invent one.
- `agents.length === foundCount` is a backend invariant — the headline count and the expanded list of found Mister X (`alias` + `foundAt`) never disagree.
- The team-facing page highlights the viewing team's own row (`teamId` from identity); the admin page does not.
- The list polls (~10s, matching the board) with no countdown header.

## Consequences

Reversible. If the operator leaderboard ever needs data the public route must not expose, promote it to `/api/admin/games/[gameId]/leaderboard` — a route addition, with the shared organism unchanged. The public page must also handle "no `gameId`" (no identity and no param) gracefully, reusing the "no role set" stub; the admin route always has a `gameId` from its path.
