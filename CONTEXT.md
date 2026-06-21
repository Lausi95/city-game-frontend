# City Game Admin

A Scotland-Yard-style city game. Two surfaces share one app: the **operator** surface under `/admin` (set up a game — a map, a time window — enroll the teams that hunt, register the agents they hunt for) and the **participant** surface at `/` (the agents and team members who play from the field).

## Language

**Game**:
A single playthrough bounded by a `startTime` and an `endTime`, played over a gridded map area. There is no explicit lifecycle status — the game's phase is derived from the clock.

**Phase**:
A game's position relative to its time window: _before kickoff_ (`now < startTime`), _active_ (`startTime ≤ now ≤ endTime`), or _ended_ (`now > endTime`). Derived, never stored.

**Team**:
A group of players that hunts agents. Has a name and a member count, and accumulates the agents it has found.

**Agent**:
A person registered into a game to be hunted. Identified by an in-game `alias`, with a real `firstName`/`lastName` and `phoneNumber` for contact. Every agent has a `type` and an `active` flag.
_Avoid_: Player (the individual on a team is a [Member](#participants--roles)), Target (only Mister X is the target).

**Mister X** (`type: MISTERX`):
The agent the teams are ultimately hunting — the hunted identity, not just an attribute. An agent's `type` is fixed once the game reaches the _active_ phase: it may only be changed before kickoff.
_Avoid_: Target, Fugitive.

**Utility agent** (`type: UTILITY`):
A non-Mister-X agent — a detective/decoy in play alongside Mister X.

**Active** (`active` flag):
An administrative flag on an agent indicating whether it is in play. A plain toggle with no destructive side effects; flipping it is freely reversible.

**Found**:
The relation between a team and an agent it has located (`agent.foundByTeams` / `team.foundAgents`). Established during play by a [Find](#language); the admin surface does not edit it directly.

**Find** (the act):
A [Member](#participants--roles) recording that their [Team](#language) has located an [Agent](#language) — the participant write-side of [Found](#language) (`POST /find`, `X-GameId`+`X-TeamId`+`X-MemberId`+`X-AgentId`, optional body reporting the member's own position). Reached only by scanning a backend-minted find-QR that opens `/find?agentId=&alias=`; there is no in-app navigation to it. The member confirms the find against the `alias` carried in the link — the surface never reads the agent record, to avoid leaking [Mister X](#language)'s location or identity (see ADR 0010). The backend alone validates it: it rejects a find against an agent not in the team's game, against a [game](#language) that is not _active_, against an agent that is not findable, or one the team has already found.
_Avoid_: Catch, capture, tag (the backend term is _find_); Sighting (a sighting is seeing an agent on the [Board](#language), not recording the catch).

**Find QR**:
The QR code an [Agent](#language) presents on its own device for a hunting [Team](#language) to scan — it opens `/find?agentId=&alias=` so the team can record a [Find](#language) (`GET /find-qr`, `X-GameId`+`X-AgentId`, returns a PNG). Minted live by the backend and shown in the [Agent self-view](#language), but only for an _active_ [Mister X](#language) — the sole findable identity (see ADR 0011). Distinct from the setup QR of a [Setup link](#participants--roles), which is operator-minted for onboarding; the find QR is presented in the moment of contact during play.
_Avoid_: Catch code, find code (it is a _QR_).

**Last seen**:
How recently an agent's device reported its position — the timestamp of its most recent location fix (`agent.location.timestamp`), read against _now_. An agent with no `location` has never reported and has no last-seen time. Surfaced in the admin as a colored dot plus a relative age ("3m ago"). Freshness is bucketed by age:
- **fresh** (green) — ≤ 1 minute old
- **recent** (yellow) — ≤ 5 minutes old
- **stale** (red) — older than 5 minutes
- **no location** (gray) — never reported (`location` is `null`)

Derived on the client against the browser clock and never stored; like [Phase](#language), it is a function of the current time, not a field.
_Avoid_: "online/offline" (the device may simply have lost GPS, not gone offline), "last contact".

**Location reporting**:
The write side of [Last seen](#language): an [Agent](#participants--roles)'s own device pushing its position to the backend (`POST /location`) while the agent view is open. The device watches the browser geolocation and also re-sends its latest fix on a fixed heartbeat, so a stationary agent stays _fresh_. It is **foreground-only** — the web page cannot report a position once it is closed or backgrounded. Reporting is not gated by [Phase](#language): the agent surface has no game time window, so it reports whenever the view is open.
_Avoid_: Tracking, ping, check-in.

**Agent self-view**:
The [Agent](#participants--roles)'s own view of itself on the participant surface (`/`): its identity (alias, name, [type](#language), [active](#language) flag, contact), the teams that have [found](#language) it, and the [Last seen](#language) freshness of its _own_ location — read back from the server via `GET /my-agent`, so it doubles as a self-diagnostic ("is my position actually being reported?"). An agent sees only its own record, never the roster of other agents. An _active_ [Mister X](#language) can also present its [Find QR](#language) from here (see ADR 0011).
_Avoid_: Agent dashboard, agent profile.

**Board**:
The live playfield as one [Team](#language) sees it (`GET /board`, `X-GameId` + optional `X-TeamId`): the gridded [map](#language) overlaid with the agents currently visible to that team. [Utility agents](#language) appear at their exact location; [Mister X](#language) agents are **obfuscated to a [Cell](#language)** — the team learns only which cell a Mister X is in, never the precise point. Supplying `X-TeamId` hides the Mister X that team has already [found](#language), so a caught Mister X simply disappears from that team's board.
_Avoid_: Playfield (the board is the *team's view* of the playfield, not the playfield itself), Map (the map is the board's backdrop; the board is map + agents).

**Leaderboard**:
The ranking of a [game](#language)'s [teams](#language) by how many [Mister X](#language) agents they have [found](#language) (`GET /leaderboard`, `X-GameId`). The backend returns the teams already in rank order, best first; teams with no counted finds cluster at the end with no meaningful order among them. Each entry carries the team's `foundCount` and the list of found Mister X (`alias` + `foundAt`, earliest first) — so the per-team detail is part of the ranking payload, not a separate lookup. Only **active** [Mister X](#language) finds count toward the ranking; [Utility agent](#language) finds never do, and the entry's `agents` list is filtered to the same counted set as `foundCount` (`agents.length === foundCount` always holds — the headline number and the expanded list never disagree). **Rank** is derived on the client from `foundCount`, not array position: equal counts share a rank with a gap after a tie (`1, 2, 2, 4`); teams with zero counted finds are shown unranked (a dash), since the backend gives their order no meaning. Read by both [teams](#language) (public `/leaderboard`) and [Operators](#participants--roles) (`/admin/games/{id}/leaderboard`).
_Avoid_: Score (there are no points — only a count of found Mister X), Standings.

**Cell** (grid cell):
One square of the [map](#language)'s grid, addressed by zero-based `row`/`column` with origin `(0,0)` at the south-west corner (row increases northward, column eastward). The unit of obfuscation for [Mister X](#language) on the [Board](#language): a team sees the cell, not the coordinate.

## Participants & roles

**Participant**:
A person playing a running game from the field — either an [Agent](#language) or a [Member](#participants--roles), as opposed to an [Operator](#participants--roles). The participant surface is the root page (`/`); operators use `/admin`. The backend has no participant login: a participant is identified only by the IDs they carry (`X-GameId` plus `X-AgentId` or `X-TeamId`/`X-MemberId`). An agent's IDs are carried whole by its setup QR; a team [Member](#participants--roles)'s `X-MemberId` is not — the team [Setup link](#participants--roles) carries only `gameId`+`teamId`, and the `memberId` is minted in-app at [Registration](#participants--roles).
_Avoid_: User (every signed-in operator is also a "user"), Player.

**Operator**:
The person who sets up and administers games via `/admin`. Authenticated through Keycloak; any authenticated operator is authorized — there is no further admin role.
_Avoid_: Admin (the *area* is `/admin`; the *person* is an operator).

**Member** (Team Member):
An individual player belonging to a [Team](#language) — the unit the backend identifies with `X-MemberId`. `team.memberCount` counts them and `GET /games/{gameId}/teams/{teamId}/members` lists them; a person becomes a Member through [Registration](#participants--roles). A Team hunts; a Member is one of the people doing the hunting.
_Avoid_: Player.

**Setup link**:
The URL encoded in a setup QR that turns a device into a [Participant](#participants--roles). For a team the link is `/setup-team?gameId=&teamId=` — it identifies the [Team](#language) to join but carries no `memberId`; that is minted at [Registration](#participants--roles). For an agent the link is `/setup-agent?gameId=&agentId=` — it carries the agent's whole identity, so there is nothing to mint: setup is a pure [Confirmation](#participants--roles), not a [Registration](#participants--roles). (The link may also carry a `type` param; it is ignored — the [type](#language) is read from `GET /my-agent` instead, and is being removed backend-side.)
_Avoid_: Invite link, join URL.

**Registration** (team-member registration):
The act of a device joining a [Team](#language) as a [Member](#participants--roles): opening the [Setup link](#participants--roles), confirming the team (fetched via `GET /my-team`), and tapping "Join team", which calls `POST /team-register` to mint the `memberId`. The resulting identity (carrying the [Role](#participants--roles) `team`) is stored client-side and the device is redirected to the participant surface (`/`). Distinct from an [Operator](#participants--roles) enrolling a team in `/admin`.
_Avoid_: Sign-up, enrolment (enrolment is the operator-side act of creating the Team/Agent).

**Confirmation** (agent setup):
The act of a device claiming an existing [Agent](#language) as its identity: opening the agent [Setup link](#participants--roles), fetching the agent via `GET /my-agent` to show who it is (alias / name / [type](#language)), and tapping "This is me". Because the [Setup link](#participants--roles) already carries the `agentId`, nothing is minted — the device simply stores the identity (carrying the [Role](#participants--roles) `agent`) client-side and is redirected to the participant surface (`/`). The agent's [Active](#language) flag is not gated here; any "in play" check belongs to the live agent view, re-read against current state. The agent counterpart to team-member [Registration](#participants--roles), minus the minting step.
_Avoid_: Registration (no `memberId`-style mint happens), Login.

**Role** (participant role):
Which kind of participant the current device belongs to — `agent` or `team` (a [Member](#participants--roles)). It is the field the root page reads to choose between the agent view and the team-member view. Set client-side during QR-scan setup, never from a server session; the value `team` denotes a Team Member, not the Team itself.
