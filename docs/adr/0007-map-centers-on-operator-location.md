# The new-game map centers on the operator's current location, via an imperative pan

When an [Operator](../../CONTEXT.md) opens the map to define a [Game](../../CONTEXT.md)'s area with no corners placed yet, `MapSelector` pans once to the device's geolocation at zoom 13. London `[51.505, -0.09]` is the static initial center and the silent fallback when geolocation is denied, unavailable, or slow. The pan is performed imperatively by a `useMap()`-based child (`LocationCenterer`), **not** by the `MapContainer` `center` prop.

## Context

`MapSelector` had geolocation code already: a `useEffect` that called `getCurrentPosition` and set a `center` state passed to `<MapContainer center={center}>`. It never worked. React-Leaflet reads `center` (and `zoom`) **only once, at mount** — later prop changes are ignored. So the post-geolocation `setCenter` was dead, and every game was set up over London regardless of where the operator stood. This is the reported UX bug.

The fix has to move the map *imperatively* after mount. There is precedent in the same file: `BoundsFitter` is a `useMap()` child that calls `map.fitBounds()` to frame an existing selection. `LocationCenterer` is its sibling — same pattern, calling `map.setView([lat, lng], 13)`.

`MapSelector` is shared by both the create form (no initial corners) and the edit form (corners pre-set, where `BoundsFitter` frames the existing grid). The two centering authorities must not fight.

### Considered options

- **Keep mutating the `center` prop** — the original approach. Doesn't work; documenting it here so it is not "restored" as a simpler-looking fix.
- **Imperative pan from a `useMap()` child** (chosen) — mirrors `BoundsFitter`, post-mount, no remount, no pan/zoom reset.
- **No-London loading placeholder** until geolocation resolves — avoids the brief "London → snap" flash but needs its own timeout fallback (geolocation can hang) and a loading state. Rejected as more surface for a cosmetic gain; the flash only ever shows on the rare denial/timeout path.
- **Explicit "📍 my location" button** instead of auto-pan — zero surprise, but an extra tap and not what "should be centered automatically" asked for. Rejected.

### Two guards keep the pan from being disruptive

1. **Only when both corners are null.** In the edit flow (and mid-selection) corners exist, so `LocationCenterer` stands down and `BoundsFitter` owns the view. Without this guard, opening a game for edit would yank the map to the operator's current location instead of the game's actual area.
2. **One-time, and skipped once the operator has acted.** `getCurrentPosition` is async — and on first use does not even resolve until the operator answers the browser permission prompt — so the resolution window is wide. `LocationCenterer` cancels its pending pan when the operator drags/zooms (leaflet `dragstart`/`zoomstart`) *and* in its effect cleanup. The cleanup matters because placing a corner fires neither event yet unmounts the component (guard #1): without cancelling there, a geolocation result arriving just after the first click would snatch the view away from the corner just placed.

## Decision

- Remove the dead `center`-state geolocation effect. `MapContainer` keeps a static `center={[51.505, -0.09]}` / `zoom={13}`.
- Add `LocationCenterer`, a `useMap()` child rendered only while `!cornerA && !cornerB`. On mount it requests geolocation once; on success, if the operator has not yet dragged/zoomed, it calls `map.setView([lat, lng], 13)`.
- On denial / error / timeout / no-corner-guard-false, it does nothing — London stands.

## Consequences

- **The create map opens where the operator is.** The reported bug is fixed.
- **The edit flow is untouched** — `BoundsFitter` remains the sole centering authority whenever corners exist.
- **London is now only ever seen on the geolocation-denied/unavailable path**, as a deliberate last resort rather than the default.
- **"Just set the `center` prop" is a trap.** This ADR exists mainly so a future reader does not delete `LocationCenterer` in favor of the prop that looks like it should work and silently doesn't.
