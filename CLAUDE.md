# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SchoolPick is a teacher-facing web application for Korean schools. It's a monorepo with an npm workspace structure containing a Next.js frontend and FastAPI backend.

## Commands

### Development
```bash
# Frontend (Next.js with Turbopack)
npm run dev                    # Start frontend dev server (localhost:3000)
npm run dev:frontend           # Same as above

# Backend (FastAPI with Uvicorn)
npm run dev:backend            # Start backend dev server (localhost:8000)
# Or directly:
cd backend-teacher && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Build & Production
```bash
npm run build                  # Build frontend (static export to out/)
npm run start                  # Serve built frontend
npm run preview                # Build then serve
```

### Linting & Testing
```bash
# Frontend
cd frontend-teacher && npm run lint

# Backend
cd backend-teacher
pytest                         # Run tests
flake8 app/                    # Lint Python code
black app/                     # Format Python code
```

### Database (Backend)
```bash
cd backend-teacher
alembic upgrade head           # Run migrations
alembic revision --autogenerate -m "message"  # Create new migration
```

## Architecture

### Monorepo Structure
- `frontend-teacher/` - Next.js 15 app (React 19, Tailwind CSS 4)
- `backend-teacher/` - FastAPI app (Python, SQLAlchemy, PostgreSQL)
- `packages/shared-types/` - Shared TypeScript types
- `packages/shared-utils/` - Shared utilities

### Frontend (Next.js App Router)
- Uses static export (`output: 'export'` in next.config.ts)
- Path aliases: `@/*` maps to `./src/*`
- Key routes: `/login`, `/dashboard`, `/attendance`, `/sae-teuk` (세특), `/night-study`, `/content-filter`
- Components organized in `src/components/` with subdirectories: `ui/`, `layout/`, `auth/`, `content-filter/`

### Backend (FastAPI)
- Entry point: `app/main.py`
- Structure follows clean architecture:
  - `api/` - Route handlers
  - `models/` - SQLAlchemy ORM models
  - `schemas/` - Pydantic request/response schemas
  - `services/` - Business logic
  - `core/` - Security (JWT), dependencies, exceptions
- API docs available at `/docs` (Swagger UI) when dev server is running
- Uses OpenAI API for content filtering (세특 검열)
- Uses kiwipiepy for Korean morphological analysis

### Key Features
- Teacher authentication (JWT-based)
- Student management
- Attendance tracking (including QR code-based)
- Night study (야자) management with APScheduler
- Content filtering for 세특 (student evaluation records)

## Path Aliases (Frontend)
```typescript
"@/*": ["./src/*"]
"@shared-types/*": ["../packages/shared-types/src/*"]
"@shared-utils/*": ["../packages/shared-utils/src/*"]
```

## Environment
- Backend requires `.env` file (see `backend-teacher/env.example`)
- OpenAI API key managed via AWS Secrets Manager
- PostgreSQL database required for backend
