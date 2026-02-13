# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

n8n Execution Dashboard - an observability dashboard for monitoring n8n workflow executions. React frontend + Express backend integrated with Supabase for data storage.

## Commands

```bash
npm run dev      # Start dev server (port 5000) - loads .env automatically
npm run build    # Build for production (outputs to dist/)
npm run start    # Run production build
npm run check    # TypeScript type checking
npm run db:push  # Push Drizzle schema to database
```

## Architecture

### Monolithic Deployment
Single Express server serves both API and frontend on port 5000. In development, Vite middleware provides HMR. In production, static files are served from `dist/public/`.

### Directory Structure
```
server/           # Express backend
  index.ts        # App setup, logging middleware
  routes.ts       # API endpoints (4 routes)
  supabase.ts     # Supabase client initialization
  vite.ts         # Vite dev server setup
client/src/       # React frontend
  pages/          # Route components (dashboard.tsx, not-found.tsx)
  components/     # UI components (charts, tables, stat cards)
  lib/            # Utilities (queryClient, theme-provider, utils)
  hooks/          # Custom hooks
shared/           # Shared types between frontend/backend
  schema.ts       # TypeScript types, Drizzle schema, Zod validators
```

### Data Flow
- All Supabase queries happen server-side (credentials never exposed to client)
- Express routes fetch from Supabase and return aggregated JSON
- Frontend uses TanStack Query for server state management

### API Routes
- `GET /api/executions` - Execution logs (param: `limit`)
- `GET /api/executions/stats` - Aggregated statistics
- `GET /api/executions/daily` - Daily execution counts (param: `days`)
- `GET /api/executions/workflows` - Per-workflow stats

### Path Aliases
```
@/*       → client/src/*
@shared/* → shared/*
@assets/* → attached_assets/*
```

## Key Patterns

**State Management**: TanStack Query handles all server state. No Redux. Query keys are API endpoints.

**Theme**: Custom light/dark mode via `ThemeProvider` context. Stored in localStorage. Uses Tailwind's class-based dark mode.

**UI Components**: shadcn/ui primitives in `client/src/components/ui/`. Built on Radix UI.

**Type Safety**: Shared types in `shared/schema.ts` used by both frontend and backend.

## Environment Variables

Required in `.env`:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

## Database

Supabase table `n8n_execution_logs` stores workflow execution data. Schema defined in README.md SQL section. Key fields: `execution_id`, `workflow_id`, `workflow_name`, `status`, `duration_ms`, `started_at`, `finished_at`.
