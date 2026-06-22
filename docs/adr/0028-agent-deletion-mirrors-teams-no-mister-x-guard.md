# Agent deletion mirrors team deletion, with no Mister X guard

Agents can be deleted from the admin agent list the same way teams can be
deleted from the team list: an icon-only `Trash2` action on each row opens a
[`ConfirmDialog`](../../app/components/molecules/ConfirmDialog.tsx), which on
confirm issues `DELETE /api/admin/games/{gameId}/agents/{agentId}` and then
`router.refresh()`. The frontend route is a thin wrapper that forwards to the
backend's `DELETE /games/{gameId}/agents/{agentId}` via `authedFetch` — the
exact shape of the team delete route.

Two deliberate choices distinguish this from what one might expect:

- **No Mister X protection.** Every agent is deletable, including the Mister X
  whom the entire hunt is built around. The delete button is not hidden or
  disabled for `MISTERX` agents, and the confirm dialog carries no
  type-specific warning. Deleting the Mister X mid-game would break the hunt,
  but the operator running the game is trusted (any authenticated operator has
  full control — see ADR 0004), and the backend remains the authority on what
  deletions it permits. A UI-side guard would be a half-measure: it can't
  enforce game integrity (the backend can), and it adds a special case to an
  otherwise uniform list action. If the backend later rejects deleting an
  active Mister X, that rejection surfaces through the dialog's existing error
  display — no frontend change needed.

- **No phase gating.** Unlike agent *type*, which is immutable after kickoff
  (ADR 0002) and gated in the UI via `canEditType`, deletion is offered at every
  phase. Teams have no phase gate on deletion, and agents follow suit. The
  backend decides whether a given deletion is allowed at the current phase.

The confirm dialog names both the alias and the real name —
`„{alias}" ({firstName} {lastName}) löschen? Das kann nicht rückgängig gemacht
werden.` — so the operator is sure which person's agent they are removing.
This is richer than the team dialog's enumeration of child counts only because
an agent has no children to enumerate; the alias alone can be ambiguous when
several agents share similar in-game names.
