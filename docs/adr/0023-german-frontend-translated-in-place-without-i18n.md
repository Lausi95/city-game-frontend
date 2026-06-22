# German frontend, translated in place without an i18n framework

The frontend ships a single language: German. Every user-facing string on both
surfaces — the operator pages under `/admin` and the participant surface at `/`
— is written in German. Before this change the UI was entirely English (~305
hardcoded strings across ~30 files, `<html lang="en">`, no i18n tooling).

We translate **in place**: the English string literals are replaced with German
literals where they render, exactly as the English ones lived before. We do
**not** introduce an i18n framework (`next-intl`, `react-i18next`, message
catalogs, a locale provider, a switcher). The app serves one locale and there is
no current requirement for a second. Standing up an extraction layer for a
single language is real, permanent overhead — a provider in the tree, catalog
discipline, and a translation-key indirection on every copy edit — with no payoff
while only German exists. Keeping the German text inline preserves the property
the codebase already had: the words you read in the source are the words on the
screen.

The reversibility cost is the reason this is recorded rather than assumed. Each
tenant reaches the app through its own domain (one tenant ↔ one domain), so a
future tenant wanting English or another language is *conceivable*. We
deliberately accept that if that day comes, the strings will have to be extracted
into a catalog then — re-touching the same files a second time — in exchange for
not paying the framework cost now for a need that may never arrive. The
inventory of every translated string is the diff of this change, so a later
extraction has a clean starting point.

`<html lang>` becomes **`de`**, and all accessibility copy (aria-labels, alt
text) is translated alongside the visible copy so assistive tech matches the UI
language.

## The German ubiquitous language

The domain glossary in [CONTEXT.md](../../CONTEXT.md) is unchanged: it remains
the English-named model of the domain, and this translation does not alter a
single concept in it. What follows is the **UI rendering** of those concepts —
the canonical German term each domain term is shown as. It lives here, not in
CONTEXT.md, because CONTEXT.md is a domain glossary, not a UI string table.
Consistency across all strings is mandatory: a concept gets exactly one German
term.

| Concept (CONTEXT.md) | German UI term | Notes |
|---|---|---|
| Mister X | **Mister X** | Proper name — never translated |
| Agent | **Agent** | Native German loanword (der Agent, pl. Agenten) |
| Utility agent | **Hilfsagent** | |
| Team | **Team** | Native loanword (pl. Teams) |
| Member | **Mitglied** | pl. Mitglieder |
| Operator | **Operator** | Matches the admin/tooling register |
| Find (act) / Found | **Fund** / **gefunden** | "einen Fund melden" = record a find |
| Board | **Spielbrett** | "Spielfeld" is reserved for Playfield |
| Playfield | **Spielfeld** | the geographic rectangle |
| Out of bounds | **außerhalb des Spielfelds** | badge short form: **Außerhalb** (see below) |
| Within playfield | **innerhalb des Spielfelds** | badge short form: **Im Spielfeld** |
| Leaderboard | **Rangliste** | |
| Last seen | **Zuletzt gesehen** | |
| Find QR / Setup QR | **Fund-QR** / **Setup-QR** | German-style hyphenation, "QR" kept |
| Game | **Spiel** | |
| Cell (grid) | **Zelle** | |

**"City Game" is a proper name** — the official name of the game — and is kept
verbatim wherever it appears (the `<Header>` brand "City Game Admin", page
metadata). Only the surrounding chrome is translated: the metadata description
becomes "Admin-Dashboard für City Game". It is not rebranded to "Stadtspiel".

## Register, formatting, and rendering rules

**One register: "du".** All direct address uses the informal "du", on both
surfaces — participants and operators alike. It fits a playful city game and
modern German product convention, and a single register avoids a within-product
voice split. "Sie" is not used.

**Timestamps are pinned to `de-DE`.** Absolute date/time formatting passes the
explicit `de-DE` locale (`toLocaleString('de-DE', …)`) rather than relying on the
device locale, so a German UI never renders `6/22/2026, 3:00 PM` to a user on an
English-locale phone. The hand-built relative-age strings (`relativeAge`,
`formatAge`) are translated to German short forms ("gerade eben", "vor 5 Min.",
"vor 2 Std. 30 Min.", "vor 42 Sek."). The purely numeric countdown
(`formatSpan`, "MM:SS"/"HH:MM:SS") is language-neutral and unchanged.

**Short forms in constrained UI.** German runs ~30% longer than English, which
clips width-constrained elements. Badges, chips, and tight buttons take a concise
German form (the bounds badges read **"Außerhalb"** / **"Im Spielfeld"**), while
prose and banners carry the full phrasing ("Du bist außerhalb des Spielfelds —
geh zurück ins Spielgebiet."). The concept is the same; only the rendering length
differs by context.

**Real pluralization, no "(s)".** German plurals are distinct words
(1 Mitglied / 5 Mitglieder; 1 Agent / 2 Agenten; 1 Team / 2 Teams), rendered with
an inline singular/plural branch where a count drives the noun. The English
"{count} member(s)" parenthetical (the delete-team confirmation) has no clean
German "(s)" equivalent and is rephrased into natural German with proper
singular/plural branching rather than faking a "(er)" suffix.

## Consequences

- Backend-originated error text is **out of scope**. Failure handling renders
  `err.detail` from the API verbatim when present, falling back to a frontend
  message only when it is absent. We translate the frontend fallbacks; we leave
  the `err.detail` passthrough untouched. A user can therefore still see an
  English (or otherwise non-German) error sentence when the backend supplies one
  — a known gap to be closed backend-side, not here. Discarding the backend's
  specific reason to guarantee cosmetic German was rejected as a real UX
  regression.
- User-generated content (game titles, team names, agent aliases, member names)
  is shown as entered and never translated.
- CONTEXT.md is intentionally **not** edited by this change: the domain model is
  unchanged; only its presentation language is.
- A future second locale must extract these inline strings into a catalog at that
  point — accepted as the cost of not running an i18n framework for one language.
