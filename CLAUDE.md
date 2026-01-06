# CLAUDE.md - DoAi.Me Project Guide

## Project Overview

**DoAi.Me** is an autonomous AI agent network operating on 600 physical Android devices (Galaxy S9).
Each agent has a unique persona, interacts with YouTube content, and accumulates emotions and memories.

- Language: Korean (한국어) documentation, English code comments preferred
- Team: Orion (Orchestrator), Aria (Architect), Axon (Developer), Logos (Archivist)

## Tech Stack

### Gateway (Node.js)
- **Location**: `/gateway`
- **Port**: 3100
- **Stack**: Express, @devicefarmer/adbkit, WebSocket, Supabase JS
- **Purpose**: Manages 600 Android device connections via ADB

### Backend API (Python)
- **Location**: `/backend/api`
- **Port**: 8000
- **Stack**: FastAPI, Pydantic, Uvicorn
- **Purpose**: Complex calculations (corruption, decision-making)

### Dashboard (Next.js)
- **Location**: `/dashboard`
- **Stack**: Next.js 16, React 19, TypeScript, TailwindCSS 4, Radix UI, Recharts
- **Purpose**: Device management UI, monitoring, statistics

### Database
- **Supabase** (cloud PostgreSQL)
- Environment vars: `DOAI_ME_SUPABASE_URL`, `DOAI_ME_SUPABASE_KEY`

### Orchestration
- **n8n** on port 5678
- Handles workflow automation and scheduling

### Mobile Scripts (AutoX.js)
- **Location**: `/autox-scripts`, `/client-android`
- JavaScript automation scripts for Android devices

### Microservices
Located in `/services/`:
- `api-gateway` (8000) - Auth, routing, rate limiting
- `video-service` (8001) - Video CRUD
- `device-service` (8002) - Device registration/health
- `task-service` (8003) - Task scheduling
- `human-pattern-service` (8004) - Human behavior patterns
- `result-service` (8005) - Result aggregation
- `persona-service` (8006) - Persona CRUD, existence state, attention economy

## Common Commands

```bash
# Gateway
cd gateway && npm run dev          # Development
cd gateway && npm run dev:all      # Gateway + Dashboard client

# Dashboard
cd dashboard && npm run dev        # Next.js dev server
cd dashboard && npm run build      # Production build

# Backend API
cd backend/api && uvicorn main:app --reload --port 8000

# Docker (full stack)
docker-compose up -d               # Start all services
docker-compose logs -f doai-gateway

# Deploy to devices
adb push client-android/*.js /sdcard/Scripts/DoAiMe/
```

## Directory Structure

```
doai-me/
├── gateway/           # Node.js ADB gateway (port 3100)
├── backend/           # Python FastAPI services
│   ├── api/           # Main API
│   └── n8n/           # n8n workflows
├── dashboard/         # Next.js frontend
├── services/          # Python microservices
├── autox-scripts/     # Android automation (AutoX.js)
├── client-android/    # Device client scripts
├── shared/            # Shared schemas (Pydantic)
├── supabase/          # Database migrations
├── workers/           # PC worker agents
├── scripts/           # Utility scripts
└── docs/              # Documentation
```

## Environment Variables

Copy `.env.example` to `.env` and configure:
- `DOAI_ME_SUPABASE_URL` - Supabase project URL
- `DOAI_ME_SUPABASE_KEY` - Supabase anon key
- `DOAI_ME_OPENAI_API_KEY` - OpenAI API key (for decision-making)
- `N8N_USER`, `N8N_PASSWORD` - n8n credentials

## Key Concepts

- **Persona**: Unique AI identity with traits, emotions, memory
- **Task**: Single video interaction job assigned to a device
- **Human Pattern**: Randomized behavior to mimic human usage
- **Corruption (타락도)**: Metric for persona state decay
- **Maintenance Cost (유지비)**: Daily operational cost per persona

## Architecture Pattern

```
Browser → Dashboard (Next.js)
                ↓
         API Gateway (FastAPI :8000)
                ↓
    ┌─────┬─────┴─────┬─────┐
    ↓     ↓           ↓     ↓
Services (8001-8005)  n8n (5678)
                ↓
         Gateway (Node.js :3100)
                ↓
    Android Devices (600x Galaxy S9)
                ↓
         AutoX.js Scripts
```

## Code Style

- Python: FastAPI with Pydantic models, type hints required
- TypeScript: Strict mode, functional components in React
- Node.js: ES modules, async/await patterns
- All services communicate via REST + Redis Pub/Sub
