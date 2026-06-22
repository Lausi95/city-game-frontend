'use client';

import { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  useMapEvents,
  useMap,
  CircleMarker,
  Polyline,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { mapColor, TILE_URL, TILE_ATTRIBUTION } from '@/app/lib/mapTheme';
import type { LatLng } from 'leaflet';

export interface Corner {
  lat: number;
  lng: number;
}

interface MapSelectorProps {
  cornerA: Corner | null;
  cornerB: Corner | null;
  rows: number;
  columns: number;
  onChange: (cornerA: Corner | null, cornerB: Corner | null) => void;
}

function ClickHandler({
  step,
  onCornerA,
  onCornerB,
}: {
  step: 0 | 1 | 2;
  onCornerA: (p: LatLng) => void;
  onCornerB: (p: LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      if (step === 1) onCornerB(e.latlng);
      else onCornerA(e.latlng);
    },
  });
  return null;
}

function BoundsFitter({ cornerA, cornerB }: { cornerA: Corner | null; cornerB: Corner | null }) {
  const map = useMap();
  useEffect(() => {
    if (cornerA && cornerB) {
      map.fitBounds(
        [
          [Math.min(cornerA.lat, cornerB.lat), Math.min(cornerA.lng, cornerB.lng)],
          [Math.max(cornerA.lat, cornerB.lat), Math.max(cornerA.lng, cornerB.lng)],
        ],
        { padding: [40, 40] },
      );
    }
  }, [cornerA, cornerB, map]);
  return null;
}

// Pans the map once to the operator's current location. Rendered only when no
// corners are set, so it never fights BoundsFitter (edit flow / mid-selection).
// MapContainer's `center` prop is read only at mount, so this must move the map
// imperatively. See ADR 0007.
function LocationCenterer() {
  const map = useMap();
  useEffect(() => {
    // Cancelled once the operator interacts (drag/zoom) OR a corner is placed —
    // the latter unmounts this component, so cleanup must also cancel a late
    // geolocation callback that would otherwise yank the view. See ADR 0007.
    let cancelled = false;
    const cancel = () => {
      cancelled = true;
    };
    map.on('dragstart', cancel);
    map.on('zoomstart', cancel);

    navigator.geolocation?.getCurrentPosition((pos) => {
      if (!cancelled) {
        map.setView([pos.coords.latitude, pos.coords.longitude], 13);
      }
    });

    return () => {
      cancelled = true;
      map.off('dragstart', cancel);
      map.off('zoomstart', cancel);
    };
  }, [map]);
  return null;
}

function GridOverlay({
  cornerA,
  cornerB,
  rows: rawRows,
  columns: rawCols,
}: {
  cornerA: Corner;
  cornerB: Corner;
  rows: number;
  columns: number;
}) {
  const rows = Math.min(rawRows, 200);
  const columns = Math.min(rawCols, 200);
  const minLat = Math.min(cornerA.lat, cornerB.lat);
  const maxLat = Math.max(cornerA.lat, cornerB.lat);
  const minLng = Math.min(cornerA.lng, cornerB.lng);
  const maxLng = Math.max(cornerA.lng, cornerB.lng);

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
  for (let j = 1; j < columns; j++) {
    const lng = minLng + (j / columns) * (maxLng - minLng);
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

export default function MapSelector({
  cornerA,
  cornerB,
  rows,
  columns,
  onChange,
}: MapSelectorProps) {
  const step: 0 | 1 | 2 = !cornerA ? 0 : !cornerB ? 1 : 2;

  const handleCornerA = (p: LatLng) => onChange({ lat: p.lat, lng: p.lng }, null);
  const handleCornerB = (p: LatLng) => onChange(cornerA!, { lat: p.lat, lng: p.lng });

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted">
        {step === 0 && 'Tippe auf die Karte, um Ecke A zu setzen (rot dargestellt)'}
        {step === 1 && 'Tippe auf die Karte, um Ecke B zu setzen (grün dargestellt)'}
        {step === 2 && 'Tippe auf die Karte, um zurückzusetzen und neue Ecken zu wählen'}
      </p>
      <MapContainer
        center={[51.505, -0.09]}
        zoom={13}
        className="h-96 w-full rounded-md border border-border"
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <ClickHandler step={step} onCornerA={handleCornerA} onCornerB={handleCornerB} />
        <BoundsFitter cornerA={cornerA} cornerB={cornerB} />
        {!cornerA && !cornerB && <LocationCenterer />}
        {cornerA && (
          <CircleMarker
            center={[cornerA.lat, cornerA.lng]}
            radius={8}
            pathOptions={{ color: mapColor('--color-danger'), fillColor: mapColor('--color-danger'), fillOpacity: 1 }}
          />
        )}
        {cornerB && (
          <CircleMarker
            center={[cornerB.lat, cornerB.lng]}
            radius={8}
            pathOptions={{ color: mapColor('--color-success'), fillColor: mapColor('--color-success'), fillOpacity: 1 }}
          />
        )}
        {cornerA && cornerB && (
          <GridOverlay cornerA={cornerA} cornerB={cornerB} rows={rows} columns={columns} />
        )}
      </MapContainer>
      <div className="flex gap-6 text-xs text-muted">
        {cornerA && (
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-danger" />A:{' '}
            {cornerA.lat.toFixed(6)}, {cornerA.lng.toFixed(6)}
          </span>
        )}
        {cornerB && (
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-success" />B:{' '}
            {cornerB.lat.toFixed(6)}, {cornerB.lng.toFixed(6)}
          </span>
        )}
      </div>
    </div>
  );
}
