'use client';

/**
 * Leaflet overlay colours + basemap, sourced from the design tokens
 * (globals.css). Leaflet's pathOptions need plain colour strings, so we read
 * the CSS custom properties at call time — keeping globals.css the single
 * source of truth for the palette. See ADR 0031.
 */

// NOTE: these fallbacks mirror the tokens in globals.css and DO fire when
// getComputedStyle runs before the stylesheet applies. If you change a colour
// token in globals.css, update its value here too or the map overlays will drift.
const FALLBACK: Record<string, string> = {
  '--color-misterx': '#c9a45c',
  '--color-utility': '#6b86b0',
  '--color-grid': '#3a424f',
  '--color-success': '#6f8f6a',
  '--color-danger': '#b5675f',
  '--color-foreground': '#c5cad3',
  '--color-muted': '#8b929e',
  '--color-faint': '#5c636f',
};

export function mapColor(token: string): string {
  if (typeof window === 'undefined') return FALLBACK[token] ?? '#6b86b0';
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
  return value || FALLBACK[token] || '#6b86b0';
}

// Standard light OpenStreetMap tiles — the dim CARTO basemap proved too dark to
// read, so the map keeps the bright OSM style. See ADR 0031.
export const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION = '&copy; OpenStreetMap contributors';
