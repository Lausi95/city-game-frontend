'use client';

import { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
  CircleMarker,
  Polyline,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { mapColor, TILE_URL, TILE_ATTRIBUTION } from '@/app/lib/mapTheme';
import type { LatLng } from 'leaflet';
import type { AgentResource, MapResource } from '@/app/types/api';

export interface Point {
  latitude: number;
  longitude: number;
}

interface SetAgentLocationMapProps {
  map: MapResource;
  /** The currently chosen point, or null until the operator clicks. */
  point: Point | null;
  /** Colors the marker by agent type, matching the markers on the live game map. */
  agentType: AgentResource['type'];
  onPick: (point: Point) => void;
}

// Marker fill by type — mirrors GameMap's AGENT_FILL so the picked point matches
// how the agent already reads on the live map.
const AGENT_FILL: Record<AgentResource['type'], string> = {
  MISTERX: '--color-misterx', // brass
  UTILITY: '--color-utility', // fog-blue
};

/** Geographic extent of the playfield, order-independent in the corners. */
function extentOf(map: MapResource) {
  const minLat = Math.min(map.cornerA.latitude, map.cornerB.latitude);
  const maxLat = Math.max(map.cornerA.latitude, map.cornerB.latitude);
  const minLng = Math.min(map.cornerA.longitude, map.cornerB.longitude);
  const maxLng = Math.max(map.cornerA.longitude, map.cornerB.longitude);
  return { minLat, maxLat, minLng, maxLng };
}

function ClickHandler({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng);
    },
  });
  return null;
}

// Frames the view once on mount: on the chosen point if there is one (the
// agent's current position, pre-seeded), otherwise on the whole playfield.
// We intentionally do NOT re-fit as the operator clicks — that would yank the
// view out from under them while they nudge the marker.
function FitOnMount({
  rect,
  initial,
}: {
  rect: [[number, number], [number, number]];
  initial: Point | null;
}) {
  const leafletMap = useMap();
  useEffect(() => {
    if (initial) {
      leafletMap.setView([initial.latitude, initial.longitude], 15);
    } else {
      leafletMap.fitBounds(rect, { padding: [32, 32] });
    }
    // Mount-only — the operator owns the view after the first frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafletMap]);
  return null;
}

// Playfield outline + grid, lifted from GameMap/MapSelector. Context only, so
// the operator can see cells and edges; a click outside is still accepted.
function GridOverlay({ map }: { map: MapResource }) {
  const { minLat, maxLat, minLng, maxLng } = extentOf(map);
  const rows = Math.min(map.grid.rows, 200);
  const cols = Math.min(map.grid.columns, 200);

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

/** Single-point picker: click anywhere to place/move one marker. No other agents shown. */
export default function SetAgentLocationMap({
  map,
  point,
  agentType,
  onPick,
}: SetAgentLocationMapProps) {
  const { minLat, maxLat, minLng, maxLng } = extentOf(map);
  const rect: [[number, number], [number, number]] = [
    [minLat, minLng],
    [maxLat, maxLng],
  ];

  return (
    <MapContainer bounds={rect} className="h-96 w-full rounded-md border border-border">
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <ClickHandler onPick={(p) => onPick({ latitude: p.lat, longitude: p.lng })} />
      <FitOnMount rect={rect} initial={point} />
      <GridOverlay map={map} />
      {point && (
        <CircleMarker
          center={[point.latitude, point.longitude]}
          radius={8}
          pathOptions={{
            color: '#ffffff',
            weight: 2,
            fillColor: mapColor(AGENT_FILL[agentType]),
            fillOpacity: 1,
          }}
        />
      )}
    </MapContainer>
  );
}
