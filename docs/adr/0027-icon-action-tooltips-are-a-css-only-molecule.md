# Icon-button hover labels are a CSS-only Tooltip molecule

The icon-only action buttons in the admin lists (Edit, Setup-QR on agents;
Record-Find, Edit, Setup-QR, Delete on teams) show a short German label
("Bearbeiten", "Setup-QR anzeigen", "Fund erfassen", "Löschen") on hover **and**
keyboard focus. The label is rendered by a reusable
[`Tooltip`](../../app/components/molecules/Tooltip.tsx) molecule that wraps the
button — not by the native HTML `title` attribute and not by a tooltip library.

The tooltip is **CSS-only**: a `group`/`group-hover`/`group-focus-within`
visibility toggle on an absolutely-positioned bubble, anchored **below** the
button against its **right edge** so it grows leftward. It appears **instantly**
(an opacity toggle, no delay or transition).

Right-anchoring (rather than centring) is deliberate: these buttons are all
right-edge row actions inside a scroll container that clips horizontally
(`overflow-y-auto` on the game-detail tab body forces `overflow-x` to `auto`),
so a centred bubble under the right-most button overflows the edge and is cut
off. Anchoring to the button's right edge keeps the whole label inside the row
for every button without any per-call positioning.

This was chosen over two alternatives:

- **Native `title`** is the cheapest (it already passes through the `Button`
  atom) but its ~1s appearance delay, OS styling we can't theme, absence on
  keyboard focus, and lack of touch support make it a poor fit for a primary
  affordance on icon-only controls.
- **A tooltip library** (Radix, Floating UI) gives collision-aware positioning
  and full a11y wiring, but this codebase has no such dependency and these labels
  are short, single-line, and low-stakes. Adding a library is not warranted.

Two accepted limitations follow from the CSS-only approach:

1. **No collision detection.** The bubble always renders below the button,
   right-anchored. This is safe because the labels are short and every consumer
   is a right-edge action with empty space to its left. A left-edge button with
   a long label could overflow the *left* of its container — if that ever ships,
   that is the trigger to revisit (an alignment/`side` prop, or a positioning
   library).
2. **The label is decorative.** The bubble is `aria-hidden`; screen readers
   continue to use each button's existing entity-specific `aria-label`
   (e.g. `Team Alpha bearbeiten`), which is left unchanged. So the visible label
   is the short verb while the assistive-tech label keeps the which-row context —
   two intentionally different strings.

The molecule is generic (`label` + `children`) and lives in
`app/components/molecules/` so any future icon button can reuse it. Pagination
controls were left out of scope: they carry their own text/arrows and need no
hover label.
