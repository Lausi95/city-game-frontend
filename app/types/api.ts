export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface Grid {
  rows: number;
  columns: number;
}

export interface MapDto {
  cornerA: GeoLocation;
  cornerB: GeoLocation;
  grid: Grid;
}

export interface CreateGameRequest {
  title: string;
  startTime: string;
  endTime: string;
  map: MapDto;
}

export interface PatchGameRequest {
  title?: string;
  startTime?: string;
  endTime?: string;
  map?: MapDto;
}

export interface GameResource {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  teams: number;
  agents: number;
  links: Record<string, string>;
}

export interface GameCollection {
  content: GameResource[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface MapResource {
  cornerA: GeoLocation;
  cornerB: GeoLocation;
  grid: Grid;
  links: Record<string, string>;
}

export interface CreateTeamRequest {
  name: string;
}

export interface UpdateTeamRequest {
  name?: string;
}

export interface TeamResource {
  id: string;
  name: string;
  memberCount: number;
  foundAgents: Array<{ id: string; name: string }>;
  links: Record<string, string>;
}

export interface TeamCollection {
  content: TeamResource[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  empty: boolean;
}

export interface CreateAgentRequest {
  type: 'MISTERX' | 'UTILITY';
  phoneNumber: string;
  firstName: string;
  lastName: string;
  alias: string;
  active: boolean;
}

export interface UpdateAgentRequest {
  type?: 'MISTERX' | 'UTILITY';
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
  alias?: string;
  active?: boolean;
}

export interface AgentLocationResource {
  timestamp: string;
  latitude: number;
  longitude: number;
}

export interface AgentResource {
  id: string;
  type: 'MISTERX' | 'UTILITY';
  phoneNumber: string;
  firstName: string;
  lastName: string;
  alias: string;
  active: boolean;
  location: AgentLocationResource | null;
  foundByTeams: Array<{ id: string; name: string }>;
  links: Record<string, string>;
}

export interface AgentCollection {
  content: AgentResource[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  empty: boolean;
}

// --- Board: the live playfield as a team sees it (GET /board) ---
// See CONTEXT.md (Board, Cell) and docs/adr/0008-board-omits-last-seen-freshness.md.

export interface GameWindow {
  startTime: string;
  endTime: string;
}

/** Zero-based grid cell; origin (0,0) is the south-west corner, row increasing north, column east. */
export interface Cell {
  row: number;
  column: number;
}

/** A utility agent shown at its exact last-known location. */
export interface BoardUtilityAgent {
  id: string;
  alias: string;
  geoLocation: GeoLocation;
  // lastSeenAt is returned by the backend but intentionally unused — see ADR 0008.
  lastSeenAt: string;
}

/** A Mister X agent obfuscated to the grid cell containing its last-known location. */
export interface BoardMisterxAgent {
  id: string;
  alias: string;
  cell: Cell;
  // lastSeenAt is returned by the backend but intentionally unused — see ADR 0008.
  lastSeenAt: string;
}

export interface BoardResource {
  game: GameWindow;
  map: MapDto;
  utilityAgents: BoardUtilityAgent[];
  misterxAgents: BoardMisterxAgent[];
}
