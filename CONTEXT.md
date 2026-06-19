# City Game Admin

The admin surface for a Scotland-Yard-style city game: an operator sets up a game (a map, a time window), enrolls the teams that hunt, and registers the agents they hunt for.

## Language

**Game**:
A single playthrough bounded by a `startTime` and an `endTime`, played over a gridded map area. There is no explicit lifecycle status — the game's phase is derived from the clock.

**Phase**:
A game's position relative to its time window: _before kickoff_ (`now < startTime`), _active_ (`startTime ≤ now ≤ endTime`), or _ended_ (`now > endTime`). Derived, never stored.

**Team**:
A group of players that hunts agents. Has a name and a member count, and accumulates the agents it has found.

**Agent**:
A person registered into a game to be hunted. Identified by an in-game `alias`, with a real `firstName`/`lastName` and `phoneNumber` for contact. Every agent has a `type` and an `active` flag.
_Avoid_: Player (players are on teams), Target (only Mister X is the target).

**Mister X** (`type: MISTERX`):
The agent the teams are ultimately hunting — the hunted identity, not just an attribute. An agent's `type` is fixed once the game reaches the _active_ phase: it may only be changed before kickoff.
_Avoid_: Target, Fugitive.

**Utility agent** (`type: UTILITY`):
A non-Mister-X agent — a detective/decoy in play alongside Mister X.

**Active** (`active` flag):
An administrative flag on an agent indicating whether it is in play. A plain toggle with no destructive side effects; flipping it is freely reversible.

**Found**:
The relation between a team and an agent it has located (`agent.foundByTeams` / `team.foundAgents`). Established during play; the admin surface does not edit it directly.
