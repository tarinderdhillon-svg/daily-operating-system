# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: OpenAI via Replit AI Integrations (gpt-5-nano for chat/briefing)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Daily Operating System App

### Features
- **Task Management**: Full CRUD via Notion API (database ID: 3356990a287981128f2ffe49ada5e44f)
- **Calendar View**: Today/tomorrow schedule (currently mock data, ready for Outlook integration)
- **AI Chat**: Natural language task management, schedule queries, priority analysis
- **Daily Briefing**: AI-generated tech & business news (6 articles per category)

### Artifacts
- `artifacts/daily-os` — React + Vite frontend (preview path: `/`)
- `artifacts/api-server` — Express backend (preview path: `/api`)

### Backend Routes
- `GET /api/tasks` — all tasks categorized (overdue, outstanding, inProgress, todo) + completed list
- `POST /api/tasks` — create task in Notion (fields: title, due_date, priority, status, notes)
- `PATCH /api/tasks/:id` — update task
- `DELETE /api/tasks/:id` — delete (archive) task
- `GET /api/calendar` — today/tomorrow events
- `GET /api/briefing` — get cached briefing
- `POST /api/briefing` — generate new AI briefing
- `POST /api/chat` — process natural language commands (multi-turn pending task flow)
- `POST /api/transcribe` — Whisper audio transcription (multipart/form-data, `audio` field)

### Notion Schema Fields
- Name (title), Due Date (date), Priority (select: Urgent/High/Medium/Low), Status (status: Not started/In progress/In Review/Done), Notes (rich_text), Owner (people), Related Project (relation)

### Task Categorisation Logic
- **Overdue**: due_date < today
- **Due Soon**: due_date within next 7 days
- **In Progress**: status = "In progress" AND no imminent due date
- **Not Started**: everything else active
- **Completed**: status = Done/Complete

### Chat Flow
- Supports free-text commands for tasks (create, update, query)
- Multi-turn: if fields missing, returns `action_taken: "task_pending"` with missing_fields list
- `__PENDING_TASK__|{json}|user_reply:text` protocol for continuation turns
- "none"/"n/a"/"skip" answers treated as field-skip signals

### External Integrations
- Notion API key stored in code (ntn_2833...)
- OpenAI via Replit AI Integrations (env: AI_INTEGRATIONS_OPENAI_BASE_URL, AI_INTEGRATIONS_OPENAI_API_KEY)
