# lucide-react for glyph icons, used directly; data-marks stay as-is

Glyph icons (edit, delete, record-a-find, QR) come from **lucide-react**, imported and rendered as components directly where they are used — no `Icon` atom wrapper. Color-coded **data-marks** (the `LastSeenIndicator` freshness dot, the Leaflet map markers) are *not* glyphs and are left as colored shapes; the one exception is the freshness dot, which is re-expressed as a lucide `Circle` purely so the codebase has a single icon source, with the color still carrying the meaning.

## Context

The app had three hand-rolled inline-SVG functions (`PencilIcon`, `TargetIcon`, `TrashIcon`), with `PencilIcon` copy-pasted across `TeamsSection` and `AgentsSection`, plus a couple of emoji used as glyphs (`🏆` as the leaderboard link in `TeamView`, `🎭` prefixing each found agent in `Leaderboard`). There was no icon library and no `Icon` atom. We wanted a consistent, maintained icon set and an explicit QR marker on every surface that generates or displays a QR code (setup-QR links for teams/agents, the "Show find QR" button, and the `FindQrDialog` itself — see [ADR 0011](0011-mister-x-presents-find-qr-live-when-active.md)).

The wrinkle is that "icon" in this codebase means two different things, and only one of them is a glyph:

- **Glyphs** — pencil, trash, target, QR. These are decorative/affordance marks that should come from a library.
- **Data-marks** — the `LastSeenIndicator` dot (green/yellow/red/grey = freshness, see [ADR 0003](0003-client-polled-location-freshness.md)) and the Leaflet `CircleMarker`s (fill color = agent type / corner, see [ADR 0006](0006-live-agent-markers-on-the-admin-map.md)). Here the **color is the information**; the shape is incidental.

### Considered options

- **`Icon` atom wrapper** — re-export lucide through `app/components/atoms/Icon.tsx` to standardize size/stroke. Rejected: lucide icons are already self-contained atom-level components, so the wrapper is pure indirection. CLAUDE.md only forbids raw atoms in *page* components; icons live inside organisms/molecules, so direct use is compliant. Sizing/color stay consistent via Tailwind classes (`h-3.5 w-3.5`, `currentColor`).
- **Convert the Leaflet markers to lucide `MapPin` glyphs** (rendered via `renderToStaticMarkup` into an `L.divIcon`). Rejected: a substantial map rewrite (anchor/size re-tuning, tooltip/popup re-test) that trades geographic data-viz for aesthetics and risks map regressions. The markers stay `CircleMarker`s.
- **Leave `LastSeenIndicator` as a `<span>` dot** vs. re-express it as lucide `Circle`. Chose `Circle` with `fill-current` so there is exactly one icon vocabulary in the DOM, but this is cosmetic: the meaning still lives in the color class, now `text-*` instead of `bg-*`.

## Decision

- Add `lucide-react` as a dependency. Import icons as components at point of use; **no `Icon` atom**.
- Glyph mapping: edit → `Pencil`, record-a-find → `Target` (concentric bullseye, matches the old glyph and "find" semantics), delete → `Trash2`, QR → `QrCode`, leaderboard link → `Trophy` (was `🏆`), found-agent → `VenetianMask` (was `🎭`; the mask matches the emoji and the Mister X alias theme). Keep the existing `h-3.5 w-3.5` sizing so buttons don't shift.
- Put `QrCode` on **all four** QR surfaces: the team and agent setup-QR links, the "Show find QR" button, and the `FindQrDialog` header. To carry the icon into the dialog title, `Modal`'s `title` prop is widened from `string` to `ReactNode` (backward-compatible).
- `LastSeenIndicator` uses lucide `Circle` with `fill-current`; the freshness color moves from `bg-*` to `text-*` (incl. dark-mode `pending`). The dot stays solid because both stroke and fill resolve to `currentColor`.
- **Leaflet on-map markers are untouched** — they remain `CircleMarker`/`divIcon` data-viz.

## Consequences

- One icon source for glyphs; the duplicated `PencilIcon` disappears (both files import `Pencil`).
- The glyph/data-mark distinction is now explicit: a future reader should *not* "finish the job" by pushing lucide into the Leaflet canvas — that was considered and declined here.
- `Modal` accepting `ReactNode` titles is a small widening that other dialogs can use for titled-with-icon headers later.
