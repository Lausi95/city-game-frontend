# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

No test runner is configured.

## Environment

Copy `.env.local` with these required variables:
```
AUTH_KEYCLOAK_ID=
AUTH_KEYCLOAK_SECRET=
AUTH_KEYCLOAK_ISSUER=    # e.g. https://auth.example.com/realms/city-game
AUTH_URL=                # e.g. http://localhost:3000
AUTH_SECRET=
```

## Architecture

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript 5 · Tailwind CSS 4 · NextAuth 5 beta · Leaflet / react-leaflet

### Authentication

All routes are protected by middleware in `proxy.ts`, which wraps NextAuth's `auth()` function. Unauthenticated users are redirected to `/auth/signin`, which immediately triggers `signIn("keycloak")` via a `useEffect`.

The Keycloak `id_token` is stored in the JWT session so that `GET /api/auth/federated-logout` can perform a proper Keycloak-side logout (clears `authjs.*` cookies and redirects to the Keycloak logout endpoint).

The NextAuth config lives in `auth.ts` at the project root.

### App Router layout

- `app/layout.tsx` — root layout; wraps everything in `<Providers>` (SessionProvider) and renders `<Header>`
- `app/providers.tsx` — client-side `SessionProvider` wrapper
- `app/page.tsx` — home page; requires an authenticated session, renders `<CreateGameDialog>`
- `app/api/auth/[...nextauth]/route.ts` — NextAuth catch-all handler
- `app/api/auth/federated-logout/route.ts` — custom Keycloak federated logout

### Map components

Map components use `react-leaflet` and must be loaded client-side only. Use `next/dynamic` with `{ ssr: false }` when importing them — Leaflet touches `window` at import time and will break SSR.

`MapSelector` uses the Geolocation API to center on the user's position and lets the user click two points to define a rectangular grid area. Grid lines are drawn with SVG overlays inside the map bounds.

### Admin routes

All administration operations — game management, team creation, and agent administration — live under `/admin`. This path requires Keycloak authorization beyond basic authentication: the user's Keycloak token must carry the appropriate admin role.

Enforce this at the route level by reading the session in the page/layout (`auth()` from `auth.ts`) and checking for the required role on `session.idToken` (decoded) or by forwarding the token to the backend and letting it reject unauthorized requests. Do **not** rely solely on the global `proxy.ts` middleware for admin access control, since that only checks whether the user is authenticated, not whether they hold the admin role.

Place admin page components under `app/admin/` and any admin-only API routes under `app/api/admin/`.

### Path alias

`@/*` resolves to the project root (set in `tsconfig.json`).

## Component organization

Components follow **Atomic Design**. Place new components under `app/components/` organized by level:

| Level | Description | Examples |
|-------|-------------|---------|
| `atoms/` | Indivisible UI primitives | Button, Input, Badge, Icon |
| `molecules/` | Small groups of atoms with a single purpose | FormField, SearchBar, MapMarker |
| `organisms/` | Self-contained UI sections composed of molecules/atoms | Header, CreateGameDialog, MapSelector |
| `templates/` | Page-level layout shells (no real data) | DashboardTemplate |

Page components (`app/**/page.tsx`) consume organisms and templates — they should not contain raw atoms directly.

## Backend API

The backend exposes an OpenAPI 3 spec at **`http://localhost:8080/v3/api-docs`** (requires the backend running locally). Use this as the authoritative reference for available endpoints, request/response schemas, and error codes when building or modifying frontend API calls.
