# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Daily Operating System (Daily-OS) is a personal productivity dashboard with a Kanban task board, calendar, AI chat, daily briefing, and AI learning module. Built with Express.js v5 backend and vanilla JavaScript frontend, deployed as a Vercel serverless function. Data lives in Notion; AI features use Google Gemini (chat, briefing, learning) and OpenAI Whisper (transcription).

## Build and Development Commands

```bash
# Build the entire workspace (runs api-server + scripts)
pnpm run build

# Build only the api-server
cd artifacts/api-server && pnpm run build

# Run locally (after build)
cd artifacts/api-server && node dist/index.js

# Type-check all workspaces
pnpm typecheck

# Dev server (ts-node / watch mode)
pnpm --filter @workspace/api-server run dev
```

The build (`build.mjs`) uses esbuild to bundle TypeScript → CommonJS, externalises native/cloud packages, runs pino's transport plugin, and copies `public/` → `dist/public/` for static file serving.

## Architecture

### Entry Points

| File | Purpose |
|------|---------|
| `artifacts/api-server/src/index.ts` | Server entry: exports app for Vercel, starts local listener (non-production only), registers 5:30 AM UK cron for daily learning lesson |
| `artifacts/api-server/src/app.ts` | Express app factory: middleware, static files, API routes, root `GET /` handler |
| `api/index.js` | **Vercel serverless handler** — requires the compiled app from `artifacts/api-server/dist/index.js` and re-exports it |

### API Routes (`artifacts/api-server/src/routes/`)

All routes mounted at `/api` prefix in `app.ts`:

| File | Endpoints |
|------|-----------|
| `health.ts` | `GET /api/healthz` |
| `tasks.ts` | `GET /api/tasks`, `POST /api/tasks`, `PATCH /api/tasks/:taskId`, `DELETE /api/tasks/:taskId`, `GET /api/tasks/projects` (legacy — prefer `/api/projects`) |
| `projects.ts` | `GET /api/projects` |
| `calendar.ts` | `GET /api/calendar` — today/tomorrow events via Outlook |
| `briefing.ts` | `GET /api/briefing`, `POST /api/briefing` — AI-generated news (Gemini) |
| `chat.ts` | `POST /api/chat` — natural language task/schedule commands (Gemini, multi-turn) |
| `transcribe.ts` | `POST /api/transcribe` — Whisper audio transcription (multipart, `audio` field) |
| `learning.ts` | `GET /api/learning/concept`, `GET /api/learning/recap`, `POST /api/learning/answer` |

### Notion Schema

Tasks DB fields: `Name` (title), `Due Date` (date), `Priority` (select: Urgent/High/Medium/Low), `Status` (status: Not started/In progress/In Review/Done), `Notes` (rich_text), `Owner` (people), `Related Project` (relation).

Task categorisation logic:
- **Overdue**: `due_date < today`
- **Due Soon**: `due_date` within next 7 days
- **In Progress**: status = "In progress" with no imminent due date
- **Completed**: status = Done/Complete

### Chat Multi-Turn Protocol

`chat.ts` supports a pending-task continuation flow:
- If fields are missing, response returns `action_taken: "task_pending"` with `missing_fields` list
- Continuation turns prefix the body with `__PENDING_TASK__|{json}|user_reply:text`
- "none"/"n/a"/"skip" values are treated as field-skip signals

### Frontend (`artifacts/api-server/public/`)

Single-page vanilla JS app. Tabs: Dashboard, Tasks (Kanban), Projects, Calendar, Chat, Learning. Static assets served by `express.static()` from `dist/public/` in the built output.

## Vercel Deployment Structure

```
/                           ← project root deployed to Vercel
├── api/index.js            ← Vercel auto-detects as a serverless function handler
├── artifacts/api-server/
│   └── dist/               ← built by pnpm run build during Vercel's build step
│       ├── index.js        ← compiled Express app (exported as .default)
│       └── public/         ← static frontend assets
└── vercel.json             ← { "buildCommand": "pnpm run build" }
```

**Handler pattern** (`api/index.js`):
```js
const app = require('../artifacts/api-server/dist/index.js').default;
module.exports = app;
```

The handler must use a path relative to `__dirname` (the `/api` directory on the deployed container). `process.cwd()` is unreliable in Vercel's serverless environment.

### Path Resolution in `app.ts`

```typescript
const publicPath = path.join(__dirname || process.cwd(), "public");
```
After esbuild, `dist/index.js` sits alongside `dist/public/`, so `__dirname` correctly resolves to `dist/`.

### Express v5 Routing Constraints

Express v5's path-to-regexp parser **rejects** wildcard patterns like `app.get("*")` or `app.get(/.*/)`. The app avoids these entirely — no SPA catch-all middleware.

## Environment Variables

Required in Vercel dashboard (not committed):

| Variable | Used by |
|----------|---------|
| `NOTION_API_KEY` | All Notion routes (tasks, projects, learning) |
| `TASKS_PAGE_ID` | `tasks.ts` — Notion tasks DB ID |
| `PROJECTS_PAGE_ID` | `tasks.ts`, `projects.ts` — Notion projects DB ID |
| `GOOGLE_API_KEY` | `chat.ts`, `briefing.ts`, `learning.ts` (Gemini) |
| `OPENAI_API_KEY` | `transcribe.ts` (Whisper) |

## Known Deployment Issues

### FUNCTION_INVOCATION_FAILED

Appears when the serverless function crashes before handling a request. Root causes seen in this project:

1. **Path resolution failure** — `api/index.js` cannot `require()` the compiled app. Always use `__dirname`-relative paths.
2. **Module crash on load** — compiled app throws during module init (missing env var, Express v5 route parse error).
3. **Wrong `vercel.json` schema** — the `public` key expects a boolean, not a path string.
4. **Incorrect `outputDirectory`** — setting it to `artifacts/api-server/dist` causes Vercel to look for an entrypoint there instead of using `api/index.js`.

**Debugging steps:**
1. Check runtime logs: Vercel dashboard → Deployment → Logs.
2. If no runtime logs appear, the crash is at module load time.
3. Test locally: `node -e "require('./api/index.js')"` — should print no errors.
4. Test compiled app: `node dist/index.js` from `artifacts/api-server/`.

## Workspace Layout

```
artifacts/
  api-server/     ← main application (TypeScript, Express v5)
    src/
      app.ts
      index.ts
      routes/
      lib/          ← logger.ts, outlookCalendar.ts
    public/       ← frontend (HTML/CSS/JS)
    build.mjs     ← esbuild config
    dist/         ← build output (gitignored)
  daily-os/       ← excluded from Vercel via .vercelignore
  mockup-sandbox/ ← excluded from Vercel via .vercelignore
api/
  index.js        ← Vercel serverless handler
vercel.json
.vercelignore
```
