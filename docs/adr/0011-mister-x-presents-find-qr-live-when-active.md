# Mister X presents the find-QR live, only while active

The [Find QR](../../CONTEXT.md) is shown **in-app on the agent's own device** — a "Show find QR" action in the [Agent self-view](../../CONTEXT.md) opens it in a modal — rather than being operator-minted ahead of time like the setup QR of a [Setup link](../../CONTEXT.md). It is rendered **only for an active [Mister X](../../CONTEXT.md)**: the `type` gate because only Mister X is findable, and the `active` gate because an inactive Mister X is not in play, so a find against it must not be recordable.

A reader might expect the find-QR to live where the setup QR does — operator side, opened in a new tab. It deliberately does not: a [Find](../../CONTEXT.md) happens during play, in the moment a team reaches Mister X, so the QR is presented live by the hunted agent on the device already in their hand.

Consequences:
- The modal forces a white background and renders the PNG large with a quiet zone, regardless of light/dark theme — the code is scanned off this screen by a *second* phone, so contrast and size matter more than visual consistency with the other dialogs.
- The client gate is exactly `type === 'MISTERX' && active`; a [Utility agent](../../CONTEXT.md) or an inactive Mister X sees no QR affordance at all. The backend remains the validator of record (ADR 0010) — this gate is a usability guard, not the security boundary.
