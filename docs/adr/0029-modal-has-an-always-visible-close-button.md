# The shared Modal carries an always-visible close (X) button

Every dialog in the app renders through the shared
[`Modal`](../../app/components/molecules/Modal.tsx) molecule. Until now `Modal`
offered no *visible* way to dismiss itself — it closed only on **Escape** or a
**backdrop click**. Both are invisible affordances. On the QR dialogs
([`SetupQrDialog`](../../app/components/organisms/SetupQrDialog.tsx),
[`FindQrDialog`](../../app/components/organisms/FindQrDialog.tsx)) this was
especially confusing: the dialog is a large QR sheet with no obvious exit, and
an operator scanning the code off the screen has no cursor on the backdrop to
discover the click-to-close behaviour.

`Modal` now renders a close button — a top-right **X** icon — in its header.

## Decision

The button lives in `Modal` itself, **not** on the QR dialogs. The discoverability
gap is a property of the shared primitive, so the fix belongs there: a single
always-present X gives every dialog (QR, confirm, edit, record-find) one
consistent, obvious exit. The redundancy on dialogs that already have a
`Cancel`/`Abbrechen` button (`ConfirmDialog`, the edit dialogs) is harmless and
preferred over an inconsistent "some modals have an X, some don't".

Concrete shape:

- The button wires to `Modal`'s existing `onClose` prop — the **same** callback
  as Escape and the backdrop. Consumers that block dismissal during an in-flight
  request pass a guarded `onClose` (`() => !loading && onClose()`); routing the X
  through `onClose` reuses that guard, so the X cannot bypass it. Escape and
  backdrop-close are kept unchanged; the X is purely additive.
- The header is a flex row: the title sits left, the close button is pushed right.
  Because the close button is wrapped in `Tooltip` (which renders its own
  `relative` positioning wrapper and takes no `className`), the `ml-auto` goes on a
  plain `<div>` around the Tooltip — that wrapper is the flex child, so a lone X
  still right-aligns even when `title` is omitted (the prop is optional, though
  today every consumer passes one).
- It is a [`Button`](../../app/components/atoms/Button.tsx) `variant="ghost"
  size="sm"` holding the lucide `X` glyph (ADR 0016), sized `h-4 w-4` to match the
  `QrCode` icon already shown in the QR dialog titles.

## Accessibility

The button carries `aria-label="Schließen"` (German, matching the in-place
translated UI — ADR 0023) and is wrapped in the
[`Tooltip`](../../app/components/molecules/Tooltip.tsx) molecule with
`label="Schließen"`, exactly as the admin row-action icon buttons do (ADR 0027).
Per that ADR the visible tooltip bubble is decorative and `aria-hidden`; the
button's own `aria-label` is what assistive tech announces. The tooltip anchors
below, right-edge — safe here because the modal body has padding and does not
clip overflow.

## Accepted limitation

During an in-flight request the X looks clickable but no-ops (its guarded
`onClose` returns early), identical to the pre-existing behaviour of Escape and
the backdrop. Visibly disabling the X while loading would require `Modal` to know
about each consumer's loading state, which it deliberately does not. This is left
as-is; it is not a regression introduced by the close button.
