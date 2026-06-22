'use client';

import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { formatAge } from '@/app/components/molecules/LastSeenIndicator';
import { mapColor, TILE_URL, TILE_ATTRIBUTION } from '@/app/lib/mapTheme';
import type { AgentResource, MapResource } from '@/app/types/api';

interface GameMapProps {
  map: MapResource;
  agents: AgentResource[];
  /** Shared, ticking wall-clock (ms). 0 means "not yet mounted". */
  now: number;
  /** Tailwind sizing override for the map container; defaults to `h-80`. */
  className?: string;
}

// Agent marker fill by type — matches the Badge colors in AgentsSection (ADR 0031).
const AGENT_FILL: Record<AgentResource['type'], string> = {
  MISTERX: mapColor('--color-misterx'), // brass
  UTILITY: mapColor('--color-utility'), // fog-blue
};

function GridOverlay({ map }: { map: MapResource }) {
  const { cornerA, cornerB, grid } = map;
  const minLat = Math.min(cornerA.latitude, cornerB.latitude);
  const maxLat = Math.max(cornerA.latitude, cornerB.latitude);
  const minLng = Math.min(cornerA.longitude, cornerB.longitude);
  const maxLng = Math.max(cornerA.longitude, cornerB.longitude);
  const rows = Math.min(grid.rows, 200);
  const cols = Math.min(grid.columns, 200);

  const border: [number, number][] = [
    [minLat, minLng],
    [minLat, maxLng],
    [maxLat, maxLng],
    [maxLat, minLng],
    [minLat, minLng],
  ];

  const hLines: [number, number][][] = [];
  for (let i = 1; i < rows; i++) {
    const lat = minLat + (i / rows) * (maxLat - minLat);
    hLines.push([[lat, minLng], [lat, maxLng]]);
  }

  const vLines: [number, number][][] = [];
  for (let j = 1; j < cols; j++) {
    const lng = minLng + (j / cols) * (maxLng - minLng);
    vLines.push([[minLat, lng], [maxLat, lng]]);
  }

  const outline = mapColor('--color-utility');
  const gridLine = mapColor('--color-grid');

  return (
    <>
      <Polyline positions={border} pathOptions={{ color: outline, weight: 2 }} />
      {hLines.map((line, i) => (
        <Polyline
          key={`h${i}`}
          positions={line}
          pathOptions={{ color: gridLine, weight: 1, opacity: 0.6 }}
        />
      ))}
      {vLines.map((line, j) => (
        <Polyline
          key={`v${j}`}
          positions={line}
          pathOptions={{ color: gridLine, weight: 1, opacity: 0.6 }}
        />
      ))}
    </>
  );
}

/**
 * Plots every active agent that has reported a location. The marker color
 * encodes the agent's type (matching the list Badge); hovering reveals the
 * alias plus how recently the position was reported. Agents without a location
 * cannot be placed and are omitted. See docs/adr/0006.
 */
function AgentMarkers({ agents, now }: { agents: AgentResource[]; now: number }) {
  const located = agents.filter((a) => a.active && a.location !== null);

  return (
    <>
      {located.map((agent) => {
        const { latitude, longitude, timestamp } = agent.location!;
        const age = now > 0 ? formatAge(now - Date.parse(timestamp)) : null;
        const fill = AGENT_FILL[agent.type];

        return (
          <CircleMarker
            key={agent.id}
            center={[latitude, longitude]}
            radius={7}
            pathOptions={{ color: '#ffffff', weight: 2, fillColor: fill, fillOpacity: 1 }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              <span className="font-medium">{agent.alias}</span>
              {age && <span className="ml-1 text-muted">· {age}</span>}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}

export default function GameMap({ map, agents, now, className = 'h-80' }: GameMapProps) {
  const minLat = Math.min(map.cornerA.latitude, map.cornerB.latitude);
  const maxLat = Math.max(map.cornerA.latitude, map.cornerB.latitude);
  const minLng = Math.min(map.cornerA.longitude, map.cornerB.longitude);
  const maxLng = Math.max(map.cornerA.longitude, map.cornerB.longitude);

  const bounds: [[number, number], [number, number]] = [
    [minLat, minLng],
    [maxLat, maxLng],
  ];

  return (
    <MapContainer
      bounds={bounds}
      boundsOptions={{ padding: [40, 40] }}
      className={`${className} w-full rounded-md border border-border`}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      {/* Corner markers use neutral fog tones so brass is reserved for Mister X agents. */}
      <CircleMarker
        center={[map.cornerA.latitude, map.cornerA.longitude]}
        radius={8}
        pathOptions={{ color: mapColor('--color-faint'), fillColor: mapColor('--color-faint'), fillOpacity: 1 }}
      />
      <CircleMarker
        center={[map.cornerB.latitude, map.cornerB.longitude]}
        radius={8}
        pathOptions={{ color: mapColor('--color-muted'), fillColor: mapColor('--color-muted'), fillOpacity: 1 }}
      />
      <GridOverlay map={map} />
      <AgentMarkers agents={agents} now={now} />
    </MapContainer>
  );
}
