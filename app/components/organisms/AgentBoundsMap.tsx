'use client';

import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import {
  MapContainer,
  TileLayer,
  Rectangle,
  CircleMarker,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { mapColor, TILE_URL, TILE_ATTRIBUTION } from '@/app/lib/mapTheme';
import type { GeoLocation, MapDto } from '@/app/types/api';

interface AgentBoundsMapProps {
  map: MapDto;
  /** The agent's own live position, or null while still locating. */
  position: GeoLocation | null;
  /** Whether `position` is outside the playfield — colours the marker and widens the fit. */
  outOfBounds: boolean;
}

const IN_BOUNDS_FOG = mapColor('--color-utility');
const OUT_OF_BOUNDS_RED = mapColor('--color-danger');
const PLAYFIELD_OUTLINE = mapColor('--color-utility');

/** Geographic extent of the playfield, normalised so cornerA/B order doesn't matter. */
function extentOf(map: MapDto) {
  const minLat = Math.min(map.cornerA.latitude, map.cornerB.latitude);
  const maxLat = Math.max(map.cornerA.latitude, map.cornerB.latitude);
  const minLng = Math.min(map.cornerA.longitude, map.cornerB.longitude);
  const maxLng = Math.max(map.cornerA.longitude, map.cornerB.longitude);
  return { minLat, maxLat, minLng, maxLng };
}

/**
 * Keeps the view framed: just the playfield when the agent is inside (or unlocated),
 * but the playfield PLUS the marker when outside, so the way back is visible.
 * Re-fits whenever the position or bounds-state changes.
 */
function FitView({
  rect,
  position,
  outOfBounds,
}: {
  rect: L.LatLngBoundsExpression;
  position: GeoLocation | null;
  outOfBounds: boolean;
}) {
  const leafletMap = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds(rect as L.LatLngBoundsLiteral);
    if (position && outOfBounds) {
      bounds.extend([position.latitude, position.longitude]);
    }
    leafletMap.fitBounds(bounds, { padding: [24, 24] });
  }, [leafletMap, rect, position, outOfBounds]);
  return null;
}

export default function AgentBoundsMap({ map, position, outOfBounds }: AgentBoundsMapProps) {
  const { minLat, maxLat, minLng, maxLng } = extentOf(map);
  // Stable reference across the parent's 1s clock re-renders, so FitView only
  // re-fits when the position or bounds-state actually changes — not every tick
  // (which would fight the agent panning the mini-map).
  const rect = useMemo<[[number, number], [number, number]]>(
    () => [
      [minLat, minLng],
      [maxLat, maxLng],
    ],
    [minLat, minLng, maxLat, maxLng],
  );

  return (
    <MapContainer bounds={rect} className="h-full w-full">
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      {/* The playfield outline — no grid, no other agents. */}
      <Rectangle
        bounds={rect}
        pathOptions={{ color: PLAYFIELD_OUTLINE, weight: 2, fill: false }}
      />
      {position && (
        <CircleMarker
          center={[position.latitude, position.longitude]}
          radius={8}
          pathOptions={{
            color: '#ffffff',
            weight: 2,
            fillColor: outOfBounds ? OUT_OF_BOUNDS_RED : IN_BOUNDS_FOG,
            fillOpacity: 1,
          }}
        />
      )}
      <FitView rect={rect} position={position} outOfBounds={outOfBounds} />
    </MapContainer>
  );
}
