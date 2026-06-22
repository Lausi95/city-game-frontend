# Agent and team list pagination is client-side slicing, not server-side paging

The agent and team lists on the game-detail page paginate by **slicing an
in-memory array client-side** (10/page), not by fetching one page at a time from
the backend. The data still arrives in a single `size=50` fetch on page load; the
`<Pagination>` control only changes which 10-item window is rendered. This means
the lists are **capped at 50 items** — a 51st agent or team is not shown anywhere.
That is an accepted limitation, not an oversight: a single game is not expected to
exceed ~50 of either.

This was a deliberate choice over true server-side per-page fetching, for two
reasons. (1) The agents array is already polled in full every 20s so the live map
can render every agent's marker (see
[ADR 0006](0006-live-agent-markers-on-the-admin-map.md) /
[ADR 0003](0003-client-polled-location-freshness.md)); paging it server-side would
starve the map of off-page markers. Slicing the set the map already holds keeps
one source of truth. (2) Both lists live inside the mounted-tab layout from
[ADR 0025](0025-game-detail-split-into-client-state-tabs.md), so the current page
is held in client `useState`, not URL params — a `<Link>`-driven navigation would
reset the tab selection and Leaflet pan/zoom. Teams use the same mechanism as
agents purely for consistency; they have no map, but with a sub-50 count there is
no reason to fetch per-page.

The control always renders (buttons disabled on a single page) so the lists read
as paginated even below one page of items, but is hidden entirely when a list is
empty (the "Noch keine …" empty state shows instead). Create/delete continue to go
through `router.refresh()`; the page index is clamped afterward (create lands on
the last page; deleting the last item on a page steps back one).
