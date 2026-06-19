'use client';

import { MapContainer, TileLayer, CircleMarker, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { MapResource } from '@/app/types/api';

interface GameMapProps {
  map: MapResource;
}

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

export default function GameMap({ map }: GameMapProps) {
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
      <CircleMarker
        center={[map.cornerA.latitude, map.cornerA.longitude]}
        radius={8}
        pathOptions={{ color: '#dc2626', fillColor: '#dc2626', fillOpacity: 1 }}
      />
      <CircleMarker
        center={[map.cornerB.latitude, map.cornerB.longitude]}
        radius={8}
        pathOptions={{ color: '#16a34a', fillColor: '#16a34a', fillOpacity: 1 }}
      />
      <GridOverlay map={map} />
    </MapContainer>
  );
}
