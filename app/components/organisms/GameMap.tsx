'use client';

import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { formatAge } from '@/app/components/molecules/LastSeenIndicator';
import type { AgentResource, MapResource } from '@/app/types/api';

interface GameMapProps {
  map: MapResource;
  agents: AgentResource[];
  /** Shared, ticking wall-clock (ms). 0 means "not yet mounted". */
  now: number;
}

// Agent marker fill by type — matches the Badge colors in AgentsSection.
const AGENT_FILL: Record<AgentResource['type'], string> = {
  MISTERX: '#dc2626', // red
  UTILITY: '#2563eb', // blue
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

  return (
    <>
      <Polyline positions={border} pathOptions={{ color: '#2563eb', weight: 2 }} />
      {hLines.map((line, i) => (
        <Polyline
          key={`h${i}`}
          positions={line}
          pathOptions={{ color: '#2563eb', weight: 1, opacity: 0.5 }}
        />
      ))}
      {vLines.map((line, j) => (
        <Polyline
          key={`v${j}`}
          positions={line}
          pathOptions={{ color: '#2563eb', weight: 1, opacity: 0.5 }}
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
              {age && <span className="ml-1 text-zinc-500">· {age}</span>}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}

export default function GameMap({ map, agents, now }: GameMapProps) {
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
      className="h-80 w-full rounded-md border border-zinc-200"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      {/* Corner markers use neutral slate so red is reserved for Mister X agents. */}
      <CircleMarker
        center={[map.cornerA.latitude, map.cornerA.longitude]}
        radius={8}
        pathOptions={{ color: '#334155', fillColor: '#334155', fillOpacity: 1 }}
      />
      <CircleMarker
        center={[map.cornerB.latitude, map.cornerB.longitude]}
        radius={8}
        pathOptions={{ color: '#94a3b8', fillColor: '#94a3b8', fillOpacity: 1 }}
      />
      <GridOverlay map={map} />
      <AgentMarkers agents={agents} now={now} />
    </MapContainer>
  );
}
