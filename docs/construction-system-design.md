# Construction Project Management System Design

## Architecture
- **Backend:** Express REST API following clean layers: `controllers -> services -> repositories -> prisma`
- **Frontend:** Next.js pages + reusable components + hooks
- **Auth:** JWT and RBAC middleware
- **Data:** PostgreSQL with Prisma schema in `backend/prisma/schema.construction.prisma`

## Workflow states
- `TODO -> IN_PROGRESS -> REVIEW -> COMPLETED`
- `BLOCKED` can interrupt any active task

## Core API Endpoints
- `POST /api/auth/register`, `POST /api/auth/login`
- `GET/POST /api/projects`
- `GET /api/tasks/project/:projectId`
- `POST /api/tasks`
- `PATCH /api/tasks/:taskId/progress`
- `PATCH /api/tasks/:taskId/complete`
- `POST /api/tasks/:taskId/resources`
- `POST /api/tasks/:taskId/assign-user`
- `POST /api/tasks/:taskId/dependencies`
- `POST /api/resources`
- `GET /api/resources/workload`
- `GET /api/reports/dashboard`

## UI Pages
- `/dashboard`
- `/projects`
- `/tasks` (timeline + dependency graph)
- `/resources`
- `/users`
- `/reports`

## Task conversion matrix
| Phase | Business Process | DB Entity | API action | UI page |
|---|---|---|---|---|
| Planning | Creating architectural plans | `Task(phase=PLANNING)` | `POST /api/tasks` | `/tasks` |
| Planning | Submit plans for approval | `Task(phase=PLANNING)` | `PATCH /api/tasks/:id/progress` | `/tasks` |
| Planning | Order materials | `Task + TaskResource` | `POST /api/tasks/:id/resources` | `/resources` |
| Site Works | Erect fencing | `Task(phase=SITE_WORKS)` | `POST /api/tasks` | `/tasks` |
| Site Works | Erect site building | `Task(phase=SITE_WORKS)` | `PATCH /api/tasks/:id/progress` | `/tasks` |
| Site Works | Clear and level site | `Task(phase=SITE_WORKS)` | `PATCH /api/tasks/:id/progress` | `/tasks` |
| Site Works | Prepare drainage infrastructure | `Task(phase=SITE_WORKS)` | `POST /api/tasks/:id/dependencies` | `/tasks` |
| Site Works | Prepare cabling infrastructure | `Task(phase=SITE_WORKS)` | `POST /api/tasks/:id/dependencies` | `/tasks` |
| Building Construction | Pour foundations | `Task(phase=BUILDING_CONSTRUCTION)` | `PATCH /api/tasks/:id/progress` | `/tasks` |
| Building Construction | Erect steelwork | `Task(phase=BUILDING_CONSTRUCTION)` | `POST /api/tasks/:id/assign-user` | `/tasks` |
| Building Construction | Erect wall | `Task(phase=BUILDING_CONSTRUCTION)` | `PATCH /api/tasks/:id/progress` | `/tasks` |
| Building Construction | Install roofing superstructure | `Task(phase=BUILDING_CONSTRUCTION)` | `POST /api/tasks/:id/resources` | `/tasks` |
| Building Construction | Install roofing retracting mechanism | `Task(phase=BUILDING_CONSTRUCTION)` | `POST /api/tasks/:id/resources` | `/tasks` |
| Building Construction | Erect seating tiers | `Task(phase=BUILDING_CONSTRUCTION)` | `PATCH /api/tasks/:id/progress` | `/tasks` |
| Installation | Install electrical systems | `Task(phase=INSTALLATION)` | `POST /api/tasks/:id/assign-user` | `/tasks` |
| Installation | Install plumbing | `Task(phase=INSTALLATION)` | `POST /api/tasks/:id/assign-user` | `/tasks` |
| Installation | Install turf | `Task(phase=INSTALLATION)` | `PATCH /api/tasks/:id/progress` | `/tasks` |
| Installation | Install scoreboards | `Task(phase=INSTALLATION)` | `POST /api/tasks/:id/resources` | `/tasks` |
| Installation | Install sound system | `Task(phase=INSTALLATION)` | `POST /api/tasks/:id/resources` | `/tasks` |
| Installation | Install video system | `Task(phase=INSTALLATION)` | `POST /api/tasks/:id/resources` | `/tasks` |
| Inspection & Completion | Final inspection | `Task(phase=INSPECTION_COMPLETION)` | `PATCH /api/tasks/:id/progress` | `/reports` |
| Inspection & Completion | Project completion | `Task + Milestone` | `PATCH /api/tasks/:id/complete` | `/dashboard` |
