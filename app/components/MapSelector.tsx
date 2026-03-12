"use client";

import "leaflet/dist/leaflet.css";

import { useEffect } from "react";
import { MapContainer, TileLayer, Rectangle, Polyline, useMap, useMapEvents } from "react-leaflet";
import type { LatLngExpression, LatLngBoundsExpression } from "leaflet";

function MapClickHandler({
  point1,
  setPoint1,
  point2,
  setPoint2,
  rows,
  columns,
}: {
  point1: [number, number] | null;
  setPoint1: (p: [number, number] | null) => void;
  point2: [number, number] | null;
  setPoint2: (p: [number, number] | null) => void;
  rows: number;
  columns: number;
}) {
  useMapEvents({
    click(e) {
      if (point1 && point2) {
        setPoint1([e.latlng.lat, e.latlng.lng]);
        setPoint2(null);
      } else if (!point1) {
        setPoint1([e.latlng.lat, e.latlng.lng]);
      } else {
        setPoint2([e.latlng.lat, e.latlng.lng]);
      }
    },
  });

  let bounds: LatLngBoundsExpression | null = null;
  if (point1 && point2) {
    bounds = [point1, point2];
  }

  const gridLines: LatLngExpression[][] = [];
  if (point1 && point2 && rows > 0 && columns > 0) {
    const latMin = Math.min(point1[0], point2[0]);
    const latMax = Math.max(point1[0], point2[0]);
    const lngMin = Math.min(point1[1], point2[1]);
    const lngMax = Math.max(point1[1], point2[1]);

    const latStep = (latMax - latMin) / rows;
    const lngStep = (lngMax - lngMin) / columns;

    for (let i = 1; i < rows; i++) {
      const lat = latMin + i * latStep;
      gridLines.push([
        [lat, lngMin],
        [lat, lngMax],
      ]);
    }
    for (let i = 1; i < columns; i++) {
      const lng = lngMin + i * lngStep;
      gridLines.push([
        [latMin, lng],
        [latMax, lng],
      ]);
    }
  }

  return (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {bounds && (
        <Rectangle
          bounds={bounds}
          pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.2, weight: 2 }}
        />
      )}
      {gridLines.map((line, i) => (
        <Polyline
          key={i}
          positions={line}
          pathOptions={{ color: "#52525b", weight: 1, opacity: 0.8, dashArray: "4 4" }}
        />
      ))}
    </>
  );
}

function InvalidateSizeOnOpen({ dialogOpen }: { dialogOpen: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (dialogOpen) {
      const timeout = setTimeout(() => {
        map.invalidateSize();
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [dialogOpen, map]);

  return null;
}

export default function MapSelector({
  center,
  dialogOpen,
  point1,
  setPoint1,
  point2,
  setPoint2,
  rows,
  columns,
}: {
  center: [number, number];
  dialogOpen: boolean;
  point1: [number, number] | null;
  setPoint1: (p: [number, number] | null) => void;
  point2: [number, number] | null;
  setPoint2: (p: [number, number] | null) => void;
  rows: number;
  columns: number;
}) {
  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: "100%", width: "100%", zIndex: 0 }}
    >
      <InvalidateSizeOnOpen dialogOpen={dialogOpen} />
      <MapClickHandler
        point1={point1}
        setPoint1={setPoint1}
        point2={point2}
        setPoint2={setPoint2}
        rows={rows}
        columns={columns}
      />
    </MapContainer>
  );
}
