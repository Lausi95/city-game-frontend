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
