'use client';

import { Fragment } from 'react';
import L from 'leaflet';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Rectangle,
  CircleMarker,
  Marker,
  Popup,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { mapColor, TILE_URL, TILE_ATTRIBUTION } from '@/app/lib/mapTheme';
import type {
  MapDto,
  BoardMisterxAgent,
  BoardUtilityAgent,
  Cell,
  GeoLocation,
} from '@/app/types/api';

interface BoardMapProps {
  map: MapDto;
  misterxAgents: BoardMisterxAgent[];
  utilityAgents: BoardUtilityAgent[];
  /**
   * The team member's own live position, for a local "you are here" marker.
   * Never sent to the server — see docs/adr/0034-team-location-client-only.md.
   * null when there's no fix yet (or geolocation is denied): no marker is drawn.
   */
  selfLocation?: GeoLocation | null;
}

const MISTERX_BRASS = mapColor('--color-misterx');
const UTILITY_FOG = mapColor('--color-utility');
const SELF_GREEN = mapColor('--color-success');

/** Geographic extent of the map area, normalised so cornerA/B order doesn't matter. */
function extentOf(map: MapDto) {
  const minLat = Math.min(map.cornerA.latitude, map.cornerB.latitude);
  const maxLat = Math.max(map.cornerA.latitude, map.cornerB.latitude);
  const minLng = Math.min(map.cornerA.longitude, map.cornerB.longitude);
  const maxLng = Math.max(map.cornerA.longitude, map.cornerB.longitude);
  return { minLat, maxLat, minLng, maxLng };
}

function GridOverlay({ map }: { map: MapDto }) {
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

  return (
    <>
      <Polyline positions={border} pathOptions={{ color: mapColor('--color-utility'), weight: 2 }} />
      {hLines.map((line, i) => (
        <Polyline key={`h${i}`} positions={line} pathOptions={{ color: mapColor('--color-grid'), weight: 1, opacity: 0.6 }} />
      ))}
      {vLines.map((line, j) => (
        <Polyline key={`v${j}`} positions={line} pathOptions={{ color: mapColor('--color-grid'), weight: 1, opacity: 0.6 }} />
      ))}
    </>
  );
}

/** South-west / north-east corners of a grid cell. Origin (0,0) is the map's SW corner. */
function cellBounds(map: MapDto, cell: Cell): [[number, number], [number, number]] {
  const { minLat, maxLat, minLng, maxLng } = extentOf(map);
  const cellH = (maxLat - minLat) / map.grid.rows;
  const cellW = (maxLng - minLng) / map.grid.columns;
  const south = minLat + cell.row * cellH;
  const north = minLat + (cell.row + 1) * cellH;
  const west = minLng + cell.column * cellW;
  const east = minLng + (cell.column + 1) * cellW;
  return [
    [south, west],
    [north, east],
  ];
}

export default function BoardMap({ map, misterxAgents, utilityAgents, selfLocation }: BoardMapProps) {
  const { minLat, maxLat, minLng, maxLng } = extentOf(map);
  const bounds: [[number, number], [number, number]] = [
    [minLat, minLng],
    [maxLat, maxLng],
  ];

  // Group Mister X by cell so a shared cell is drawn once with a count.
  const cells = new Map<string, { cell: Cell; aliases: string[] }>();
  for (const m of misterxAgents) {
    if (!m.cell) continue; // never-located → can't be placed
    const key = `${m.cell.row}:${m.cell.column}`;
    const group = cells.get(key);
    if (group) group.aliases.push(m.alias);
    else cells.set(key, { cell: m.cell, aliases: [m.alias] });
  }

  const located = utilityAgents.filter((u) => u.geoLocation);

  return (
    <MapContainer
      bounds={bounds}
      maxBounds={bounds}
      maxBoundsViscosity={1.0}
      className="h-full w-full"
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <GridOverlay map={map} />

      {Array.from(cells.entries()).map(([key, { cell, aliases }]) => {
        const cb = cellBounds(map, cell);
        const center: [number, number] = [
          (cb[0][0] + cb[1][0]) / 2,
          (cb[0][1] + cb[1][1]) / 2,
        ];
        return (
          <Fragment key={key}>
            <Rectangle
              bounds={cb}
              pathOptions={{ color: MISTERX_BRASS, weight: 1, fillColor: MISTERX_BRASS, fillOpacity: 0.4 }}
            >
              <Popup>
                <span className="font-medium">
                  {aliases.length > 1 ? `${aliases.length} Mister X` : 'Mister X'}
                </span>
                <br />
                {aliases.join(', ')}
              </Popup>
            </Rectangle>
            {aliases.length >= 2 && (
              <Marker
                position={center}
                interactive={false}
                icon={L.divIcon({
                  className: '',
                  iconSize: [40, 40],
                  iconAnchor: [20, 20],
                  html: `<div style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;font:700 22px/1 sans-serif;color:${MISTERX_BRASS};opacity:0.7;pointer-events:none;">${aliases.length}</div>`,
                })}
              />
            )}
          </Fragment>
        );
      })}

      {located.map((u) => (
        <CircleMarker
          key={u.id}
          center={[u.geoLocation.latitude, u.geoLocation.longitude]}
          radius={7}
          pathOptions={{ color: '#ffffff', weight: 2, fillColor: UTILITY_FOG, fillOpacity: 1 }}
        >
          <Popup>
            <span className="font-medium">{u.alias}</span>
          </Popup>
        </CircleMarker>
      ))}

      {selfLocation && (
        <CircleMarker
          center={[selfLocation.latitude, selfLocation.longitude]}
          radius={7}
          interactive={false}
          pathOptions={{ color: '#ffffff', weight: 2, fillColor: SELF_GREEN, fillOpacity: 1 }}
        />
      )}
    </MapContainer>
  );
}
