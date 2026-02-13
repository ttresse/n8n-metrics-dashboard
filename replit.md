# n8n Execution Dashboard

## Overview
A real-time workflow monitoring dashboard that displays n8n execution logs from Supabase. Features include:
- Statistics cards showing total executions, success/failure counts
- Area chart showing execution trends over time
- Pie chart showing status distribution
- AG-Grid table with sorting, filtering, and pagination
- Dark/light theme toggle
- Enterprise-style blue theme

## Architecture

### Frontend (Vite + React)
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query (React Query)
- **Charts**: Recharts
- **Data Grid**: AG-Grid Community
- **Styling**: Tailwind CSS + shadcn/ui components
- **Theme**: Custom enterprise blue theme with dark mode support

### Backend (Express)
- **Server**: Express.js with TypeScript
- **Database Client**: Supabase JS client (server-side only)
- All data fetching happens server-side to protect Supabase credentials

### Key Files
- `client/src/pages/dashboard.tsx` - Main dashboard page
- `client/src/components/` - Reusable UI components
- `server/routes.ts` - API endpoints
- `server/supabase.ts` - Supabase client initialization
- `shared/schema.ts` - TypeScript types and interfaces

## API Routes
- `GET /api/executions` - Fetch all execution logs (limit: 100)
- `GET /api/executions/stats` - Get aggregated statistics
- `GET /api/executions/daily` - Get daily execution counts for charts
- `GET /api/executions/workflows` - Get per-workflow statistics

## Required Environment Variables
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous/public API key

## Supabase Table Schema
The dashboard expects a `n8n_execution_logs` table with the following structure:
- `id` - UUID primary key
- `execution_id` - Text, unique
- `workflow_id` - Text
- `workflow_name` - Text
- `status` - Text (success, error, running, waiting, canceled)
- `finished` - Boolean
- `started_at` - Timestamp
- `finished_at` - Timestamp
- `duration_ms` - Integer
- `mode` - Text
- `node_count` - Integer
- `error_message` - Text
- `execution_data` - JSONB
- `workflow_data` - JSONB
- `created_at` - Timestamp

## Running the Project
The application runs on port 5000 using the `npm run dev` command.

## Recent Changes
- Initial dashboard implementation with Supabase integration
- Added enterprise blue theme with dark mode
- Implemented stat cards, area chart, pie chart, and AG-Grid table
- All API calls happen server-side to protect Supabase credentials
