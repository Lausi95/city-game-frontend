# Scotland Yard visual identity

The concrete skin built on the token layer of
[ADR 0030](./0030-dark-only-theme-on-a-semantic-token-layer.md). The brief was a
dim, low-contrast, "visually pleasing" dark theme evoking the board game
*Scotland Yard* — which fits the product unusually well, since the game already
hunts a [Mister X](../../CONTEXT.md) across a gridded city map. The identity has
four parts; each was a real choice with rejected alternatives.

## Palette — "gaslight amber on fog-blue"

Cool, desaturated blue-grey "London fog" surfaces stepped in small, low-contrast
increments, with a single warm brass/amber accent (the gaslight). One warm accent
on cool ground reads as elegant and keeps contrast low. The reference values the
`@theme` tokens carry:

| Role | Token | Value |
|------|-------|-------|
| Page background | `--color-bg` | `#0f1217` |
| Surface | `--color-surface` | `#14171d` |
| Raised surface | `--color-surface-raised` | `#1b1f27` |
| Overlay (modals/popovers) | `--color-surface-overlay` | `#242a34` |
| Hairline border | `--color-border` | `rgba(150,160,180,0.12)` |
| Text | `--color-text` | `#c5cad3` |
| Muted text | `--color-text-muted` | `#8b929e` |
| Faint text | `--color-text-faint` | `#5c636f` |
| Accent (gaslight brass) | `--color-accent` | `#c9a45c` |
| Text on accent | `--color-accent-contrast` | `#15171b` |

Text is intentionally soft off-white, never pure `#fff`, to hold the
low-contrast feel.

## Status colours — transport hues for categories, an ordered ramp for freshness

Scotland Yard colour-codes its transport, and the app's badges are *categorical*
(an [Agent](../../CONTEXT.md)'s type, in/out-of-field), so categorical badges
adopt the transport palette: **taxi-yellow** `#d4b15e`, **bus-green** `#6f8f6a`,
**tube-red** `#b5675f`. [Mister X](../../CONTEXT.md) gets a distinct **brass**
treatment (`--color-accent` on a dark chip) — he is the hunted identity, not a
category, so he reads as special.

[Last seen](../../CONTEXT.md) freshness is deliberately **not** mapped to
transport modes. Freshness is an *ordered* scale (fresh → recent → stale = good →
bad; see [ADR 0003](./0003-client-polled-location-freshness.md)) whereas transport
modes are *unordered* categories — a stale agent glowing "Underground red" would
lose the at-a-glance "this is bad" intuition. So freshness keeps an ordered
good→bad ramp, re-skinned to the palette: fresh `#6f8f6a` → recent `#c9a45c` →
stale `#b5675f` → no-location faint. These map onto `--color-success` /
`--color-warning` / `--color-danger`, which double as the semantic status tokens
(e.g. `danger` is also the destructive-action colour).

## Typography — a dossier type system

Full vintage type, chosen as a detective **case-file** feel rather than the prior
neutral Geist: **Special Elite** (a typewriter face) for the wordmark, headings,
and uppercase labels; **Lora** (a warm, readable serif) for body and table text;
**JetBrains Mono** for IDs, coordinates, and numeric data. All three are Google
Fonts, wired through the existing `next/font/google` setup. The known risk — a
serif body in a data-dense admin tool — is mitigated by picking Lora specifically
for small-size legibility; the alternatives (Playfair/Source Serif editorial,
Oswald/EB Garamond transit-poster) were set aside as less "detective dossier".

## Basemap — kept on light OpenStreetMap tiles

We initially switched all four Leaflet maps to a dim **CARTO `dark_all`** basemap
to match the fog theme (no API key, drop-in on the OSM tile scheme — chosen over
Stadia *Alidade Smooth Dark*, which needs a per-domain-allowlisted key awkward for
our many-tenant-domains-one-container setup, see
[ADR 0017](./0017-tenant-from-derived-host-not-relayed-origin.md) /
[ADR 0018](./0018-containerized-deployment-behind-traefik.md)). **In practice the
dark basemap was unreadable** — near-black tiles, and brightening them with a CSS
filter only washed them out without making roads/labels legible. So the map
**keeps the original bright OSM tiles**
(`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`); no tile filter is applied.
This is the one place the dark theme intentionally does not reach — map legibility
wins over palette consistency.

The map vector overlays *do* move off hardcoded hex onto the shared tokens
(Mister X from `#dc2626` to brass, utility agents from `#2563eb` to a desaturated
fog-blue, grid to a faint line), with white marker strokes for contrast against
the light tiles. The Leaflet chrome (zoom controls, attribution, popups,
tooltips) is themed dark to match the surrounding UI.
