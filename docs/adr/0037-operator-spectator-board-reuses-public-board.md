# Operator spectator view reuses the public board and re-obfuscates

The `/admin` game map has a toggle (`Admin-Ansicht ⟷ Team-Ansicht`) letting the
operator switch between their privileged full-fidelity view (every agent at its
exact coordinate, by type, with last-seen freshness — including Mister X's true
point) and the **Board** as a hunting team sees it (Mister X obfuscated to a
cell, utility agents exact, no freshness). See CONTEXT.md → Spectator view.

We deliberately made Team-Ansicht **hide information the operator can already
see in Admin-Ansicht**, and sourced it from the existing **public** participant
board (`/api/participant/board` → `GET /board`) rather than a new privileged
operator endpoint:

- **Faithful spectator over operator omniscience.** The point of Team-Ansicht is
  to let the operator judge what the teams can actually *infer* — so it must
  reproduce the team experience exactly, cell obfuscation and all. An
  un-obfuscated "operator board" would defeat the feature; Admin-Ansicht already
  is the omniscient view.
- **Reuse the public board, no auth twin.** The board carries no secrets a team
  can't already see, so it needs no operator auth. Calling the public route from
  an authenticated admin surface is unusual but honest — the operator is
  spectating the same public board. An `/api/admin/.../board` twin would be pure
  duplication of an identical `/board` call (tenant headers are derived
  server-side in both routes regardless).
- **"Alle Teams" = unfiltered board.** The operator belongs to no team, so the
  default omits `X-TeamId` (no found Mister X hidden). Narrowing to one team
  sends that team's `X-TeamId`, hiding the Mister X it has found — exactly that
  team's board.

Consequence: a reader who sees operators get everything elsewhere will not be
surprised that this one view withholds it — the rationale is recorded here. If a
distinct operator-only *un-obfuscated* board is ever wanted, that is a different
feature and warrants its own (authenticated) endpoint.
