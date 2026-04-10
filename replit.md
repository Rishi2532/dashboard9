# Maharashtra Water Infrastructure - Jal Jeevan Mission IoT Dashboard

## Project Overview
An IoT Monitoring Dashboard for the Jal Jeevan Mission (JJM) in Maharashtra, India. It tracks and visualizes water supply infrastructure including LPCD (Liters Per Capita per Day), residual chlorine levels in ESRs, water pressure, flow meter data, and infrastructure/communication status. Also includes a help desk/ticketing system and an AI-powered chatbot assistant.

## Architecture
- **Full-stack monorepo** with Express backend and React/Vite frontend served together on port 5000
- **Backend**: Node.js + Express + TypeScript (`server/` directory)
- **Frontend**: React 18 + TypeScript + Vite (`client/` directory)
- **Shared types**: `shared/schema.ts` (Drizzle ORM schema + Zod validation)
- **Database**: PostgreSQL via Replit's built-in DB, accessed with Drizzle ORM + `@neondatabase/serverless`

## Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Radix UI/Shadcn, TanStack Query, Wouter, D3.js, Chart.js, Recharts, Leaflet
- **Backend**: Express, Drizzle ORM, Passport.js (auth), MQTT (IoT data), OpenAI/Anthropic (AI chatbot)
- **Build**: Vite (frontend), esbuild (backend), tsx (dev server)
- **Package manager**: npm

## Development
- **Dev command**: `npm run dev` — starts Express + Vite middleware on port 5000
- **Build command**: `npm run build` — builds Vite frontend + esbuild backend
- **DB push**: `npm run db:push` — push schema changes via drizzle-kit

## Key Files
- `server/index.ts` — Backend entry point (Express server, port 5000)
- `server/vite.ts` — Vite dev server middleware setup (`allowedHosts: true` for Replit proxy)
- `server/storage.ts` — Database abstraction layer (Drizzle ORM)
- `server/routes.ts` — API route registration
- `client/src/App.tsx` — Frontend routing (Wouter)
- `shared/schema.ts` — Database schema and Zod types
- `vite.config.ts` — Vite config (root: `client/`, alias `@` → `client/src/`)

## Deployment
- **Target**: autoscale
- **Build**: `npm run build`
- **Run**: `node dist/index.js`
- **Port**: 5000 (hosts both API and static frontend)

## Notes
- The server already has `allowedHosts: true` in Vite middleware config for Replit proxy compatibility
- Session secret falls back to random bytes if `SESSION_SECRET` env var is not set
- Optional integrations: GMAIL (email), MQTT broker, OpenAI/Anthropic (AI chatbot)
- Some large files (>500KB) generate Babel deoptimisation warnings — this is non-fatal
